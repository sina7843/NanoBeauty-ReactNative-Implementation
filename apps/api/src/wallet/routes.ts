import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  attemptConfirmSchema,
  attemptCreateSchema,
  balanceHelpSchema,
  giftActionSchema,
  giftCodeSchema,
  giftSendTimeSchema,
  maskPhone,
  normalizePhone,
  orderCreateSchema,
  staffAdjustSchema,
  staffRedeemSchema,
  staffRefundSchema,
  webGiftClaimConfirmSchema,
  webGiftClaimStartSchema,
  type Attempt,
  type GiftLookup,
  type HistoryItem,
  type Instrument,
  type LedgerLine,
  type MethodOption,
  type Order,
  type Package,
  type PaymentMethod,
  type Receipt,
  type StaffGift,
} from '@nano/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthKit } from '../auth/routes';
import { authenticate, type AuthContext } from '../auth/session';
import type { Db, Queryable } from '../db';
import { HttpError } from '../errors';
import type { Integrations, PaymentMethodId, ProviderPayment } from '../integrations';
import { formatWhen } from '../notifications/templates';
import { clinicTz, notify } from '../visits/routes';

const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 3600_000;
/** An attempt nobody finished (card form or hosted page left open) is cancelled after this. */
const ABANDON_MS = 2 * 3600_000;
/** GST included in prices (Sample: the clinic's accountant confirms tax lines, PAY-09). */
const GST_RATE = 0.05;
/** WEB-01 link; the host is not decided yet (open item), so this is the proposed one. */
const GIFT_LINK_BASE = 'https://app.nanobeautystar.com/gift/';
const GIFT_TERMS = ['No expiry.', 'Use it for any treatment at Nano Beauty.', 'It can’t be exchanged for cash.'];
const CREDIT_TERMS = ['Clinic credit can be used for treatments at Nano Beauty.', 'It isn’t cash and can’t be withdrawn.'];
/** Unambiguous characters for gift codes (no 0/O, 1/I/L). 12 characters ≈ 60 bits. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const METHOD_NAMES: Record<PaymentMethod, string> = { card: 'Card', apple_pay: 'Apple Pay', google_pay: 'Google Pay', klarna: 'Klarna', affirm: 'Affirm' };
const SETTING_KEY: Record<PaymentMethod, 'card' | 'applePay' | 'googlePay' | 'klarna' | 'affirm'> = {
  card: 'card',
  apple_pay: 'applePay',
  google_pay: 'googlePay',
  klarna: 'klarna',
  affirm: 'affirm',
};

const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const ref = (prefix: string) => `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
const hashCode = (code: string) => createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
const newGiftCode = () => Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
export const taxIncluded = (totalCents: number) => Math.round((totalCents * GST_RATE) / (1 + GST_RATE));

type OrderRow = {
  id: string;
  reference: string;
  customer_id: string;
  kind: 'package' | 'gift';
  package_id: string | null;
  gift: { design: string; amountCents: number; recipientName: string; recipientPhone: string; message: string | null; sendAt: string | null } | null;
  amount_cents: number;
  status: Order['status'];
  paid_attempt_id: string | null;
  created_at: Date;
  paid_at: Date | null;
};
type AttemptRow = {
  id: string;
  reference: string;
  order_id: string;
  method: PaymentMethod;
  provider_ref: string;
  status: Attempt['status'];
  redirect_url: string | null;
  failure_reason: Attempt['failureReason'];
  card_brand: string | null;
  card_last4: string | null;
  amount_cents: number;
  created_at: Date;
};
type InstrumentRow = {
  id: string;
  customer_id: string | null;
  kind: Instrument['kind'];
  label: string;
  source: Instrument['source'];
  status: 'active' | 'reconciling' | 'voided';
  package_id: string | null;
  expires_at: Date | null;
  order_id: string | null;
  code_last4: string | null;
  buyer_id: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  message: string | null;
  design: string | null;
  send_at: Date | null;
  sent_at: Date | null;
  delivery: 'scheduled' | 'sent' | 'failed' | 'cancelled' | null;
  claimed_at: Date | null;
  /** Package instruments: the treatment it is for (BOOK 14 next booking action). */
  service_id?: string | null;
};
type Sums = { amount: number; sessions: number; bought: number; used: number; refunded: number };

const methodLabel = (a: Pick<AttemptRow, 'method' | 'card_brand' | 'card_last4'>) =>
  a.card_last4 ? `${a.card_brand ?? 'Card'} •••• ${a.card_last4}` : a.method === 'card' ? null : METHOD_NAMES[a.method];

const toAttempt = (a: AttemptRow): Attempt => ({
  id: a.id,
  reference: a.reference,
  orderId: a.order_id,
  method: a.method,
  status: a.status,
  redirectUrl: a.status === 'requires_action' ? a.redirect_url : null,
  methodLabel: methodLabel(a),
  failureReason: a.failure_reason,
});

const orderTitle = (o: OrderRow, packageName: string | null) => (o.kind === 'package' ? (packageName ?? 'Package') : `Gift card for ${o.gift!.recipientName}`);

/** Ledger sums per instrument. The ONLY source of balances (WALT 11). */
export async function ledgerSums(db: Queryable, ids: string[]): Promise<Map<string, Sums>> {
  if (!ids.length) return new Map();
  const rows = await db.query<{ instrument_id: string; amount: string | null; sessions: string | null; bought: string | null; used: string | null; refunded: string | null }>(
    `SELECT instrument_id, SUM(amount_cents)::text AS amount, SUM(sessions)::text AS sessions,
            SUM(CASE WHEN kind IN ('purchase', 'import', 'issue') AND sessions > 0 THEN sessions ELSE 0 END)::text AS bought,
            SUM(CASE WHEN kind = 'redeem' THEN -sessions ELSE 0 END)::text AS used,
            SUM(CASE WHEN kind IN ('refund', 'reverse') THEN COALESCE(sessions, 0) ELSE 0 END)::text AS refunded
       FROM ledger_entries WHERE instrument_id = ANY($1) GROUP BY instrument_id`,
    [ids],
  );
  return new Map(rows.map((r) => [r.instrument_id, { amount: Number(r.amount ?? 0), sessions: Number(r.sessions ?? 0), bought: Number(r.bought ?? 0), used: Number(r.used ?? 0), refunded: Number(r.refunded ?? 0) }]));
}

export function toInstrument(row: InstrumentRow, sums: Sums | undefined, viewerId: string | null, now: number): Instrument {
  const s = sums ?? { amount: 0, sessions: 0, bought: 0, used: 0, refunded: 0 };
  const expired = !!row.expires_at && row.expires_at.getTime() <= now;
  const reconciling = row.status === 'reconciling';
  const usedUp = row.kind === 'package' ? s.sessions <= 0 : false;
  const sender = !(viewerId && row.customer_id === viewerId);
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    source: row.source,
    status: row.status === 'voided' ? 'voided' : reconciling ? 'reconciling' : expired || usedUp ? 'ended' : 'active',
    // Values stay hidden until the ledger is confirmed (WAL-01 reconciling); a sender never sees how a claimed gift is spent.
    balanceCents: reconciling || row.kind === 'package' || row.kind === 'membership' || (sender && !!row.claimed_at) ? null : s.amount,
    sessions: row.kind === 'package' && !reconciling ? { total: s.bought + s.refunded, used: s.used, remaining: Math.max(0, s.sessions) } : null,
    expiresAt: row.expires_at?.toISOString() ?? null,
    serviceId: row.service_id ?? null,
    last4: row.code_last4,
    role: sender ? 'sender' : 'owner',
    gift:
      row.kind === 'gift_card' && row.recipient_name
        ? {
            recipientName: row.recipient_name,
            recipientPhoneMasked: row.recipient_phone ? maskPhone(row.recipient_phone) : '',
            message: row.message,
            design: row.design ?? '',
            delivery: row.delivery ?? 'scheduled',
            sendAt: row.send_at?.toISOString() ?? null,
            sentAt: row.sent_at?.toISOString() ?? null,
            claimedAt: row.claimed_at?.toISOString() ?? null,
            orderId: sender ? row.order_id : null,
          }
        : null,
  };
}

/** Everything in a customer's Wallet, plus gifts they sent that someone else holds. */
export async function walletFor(db: Queryable, customerId: string, now: number): Promise<Instrument[]> {
  const rows = await db.query<InstrumentRow>(
    `SELECT *, (SELECT service_id FROM packages p WHERE p.id = wallet_instruments.package_id) AS service_id FROM wallet_instruments WHERE (customer_id = $1 AND status <> 'voided') OR buyer_id = $1 ORDER BY created_at DESC`,
    [customerId],
  );
  const sums = await ledgerSums(db, rows.map((r) => r.id));
  return rows.map((r) => toInstrument(r, sums.get(r.id), customerId, now));
}

/** Settings slice used here. */
async function settingsOf(db: Queryable) {
  const [s] = await db.query<{
    settings: { paymentMethods: Record<string, boolean>; gift: { presetsCAD: number[]; customRangeCAD: [number, number]; designs: string[] } };
    features: { legacyMembership: boolean };
  }>('SELECT settings, features FROM app_settings WHERE id = 1');
  return s!;
}

export function registerWalletRoutes(app: FastifyInstance, { now, kit }: { now: () => number; kit: AuthKit }) {
  const { db, integrations } = app;
  const pay = integrations.payments;
  const auth = (request: FastifyRequest) => request.auth as AuthContext;
  const signedIn = { preHandler: kit.requireAuth };
  const throttled = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };
  const staffOnly =
    (...allowed: AuthContext['permissions']) =>
    async (request: FastifyRequest) => {
      request.auth = await authenticate(db, request.headers.authorization, now());
      if (!allowed.some((p) => request.auth!.permissions.includes(p))) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: allowed[0] });
    };
  const audit = (tx: Queryable, request: FastifyRequest, item: string, field: string, oldValue: string | null, newValue: string, reason: string) => {
    const ctx = auth(request);
    return tx.query(
      `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ctx.customerId, ctx.roles.join(','), item, field, oldValue, newValue, reason, String(request.headers['user-agent'] ?? ''), iso(now())],
    );
  };

  async function toOrder(o: OrderRow): Promise<Order> {
    const [p] = o.package_id ? await db.query<{ name: string }>('SELECT name FROM packages WHERE id = $1', [o.package_id]) : [];
    return {
      id: o.id,
      reference: o.reference,
      kind: o.kind,
      title: orderTitle(o, p?.name ?? null),
      detail: o.kind === 'gift' ? (o.gift!.sendAt ? 'Sends at the chosen time, by text' : 'Sends now, by text') : null,
      amountCents: o.amount_cents,
      status: o.status,
      createdAt: o.created_at.toISOString(),
    };
  }
  async function itemName(tx: Queryable, o: OrderRow): Promise<string> {
    const [p] = o.package_id ? await tx.query<{ name: string }>('SELECT name FROM packages WHERE id = $1', [o.package_id]) : [];
    return orderTitle(o, p?.name ?? null);
  }
  async function ownOrder(customerId: string, id: string): Promise<OrderRow> {
    const [o] = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1 AND customer_id = $2', [id, customerId]);
    if (!o) throw new HttpError(404, 'not_found', 'Order not found.');
    return o;
  }
  async function ownAttempt(customerId: string, id: string): Promise<AttemptRow> {
    const [a] = await db.query<AttemptRow>(
      'SELECT a.* FROM payment_attempts a JOIN orders o ON o.id = a.order_id WHERE a.id = $1 AND o.customer_id = $2',
      [id, customerId],
    );
    if (!a) throw new HttpError(404, 'not_found', 'Payment not found.');
    return a;
  }

  // ---------- Fulfilment and settlement ----------

  /** Creates the wallet value for a paid order, exactly once (unique order_id + ledger idempotency key). */
  async function fulfil(tx: Queryable, o: OrderRow, t: number): Promise<{ deliverGift: string | null }> {
    if (o.kind === 'package') {
      const [p] = await tx.query<{ name: string; sessions: number; validity_months: number | null }>('SELECT name, sessions, validity_months FROM packages WHERE id = $1', [o.package_id]);
      const expires = p!.validity_months ? new Date(t) : null;
      expires?.setMonth(expires.getMonth() + p!.validity_months!);
      const [i] = await tx.query<{ id: string }>(
        `INSERT INTO wallet_instruments (customer_id, kind, label, source, status, package_id, expires_at, order_id, created_at)
         VALUES ($1, 'package', $2, 'purchase', 'active', $3, $4, $5, $6) ON CONFLICT (order_id) DO NOTHING RETURNING id`,
        [o.customer_id, p!.name, o.package_id, expires?.toISOString() ?? null, o.id, iso(t)],
      );
      if (i) await ledger(tx, i.id, 'purchase', { sessions: p!.sessions }, 'Package bought', o.reference, o.id, null, `order:${o.id}`, t);
      return { deliverGift: null };
    }
    const g = o.gift!;
    const sendAt = g.sendAt && Date.parse(g.sendAt) > t ? g.sendAt : iso(t);
    const [i] = await tx.query<{ id: string }>(
      `INSERT INTO wallet_instruments (customer_id, kind, label, source, status, order_id, buyer_id, recipient_name, recipient_phone, message, design, send_at, delivery, created_at)
       VALUES (NULL, 'gift_card', 'Gift card', 'gift', 'active', $1, $2, $3, $4, $5, $6, $7, 'scheduled', $8) ON CONFLICT (order_id) DO NOTHING RETURNING id`,
      [o.id, o.customer_id, g.recipientName, g.recipientPhone, g.message, g.design, sendAt, iso(t)],
    );
    if (!i) return { deliverGift: null };
    await ledger(tx, i.id, 'purchase', { amount: g.amountCents }, 'Gift card bought', o.reference, o.id, null, `order:${o.id}`, t);
    // Only a gift waiting for its time gets the "scheduled" notice; a send-now gift gets just the sent one (WP-4).
    if (Date.parse(sendAt) > t) await notify(tx, { audience: 'customer', customerId: o.customer_id, template: 'gift_scheduled', data: { name: g.recipientName, sendAt, when: formatWhen(new Date(sendAt), await clinicTz(tx)), instrumentId: i.id }, now: t });
    return { deliverGift: Date.parse(sendAt) <= t ? i.id : null };
  }

  /**
   * The single path from a provider answer to our records (PAY 06). Idempotent: a repeated or late answer for an
   * attempt already settled changes nothing; a second success on an already-paid order is refunded, never kept.
   */
  async function settle(attemptId: string, result: ProviderPayment): Promise<AttemptRow> {
    const t = now();
    const effects = await db.transaction(async (tx) => {
      const [a] = await tx.query<AttemptRow>('SELECT * FROM payment_attempts WHERE id = $1 FOR UPDATE', [attemptId]);
      const [o] = await tx.query<OrderRow>('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [a!.order_id]);
      const out = { attempt: a!, deliverGift: null as string | null, duplicate: false };
      if (a!.status === 'succeeded' || a!.status === result.status) return out;
      // Money taken after we stopped waiting still counts; anything else on a closed attempt is ignored.
      const closed = a!.status === 'declined' || a!.status === 'cancelled';
      if (closed && result.status !== 'succeeded') return out;
      const [updated] = await tx.query<AttemptRow>(
        `UPDATE payment_attempts SET status = $2, failure_reason = $3, card_brand = COALESCE($4, card_brand), card_last4 = COALESCE($5, card_last4), updated_at = $6
          WHERE id = $1 RETURNING *`,
        [attemptId, result.status, result.status === 'succeeded' ? null : (result.failureReason ?? null), result.card?.brand ?? null, result.card?.last4 ?? null, iso(t)],
      );
      out.attempt = updated!;
      if (result.status !== 'succeeded') return out;
      if (o!.status !== 'pending') {
        out.duplicate = true; // already paid by another attempt: this charge goes back
        return out;
      }
      await tx.query(`UPDATE orders SET status = 'paid', paid_attempt_id = $2, paid_at = $3 WHERE id = $1`, [o!.id, attemptId, iso(t)]);
      out.deliverGift = (await fulfil(tx, o!, t)).deliverGift;
      await notify(tx, { audience: 'customer', customerId: o!.customer_id, template: 'payment_receipt', data: { orderId: o!.id, reference: updated!.reference, amount: money(o!.amount_cents), item: await itemName(tx, o!) }, now: t });
      return out;
    });
    // After the commit: the payment is recorded whatever happens next, so these never turn a paid order into an error.
    if (effects.duplicate) {
      const back = await refund(effects.attempt.id, effects.attempt.amount_cents, 'Duplicate payment, returned automatically', null, `dup:${attemptId}`, false).catch(() => null);
      if (!back || back.status !== 'succeeded') {
        // The pending-refund job retries; staff are told so a person checks it.
        await notify(db, { audience: 'staff', permission: 'payments.refund', template: 'duplicate_refund_needs_attention', data: { attempt: effects.attempt.reference }, now: now() });
      }
    }
    if (effects.deliverGift) await deliverGift(effects.deliverGift).catch((err: unknown) => app.log.error({ err, instrumentId: effects.deliverGift }, 'gift send failed; the job retries'));
    return effects.attempt;
  }

  /** Asks the provider for the authoritative state of an open attempt and records it. */
  async function reconcile(a: AttemptRow): Promise<AttemptRow> {
    if (a.status !== 'requires_action' && a.status !== 'processing') return a;
    return settle(a.id, await pay.getStatus(a.provider_ref));
  }

  // ---------- Refunds (PAY 09) ----------

  /**
   * Refund part or all of a payment. With `hold`, the matching unused value leaves the wallet first (ledger
   * 'refund'), so refunded value can't also be spent; a failed refund puts it back with a 'reverse' entry.
   */
  async function refund(attemptId: string, amountCents: number, reason: string, actorId: string | null, key: string, hold: boolean) {
    const t = now();
    const prepared = await db.transaction(async (tx) => {
      const [existing] = await tx.query<{ id: string; reference: string; status: string }>('SELECT id, reference, status FROM refunds WHERE idempotency_key = $1', [key]);
      if (existing) return { existing };
      const [a] = await tx.query<AttemptRow>('SELECT * FROM payment_attempts WHERE id = $1 FOR UPDATE', [attemptId]);
      if (!a || a.status !== 'succeeded') throw new HttpError(409, 'conflict', 'Only a completed payment can be refunded.');
      // Wallet value belongs to the payment that paid the order; a stray duplicate charge holds nothing.
      const [paid] = await tx.query<{ paid_attempt_id: string | null; amount_cents: number }>('SELECT paid_attempt_id, amount_cents FROM orders WHERE id = $1', [a.order_id]);
      hold = hold && paid!.paid_attempt_id === a.id;
      const [{ total }] = (await tx.query<{ total: string | null }>(`SELECT SUM(amount_cents)::text AS total FROM refunds WHERE attempt_id = $1 AND status <> 'failed'`, [attemptId])) as [
        { total: string | null },
      ];
      if (Number(total ?? 0) + amountCents > a.amount_cents) throw new HttpError(409, 'conflict', 'That is more than is left to refund.');
      const reference = ref('RF');
      const [r] = await tx.query<{ id: string }>(
        `INSERT INTO refunds (reference, attempt_id, amount_cents, status, reason, requested_by, idempotency_key, created_at, updated_at)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $7) RETURNING id`,
        [reference, attemptId, amountCents, reason, actorId, key, iso(t)],
      );
      if (hold) {
        const [i] = await tx.query<InstrumentRow>('SELECT * FROM wallet_instruments WHERE order_id = $1 FOR UPDATE', [a.order_id]);
        const sums = (await ledgerSums(tx, [i!.id])).get(i!.id)!;
        if (i!.kind === 'package') {
          // Whole sessions at the price actually paid (not today's catalogue price).
          const sessions = (amountCents * sums.bought) / paid!.amount_cents;
          if (!Number.isInteger(sessions)) throw new HttpError(409, 'conflict', `Refund whole sessions (${(paid!.amount_cents / sums.bought / 100).toFixed(2)} each).`);
          if (sessions > sums.sessions) throw new HttpError(409, 'conflict', 'Used sessions can’t be refunded.');
          await ledger(tx, i!.id, 'refund', { sessions: -sessions }, 'Refunded', reference, a.order_id, actorId, `refund:${r!.id}`, t);
        } else {
          if (amountCents > sums.amount) throw new HttpError(409, 'conflict', 'Spent gift-card value can’t be refunded.');
          await ledger(tx, i!.id, 'refund', { amount: -amountCents }, 'Refunded', reference, a.order_id, actorId, `refund:${r!.id}`, t);
        }
      }
      return { id: r!.id, reference, providerRef: a.provider_ref };
    });
    if ('existing' in prepared) {
      // A retry of a refund the provider never answered asks it again (same provider idempotency key).
      if (prepared.existing!.status === 'pending') await retryRefund(prepared.existing!.id);
      const [again] = await db.query<{ id: string; reference: string; status: string }>('SELECT id, reference, status FROM refunds WHERE id = $1', [prepared.existing!.id]);
      return again!;
    }
    await retryRefund(prepared.id);
    const [r] = await db.query<{ id: string; reference: string; status: string }>('SELECT id, reference, status FROM refunds WHERE id = $1', [prepared.id]);
    return r!;
  }

  /** Sends a pending refund to the provider (or asks it how it went). Safe to repeat; the pending-refund job uses it. */
  async function retryRefund(refundId: string) {
    const [r] = await db.query<{ id: string; status: string; provider_ref: string | null; amount_cents: number; idempotency_key: string; attempt_ref: string }>(
      `SELECT r.id, r.status, r.provider_ref, r.amount_cents, r.idempotency_key, a.provider_ref AS attempt_ref FROM refunds r
         JOIN payment_attempts a ON a.id = r.attempt_id WHERE r.id = $1`,
      [refundId],
    );
    if (!r || r.status !== 'pending') return;
    const result = r.provider_ref
      ? { refundRef: r.provider_ref, status: await pay.getRefundStatus(r.provider_ref).catch(() => 'pending' as const) }
      : await pay.refund({ providerRef: r.attempt_ref, amountCents: r.amount_cents, idempotencyKey: r.idempotency_key }).catch(() => ({ refundRef: null, status: 'pending' as const }));
    if (result.refundRef) await db.query('UPDATE refunds SET provider_ref = $2 WHERE id = $1 AND provider_ref IS NULL', [refundId, result.refundRef]);
    await applyRefund(refundId, result.status);
  }

  /** Records a refund outcome once; a failure returns any held value to the wallet. */
  async function applyRefund(refundId: string, status: 'pending' | 'succeeded' | 'failed') {
    if (status === 'pending') return;
    const t = now();
    await db.transaction(async (tx) => {
      const [r] = await tx.query<{ id: string; reference: string; attempt_id: string; amount_cents: number; status: string }>(
        'SELECT * FROM refunds WHERE id = $1 FOR UPDATE',
        [refundId],
      );
      if (!r || r.status !== 'pending') return;
      await tx.query('UPDATE refunds SET status = $2, updated_at = $3 WHERE id = $1', [refundId, status, iso(t)]);
      const [a] = await tx.query<AttemptRow>('SELECT * FROM payment_attempts WHERE id = $1', [r.attempt_id]);
      const [o] = await tx.query<OrderRow>('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [a!.order_id]);
      if (status === 'failed') {
        const held = await tx.query<{ instrument_id: string; amount_cents: number | null; sessions: number | null }>(
          `SELECT instrument_id, amount_cents, sessions FROM ledger_entries WHERE idempotency_key = $1`,
          [`refund:${refundId}`],
        );
        for (const h of held) {
          // A voided gift's refund failing: the value goes back onto a card nobody can use, so staff must sort it out.
          const [w] = await tx.query<{ status: string }>('SELECT status FROM wallet_instruments WHERE id = $1', [h.instrument_id]);
          if (w?.status === 'voided') {
            await notify(tx, { audience: 'staff', permission: 'payments.refund', template: 'voided_gift_refund_failed', data: { reference: r.reference, instrumentId: h.instrument_id }, now: t });
          }
          await ledger(tx, h.instrument_id, 'reverse', h.amount_cents !== null ? { amount: -h.amount_cents } : { sessions: -h.sessions! }, 'Refund failed, value returned', r.reference, o!.id, null, `reverse:${refundId}`, t);
        }
      } else if (o!.paid_attempt_id === a!.id) {
        const [{ total }] = (await tx.query<{ total: string }>(`SELECT COALESCE(SUM(amount_cents), 0)::text AS total FROM refunds WHERE attempt_id = $1 AND status = 'succeeded'`, [a!.id])) as [
          { total: string },
        ];
        await tx.query('UPDATE orders SET status = $2 WHERE id = $1', [o!.id, Number(total) >= a!.amount_cents ? 'refunded' : 'partially_refunded']);
      }
      await notify(tx, { audience: 'customer', customerId: o!.customer_id, template: 'refund_status', data: { reference: r.reference, status, orderId: o!.id, amount: money(r.amount_cents) }, now: t });
    });
  }

  // ---------- Gifts ----------

  /**
   * Sends a gift: a fresh code is made at send time; only its hash is kept. Without `resend` it acts only on a gift
   * still scheduled, so the job, the post-payment send and "Send now" can't double-send or rotate a delivered code.
   */
  async function deliverGift(instrumentId: string, { resend = false } = {}): Promise<void> {
    const t = now();
    const code = newGiftCode();
    const target = await db.transaction(async (tx) => {
      const [i] = await tx.query<InstrumentRow>('SELECT * FROM wallet_instruments WHERE id = $1 FOR UPDATE', [instrumentId]);
      if (!i || i.claimed_at || i.delivery === 'cancelled' || i.status === 'voided') return null;
      if (resend ? i.delivery === 'scheduled' : i.delivery !== 'scheduled') return null;
      await tx.query(`UPDATE wallet_instruments SET code_hash = $2, code_last4 = $3, sent_at = $4, delivery = 'sent' WHERE id = $1`, [instrumentId, hashCode(code), code.slice(-4), iso(t)]);
      return i;
    });
    if (!target) return;
    const sent = await integrations.messages
      .send({ channel: 'sms', to: target.recipient_phone!, template: 'NTF-07.gift_received', data: { name: target.recipient_name ?? '', code, link: `${GIFT_LINK_BASE}${code}` } })
      .then(
        () => true,
        () => false,
      );
    if (!sent) {
      await db.query(`UPDATE wallet_instruments SET delivery = 'failed' WHERE id = $1 AND claimed_at IS NULL`, [instrumentId]);
      return;
    }
    // Told only once the text has actually gone out.
    await notify(db, { audience: 'customer', customerId: target.buyer_id!, template: 'gift_sent', data: { name: target.recipient_name ?? '', instrumentId }, now: now() });
  }

  async function lookupGift(code: string): Promise<{ row: InstrumentRow | null; view: GiftLookup }> {
    const clean = code.replace(/[\s-]/g, '').toUpperCase();
    const [row] = await db.query<InstrumentRow & { buyer_first: string | null }>(
      `SELECT w.*, c.first_name AS buyer_first FROM wallet_instruments w LEFT JOIN customers c ON c.id = w.buyer_id
        WHERE w.code_hash = $1 AND w.kind = 'gift_card' AND w.status = 'active'`,
      [hashCode(clean)],
    );
    const reference = `GC-${clean.slice(-4)}`;
    if (!row) return { row: null, view: { state: 'notfound', amountCents: null, recipientName: null, fromName: null, message: null, design: null, reference } };
    const amount = (await ledgerSums(db, [row.id])).get(row.id)?.amount ?? 0;
    return {
      row,
      view: {
        state: row.claimed_at ? 'claimed' : 'valid',
        // A claimed card's balance belongs to its holder; don't show it to whoever has the old code.
        amountCents: row.claimed_at ? null : amount,
        recipientName: row.claimed_at ? null : row.recipient_name,
        fromName: row.claimed_at ? null : row.buyer_first,
        message: row.claimed_at ? null : row.message,
        design: row.design,
        reference,
      },
    };
  }

  /** Puts an unclaimed gift in a customer's Wallet. Re-claiming one's own gift is a no-op. */
  async function claimGift(code: string, customerId: string): Promise<GiftLookup> {
    const found = await lookupGift(code);
    if (!found.row) throw new HttpError(404, 'not_found', 'We couldn’t find this gift card.');
    const t = iso(now());
    const claimed = await db.query(
      `UPDATE wallet_instruments SET customer_id = $2, claimed_at = $3 WHERE id = $1 AND claimed_at IS NULL RETURNING id`,
      [found.row.id, customerId, t],
    );
    if (!claimed.length && found.row.customer_id !== customerId) throw new HttpError(409, 'conflict', 'This gift card is already in a Wallet.');
    if (claimed.length && found.row.buyer_id) {
      await notify(db, { audience: 'customer', customerId: found.row.buyer_id, template: 'gift_claimed', data: { name: found.row.recipient_name ?? '', instrumentId: found.row.id }, now: now() });
    }
    return { ...found.view, state: 'claimed' };
  }

  // ---------- Ledger ----------

  async function ledger(
    tx: Queryable,
    instrumentId: string,
    kind: LedgerLine['kind'],
    value: { amount: number } | { sessions: number },
    label: string,
    reference: string | null,
    orderId: string | null,
    actorId: string | null,
    key: string,
    t: number,
  ) {
    await tx.query(
      `INSERT INTO ledger_entries (instrument_id, kind, amount_cents, sessions, label, reference, order_id, actor_id, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (instrument_id, idempotency_key) DO NOTHING`,
      [instrumentId, kind, 'amount' in value ? value.amount : null, 'sessions' in value ? value.sessions : null, label, reference, orderId, actorId, key, iso(t)],
    );
  }

  // ---------- Catalogue and orders ----------

  app.get('/v1/packages', async (): Promise<Package[]> => {
    const rows = await db.query<{ id: string; name: string; service_id: string | null; sessions: number; price_cents: number; regular_cents: number | null; validity_months: number | null; status: Package['status']; terms: string[]; sample: boolean }>(
      `SELECT * FROM packages WHERE status IN ('live', 'unavailable') ORDER BY sort`,
    );
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      serviceId: p.service_id,
      sessions: p.sessions,
      priceCents: p.price_cents,
      regularCents: p.regular_cents,
      validityMonths: p.validity_months,
      status: p.status,
      terms: p.terms,
      sample: p.sample,
    }));
  });

  app.post('/v1/orders', { preHandler: kit.requireOnboarded, ...throttled }, async (request) => {
    const body = orderCreateSchema.parse(request.body);
    const customerId = auth(request).customerId;
    const t = now();
    let amount: number;
    let packageId: string | null = null;
    let gift: OrderRow['gift'] = null;
    if (body.kind === 'package') {
      const [p] = await db.query<{ price_cents: number; status: string }>('SELECT price_cents, status FROM packages WHERE id = $1', [body.packageId]);
      if (!p || p.status !== 'live') throw new HttpError(409, 'conflict', 'This package isn’t available to buy right now.');
      amount = p.price_cents;
      packageId = body.packageId;
    } else {
      const { settings } = await settingsOf(db);
      const g = body.gift;
      const [min, max] = settings.gift.customRangeCAD;
      const dollars = g.amountCents / 100;
      if (!settings.gift.presetsCAD.includes(dollars) && !(Number.isInteger(dollars) && dollars >= min && dollars <= max)) {
        throw new HttpError(400, 'validation_failed', `Choose an amount from $${min} to $${max}.`);
      }
      if (!settings.gift.designs.includes(g.design)) throw new HttpError(400, 'validation_failed', 'Choose one of the designs.');
      const phone = normalizePhone(g.recipientPhone);
      if (!phone) throw new HttpError(400, 'validation_failed', 'Enter a 10-digit Canadian mobile number');
      if (g.sendAt && (Date.parse(g.sendAt) <= t || Date.parse(g.sendAt) > t + 365 * DAY)) throw new HttpError(400, 'validation_failed', 'Choose a send time within the next year.');
      amount = g.amountCents;
      gift = { ...g, recipientPhone: phone };
    }
    await db.query(
      `INSERT INTO orders (reference, customer_id, kind, package_id, gift, amount_cents, status, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8) ON CONFLICT (customer_id, idempotency_key) DO NOTHING`,
      [ref('NB-O'), customerId, body.kind, packageId, gift ? JSON.stringify(gift) : null, amount, body.idempotencyKey, iso(t)],
    );
    const [o] = await db.query<OrderRow>('SELECT * FROM orders WHERE customer_id = $1 AND idempotency_key = $2', [customerId, body.idempotencyKey]);
    // The same key must mean the same order: another package, amount or recipient is a mistake, not a retry.
    const g = o!.gift;
    const same =
      o!.kind === body.kind &&
      o!.package_id === packageId &&
      o!.amount_cents === amount &&
      (!gift ||
        (g?.design === gift.design && g.recipientName === gift.recipientName && g.recipientPhone === gift.recipientPhone && (g.message ?? null) === (gift.message ?? null) && (g.sendAt ?? null) === (gift.sendAt ?? null)));
    if (!same) throw new HttpError(409, 'idempotency_mismatch', 'That request key was already used for a different order. Start again.');
    return toOrder(o!);
  });

  app.get('/v1/orders/:id', signedIn, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    return toOrder(await ownOrder(auth(request).customerId, id));
  });

  // PAY-01 (PAY 12–14): switched on in settings AND supported by the provider; financing never implies approval.
  app.get('/v1/orders/:id/methods', signedIn, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { platform } = z.object({ platform: z.enum(['ios', 'android']).optional() }).parse(request.query);
    const o = await ownOrder(auth(request).customerId, id);
    const { settings } = await settingsOf(db);
    const supported = pay.capabilities();
    // Apple Pay / Google Pay first when on (PAY 13).
    const order: PaymentMethod[] = ['apple_pay', 'google_pay', 'card', 'klarna', 'affirm'];
    const methods: MethodOption[] = order
      .filter((m) => settings.paymentMethods[SETTING_KEY[m]] && supported.includes(m as PaymentMethodId))
      // Apple Pay only on iOS, Google Pay only on Android; no platform given = everything (WP-18).
      .filter((m) => !platform || (m === 'apple_pay' ? platform === 'ios' : m === 'google_pay' ? platform === 'android' : true))
      .map((m) => {
        if (m !== 'klarna' && m !== 'affirm') return { method: m, available: true, note: null };
        const offered = pay.financingOffered(m, o.amount_cents);
        return { method: m, available: offered, note: offered ? 'Subject to approval by the provider' : 'Not offered for this amount' };
      });
    return { order: await toOrder(o), methods };
  });

  // PAY-01 → provider. A retry first settles or cancels the previous open attempt, so there's never two at once.
  app.post('/v1/orders/:id/attempts', { ...signedIn, ...throttled }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = attemptCreateSchema.parse(request.body);
    const o = await ownOrder(auth(request).customerId, id);
    const [same] = await db.query<AttemptRow>('SELECT * FROM payment_attempts WHERE order_id = $1 AND idempotency_key = $2', [o.id, body.idempotencyKey]);
    if (same) return toAttempt(same);
    const { settings } = await settingsOf(db);
    const m = body.method;
    if (!settings.paymentMethods[SETTING_KEY[m]] || !pay.capabilities().includes(m)) throw new HttpError(409, 'conflict', 'That payment method isn’t available.');
    if ((m === 'klarna' || m === 'affirm') && !pay.financingOffered(m, o.amount_cents)) throw new HttpError(409, 'conflict', 'Not offered for this amount.');
    for (const open of await db.query<AttemptRow>(`SELECT * FROM payment_attempts WHERE order_id = $1 AND status IN ('requires_action', 'processing')`, [o.id])) {
      const settled = await reconcile(open);
      if (settled.status === 'succeeded') return toAttempt(settled);
      if (settled.status === 'requires_action' || settled.status === 'processing') {
        await pay.cancel(settled.provider_ref);
        const after = await reconcile(settled);
        if (after.status === 'succeeded') return toAttempt(after);
        // Provider still busy: ask the person to wait rather than risk a second charge.
        if (after.status !== 'cancelled' && after.status !== 'declined') throw new HttpError(409, 'conflict', 'A payment is still being checked.');
      }
    }
    const [current] = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [o.id]);
    if (current!.status !== 'pending') throw new HttpError(409, 'conflict', 'This order is already paid.');
    const intent = await pay.createIntent({ idempotencyKey: `${o.id}:${body.idempotencyKey}`, amountCents: o.amount_cents, context: o.kind, method: m });
    const t = iso(now());
    try {
      await db.query(
        `INSERT INTO payment_attempts (reference, order_id, method, provider_ref, status, redirect_url, amount_cents, idempotency_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) ON CONFLICT (order_id, idempotency_key) DO NOTHING`,
        [ref('PAY'), o.id, m, intent.providerRef, intent.status, intent.redirectUrl, o.amount_cents, body.idempotencyKey, t],
      );
    } catch (err) {
      // Another attempt for this order opened at the same moment (one-open index): drop ours, nothing was charged.
      if ((err as { code?: string }).code !== '23505') throw err;
      await pay.cancel(intent.providerRef).catch(() => undefined);
      throw new HttpError(409, 'conflict', 'A payment is already in progress for this order.');
    }
    const [a] = await db.query<AttemptRow>('SELECT * FROM payment_attempts WHERE order_id = $1 AND idempotency_key = $2', [o.id, body.idempotencyKey]);
    return toAttempt(a!);
  });

  // PAY-02: card / Apple Pay / Google Pay with a provider token. A second confirm returns the recorded result.
  app.post('/v1/payments/attempts/:id/confirm', { ...signedIn, ...throttled }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { paymentToken } = attemptConfirmSchema.parse(request.body);
    const a = await ownAttempt(auth(request).customerId, id);
    if (a.status !== 'requires_action') return toAttempt(await reconcile(a));
    return toAttempt(await settle(a.id, await pay.confirm(a.provider_ref, paymentToken)));
  });

  // PAY-04/08: status, reconciled with the provider whenever it's still open.
  app.get('/v1/payments/attempts/:id', signedIn, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    return toAttempt(await reconcile(await ownAttempt(auth(request).customerId, id)));
  });

  // PAY-07: the person backed out (or left Klarna). The provider decides whether anything was taken.
  app.post('/v1/payments/attempts/:id/cancel', signedIn, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const a = await ownAttempt(auth(request).customerId, id);
    if (a.status === 'requires_action' || a.status === 'processing') await pay.cancel(a.provider_ref);
    return toAttempt(await reconcile(a));
  });

  // Provider webhooks: signed, de-duplicated by event id, and only a nudge to re-read the provider (PAY 06).
  app.register(async (hooks) => {
    hooks.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => done(null, body));
    hooks.post('/v1/payments/webhook', async (request, reply) => {
      const event = pay.parseWebhook(String(request.body ?? ''), request.headers['x-provider-signature'] as string | undefined);
      if (!event) throw new HttpError(400, 'bad_request', 'Invalid signature.');
      const fresh = await db.query('INSERT INTO provider_events (event_id, provider_ref, type, received_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING event_id', [
        event.eventId,
        event.providerRef,
        event.type,
        iso(now()),
      ]);
      if (!fresh.length) return reply.status(200).send({ received: true, duplicate: true });
      try {
        if (event.type === 'refund.updated') {
          const [r] = await db.query<{ id: string }>('SELECT id FROM refunds WHERE provider_ref = $1', [event.providerRef]);
          if (r) await applyRefund(r.id, await pay.getRefundStatus(event.providerRef));
        } else {
          const [a] = await db.query<AttemptRow>('SELECT * FROM payment_attempts WHERE provider_ref = $1', [event.providerRef]);
          if (a) await settle(a.id, await pay.getStatus(a.provider_ref));
        }
      } catch (err) {
        // Not processed: forget the event so the provider's retry is handled instead of acknowledged as a duplicate.
        await db.query('DELETE FROM provider_events WHERE event_id = $1', [event.eventId]);
        throw err;
      }
      return reply.status(200).send({ received: true, duplicate: false });
    });
  });

  // PAY-09 (PAY 08).
  app.get('/v1/receipts/:orderId', signedIn, async (request): Promise<Receipt> => {
    const { orderId } = z.object({ orderId: z.uuid() }).parse(request.params);
    const o = await ownOrder(auth(request).customerId, orderId);
    if (o.status === 'pending' || o.status === 'cancelled' || !o.paid_attempt_id) throw new HttpError(404, 'not_found', 'No receipt for this order yet.');
    const [a] = await db.query<AttemptRow>('SELECT * FROM payment_attempts WHERE id = $1', [o.paid_attempt_id]);
    const refunds = await db.query<{ reference: string; amount_cents: number; status: 'pending' | 'succeeded' | 'failed'; created_at: Date }>(
      'SELECT reference, amount_cents, status, created_at FROM refunds WHERE attempt_id = $1 ORDER BY created_at',
      [a!.id],
    );
    const view = await toOrder(o);
    return {
      orderId: o.id,
      reference: a!.reference,
      orderReference: o.reference,
      status: o.status as Receipt['status'],
      lines: [{ label: view.title, amountCents: o.amount_cents }],
      taxIncludedCents: taxIncluded(o.amount_cents),
      totalCents: o.amount_cents,
      methodLabel: methodLabel(a!) ?? METHOD_NAMES[a!.method],
      paidAt: o.paid_at!.toISOString(),
      refunds: refunds.map((r) => ({ reference: r.reference, amountCents: r.amount_cents, status: r.status, createdAt: r.created_at.toISOString() })),
      sample: true,
    };
  });

  // ---------- Wallet ----------

  app.get('/v1/wallet', signedIn, async (request) => {
    const { features } = await settingsOf(db);
    const items = await walletFor(db, auth(request).customerId, now());
    // D38: membership only exists for legacy members, and only while the flag is on.
    return { instruments: items.filter((i) => i.kind !== 'membership' || features.legacyMembership), asOf: iso(now()) };
  });

  app.get('/v1/wallet/instruments/:id', signedIn, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const customerId = auth(request).customerId;
    const [row] = await db.query<InstrumentRow>('SELECT *, (SELECT service_id FROM packages p WHERE p.id = wallet_instruments.package_id) AS service_id FROM wallet_instruments WHERE id = $1 AND (customer_id = $2 OR buyer_id = $2)', [id, customerId]);
    if (!row || (row.kind === 'membership' && !(await settingsOf(db)).features.legacyMembership)) throw new HttpError(404, 'not_found', 'Not found in your Wallet.');
    const instrument = toInstrument(row, (await ledgerSums(db, [row.id])).get(row.id), customerId, now());
    // A sender sees delivery, not how the recipient spends it.
    const lines =
      instrument.role === 'owner'
        ? await db.query<{ kind: LedgerLine['kind']; label: string; amount_cents: number | null; sessions: number | null; reference: string | null; created_at: Date }>(
            'SELECT kind, label, amount_cents, sessions, reference, created_at FROM ledger_entries WHERE instrument_id = $1 ORDER BY created_at DESC, id DESC',
            [row.id],
          )
        : [];
    const [pkg] = row.package_id ? await db.query<{ terms: string[] }>('SELECT terms FROM packages WHERE id = $1', [row.package_id]) : [];
    return {
      instrument,
      lines: instrument.status === 'reconciling' ? [] : lines.map((l) => ({ kind: l.kind, label: l.label, amountCents: l.amount_cents, sessions: l.sessions, reference: l.reference, createdAt: l.created_at.toISOString() })),
      terms: row.kind === 'gift_card' ? GIFT_TERMS : row.kind === 'credit' ? CREDIT_TERMS : (pkg?.terms ?? []),
    };
  });

  // WAL-06 (WALT 08): purchases with their references, then every movement on value you hold.
  app.get('/v1/wallet/history', signedIn, async (request): Promise<HistoryItem[]> => {
    const customerId = auth(request).customerId;
    const orders = await db.query<OrderRow & { pkg_name: string | null; method: PaymentMethod; card_brand: string | null; card_last4: string | null }>(
      `SELECT o.*, p.name AS pkg_name, a.method, a.card_brand, a.card_last4 FROM orders o
         JOIN payment_attempts a ON a.id = o.paid_attempt_id LEFT JOIN packages p ON p.id = o.package_id
        WHERE o.customer_id = $1 AND o.paid_attempt_id IS NOT NULL`,
      [customerId],
    );
    const refunds = await db.query<{ id: string; reference: string; amount_cents: number; status: string; created_at: Date; order_id: string }>(
      `SELECT r.id, r.reference, r.amount_cents, r.status, r.created_at, o.id AS order_id FROM refunds r
         JOIN payment_attempts a ON a.id = r.attempt_id JOIN orders o ON o.id = a.order_id WHERE o.customer_id = $1`,
      [customerId],
    );
    const moves = await db.query<{ id: string; label: string; kind: string; amount_cents: number | null; sessions: number | null; reference: string | null; created_at: Date; ilabel: string }>(
      `SELECT l.id::text AS id, l.label, l.kind, l.amount_cents, l.sessions, l.reference, l.created_at, w.label AS ilabel FROM ledger_entries l
         JOIN wallet_instruments w ON w.id = l.instrument_id
        WHERE w.customer_id = $1 AND l.kind NOT IN ('purchase', 'refund')`,
      [customerId],
    );
    const items: HistoryItem[] = [
      ...orders.map((o) => ({
        id: `order:${o.id}`,
        title: orderTitle(o, o.pkg_name),
        subtitle: methodLabel(o) ?? METHOD_NAMES[o.method],
        amountCents: -o.amount_cents,
        sessions: null,
        reference: o.reference,
        orderId: o.id,
        createdAt: (o.paid_at ?? o.created_at).toISOString(),
      })),
      ...refunds.map((r) => ({
        id: `refund:${r.id}`,
        title: 'Refund',
        subtitle: r.status === 'succeeded' ? 'Refunded' : r.status === 'failed' ? 'Refund failed' : 'Refund in progress',
        amountCents: r.amount_cents,
        sessions: null,
        reference: r.reference,
        orderId: r.order_id,
        createdAt: r.created_at.toISOString(),
      })),
      ...moves.map((m) => ({
        id: `ledger:${m.id}`,
        title: m.label,
        subtitle: m.ilabel,
        amountCents: m.amount_cents,
        sessions: m.sessions,
        reference: m.reference,
        orderId: null,
        createdAt: m.created_at.toISOString(),
      })),
    ];
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  // WAL-12 (WALT 11): the clinic checks; nothing changes in the meantime.
  app.post('/v1/wallet/help', { ...signedIn, ...throttled }, async (request) => {
    const body = balanceHelpSchema.parse(request.body);
    const customerId = auth(request).customerId;
    const [own] = await db.query('SELECT 1 FROM wallet_instruments WHERE id = $1 AND customer_id = $2', [body.instrumentId, customerId]);
    if (!own) throw new HttpError(404, 'not_found', 'Not found in your Wallet.');
    const t = now();
    return db.transaction(async (tx) => {
      const [existing] = await tx.query<{ reference: string }>('SELECT reference FROM balance_help_cases WHERE customer_id = $1 AND idempotency_key = $2', [customerId, body.idempotencyKey]);
      if (existing) return { reference: existing.reference };
      const reference = ref('BH');
      await tx.query(
        `INSERT INTO balance_help_cases (reference, customer_id, instrument_id, expected, idempotency_key, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [reference, customerId, body.instrumentId, body.expected, body.idempotencyKey, iso(t)],
      );
      await notify(tx, { audience: 'staff', permission: 'value.lookup', template: 'balance_help', data: { reference }, now: t });
      return { reference };
    });
  });

  // WAL-04 sender actions, until the gift is claimed.
  async function sentGift(customerId: string, id: string): Promise<InstrumentRow> {
    const [row] = await db.query<InstrumentRow>(`SELECT * FROM wallet_instruments WHERE id = $1 AND buyer_id = $2 AND kind = 'gift_card'`, [id, customerId]);
    if (!row) throw new HttpError(404, 'not_found', 'Gift not found.');
    if (row.status === 'voided') throw new HttpError(409, 'conflict', 'This gift was cancelled.');
    if (row.claimed_at) throw new HttpError(409, 'conflict', 'This gift card has been claimed.');
    return row;
  }
  app.post('/v1/wallet/gifts/:id/send-time', signedIn, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { sendAt } = giftSendTimeSchema.parse(request.body);
    const row = await sentGift(auth(request).customerId, id);
    if (row.delivery !== 'scheduled') throw new HttpError(409, 'conflict', 'This gift has already been sent.');
    const t = now();
    if (sendAt && (Date.parse(sendAt) <= t || Date.parse(sendAt) > t + 365 * DAY)) throw new HttpError(400, 'validation_failed', 'Choose a send time within the next year.');
    await db.query('UPDATE wallet_instruments SET send_at = $2 WHERE id = $1', [id, sendAt ?? iso(t)]);
    if (!sendAt) await deliverGift(id);
    return { ok: true };
  });
  app.post('/v1/wallet/gifts/:id/resend', { ...signedIn, ...throttled }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const row = await sentGift(auth(request).customerId, id);
    if (row.delivery === 'scheduled') throw new HttpError(409, 'conflict', 'This gift hasn’t been sent yet.');
    await deliverGift(id, { resend: true }); // a new code; the old one stops working
    return { ok: true };
  });

  // WAL-11 / WEB-01 lookup (no sign-in needed to see what was sent; claiming needs the recipient's number).
  app.post('/v1/gifts/lookup', throttled, async (request) => (await lookupGift(giftCodeSchema.parse(request.body).code)).view);
  app.post('/v1/gifts/claim', { preHandler: kit.requireOnboarded, ...throttled }, async (request) => claimGift(giftCodeSchema.parse(request.body).code, auth(request).customerId));
  // WEB-01 contract: claim without the app, after a code to the recipient's own number.
  app.post('/v1/gifts/claim/start', throttled, async (request) => {
    const body = webGiftClaimStartSchema.parse(request.body);
    const found = await lookupGift(body.code);
    if (found.view.state !== 'valid') return { state: found.view.state, challenge: null };
    return { state: 'valid', challenge: await kit.startCode(body.phone, 'gift_claim') };
  });
  app.post('/v1/gifts/claim/confirm', throttled, async (request) => {
    const body = webGiftClaimConfirmSchema.parse(request.body);
    const phone = await kit.checkCode(body.challengeId, body.otp, 'gift_claim');
    const [c] = await db.query<{ id: string }>(
      `INSERT INTO customers (phone_e164) VALUES ($1) ON CONFLICT (phone_e164) DO UPDATE SET updated_at = customers.updated_at RETURNING id`,
      [phone],
    );
    return claimGift(body.code, c!.id);
  });

  // ---------- Staff: lookup, counter redemption, adjustments, refunds (STF-11, STF-25, WALT 15) ----------

  // Whoever may redeem must be able to find the value first, so either permission opens lookup (ST-23).
  app.get('/v1/staff/lookup', { preHandler: staffOnly('value.lookup', 'value.redeem') }, async (request) => {
    const q = z.object({ code: z.string().optional(), phone: z.string().optional() }).parse(request.query);
    const t = now();
    if (q.code) {
      const found = await lookupGift(q.code);
      if (!found.row) return { customer: null, instruments: [] };
      const sums = await ledgerSums(db, [found.row.id]);
      return { customer: null, instruments: [toInstrument(found.row, sums.get(found.row.id), found.row.customer_id, t)] };
    }
    const phone = normalizePhone(q.phone ?? '');
    if (!phone) throw new HttpError(400, 'validation_failed', 'Give a gift code or a mobile number.');
    const [c] = await db.query<{ id: string; first_name: string | null; last_name: string | null; phone_e164: string }>(
      'SELECT id, first_name, last_name, phone_e164 FROM customers WHERE phone_e164 = $1 AND deleted_at IS NULL',
      [phone],
    );
    if (!c) return { customer: null, instruments: [] };
    const instruments = (await walletFor(db, c.id, t)).filter((i) => i.role === 'owner');
    return { customer: { id: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(' ') || null, phoneMasked: maskPhone(c.phone_e164) }, instruments };
  });

  // The ledger changes only here, on the staff member's confirm, and only if the value is really there.
  app.post('/v1/staff/redemptions', { preHandler: staffOnly('value.redeem') }, async (request) => {
    const body = staffRedeemSchema.parse(request.body);
    const ctx = auth(request);
    const t = now();
    const result = await db.transaction(async (tx) => {
      const [row] = await tx.query<InstrumentRow>(
        'SELECT *, (SELECT service_id FROM packages p WHERE p.id = wallet_instruments.package_id) AS service_id FROM wallet_instruments WHERE id = $1 FOR UPDATE',
        [body.instrumentId],
      );
      // An unclaimed gift card (sent, code not yet added to a Wallet) can be used at the desk by its code (API-5).
      if (!row || (!row.customer_id && !(row.kind === 'gift_card' && row.code_last4))) throw new HttpError(404, 'not_found', 'Not found.');
      if (row.customer_id === ctx.customerId || (!row.customer_id && row.buyer_id === ctx.customerId)) throw new HttpError(403, 'forbidden', 'Another staff member must redeem your own value.');
      const key = `redeem:${body.idempotencyKey}`;
      const [done] = await tx.query('SELECT 1 FROM ledger_entries WHERE instrument_id = $1 AND idempotency_key = $2', [row.id, key]);
      if (!done) {
        const view = toInstrument(row, (await ledgerSums(tx, [row.id])).get(row.id), row.customer_id, t);
        if (view.status !== 'active') throw new HttpError(409, 'conflict', `This ${row.kind === 'package' ? 'package' : 'balance'} can’t be used (${view.status}).`);
        if (row.kind === 'package') {
          if (!body.sessions || body.sessions > view.sessions!.remaining) throw new HttpError(409, 'conflict', 'Not enough sessions left.');
          await ledger(tx, row.id, 'redeem', { sessions: -body.sessions }, 'Used at your visit', body.reference ?? null, null, ctx.customerId, key, t);
        } else {
          if (!body.amountCents || body.amountCents > (view.balanceCents ?? 0)) throw new HttpError(409, 'conflict', 'Not enough balance.');
          await ledger(tx, row.id, 'redeem', { amount: -body.amountCents }, 'Used at your visit', body.reference ?? null, null, ctx.customerId, key, t);
        }
        const after = toInstrument(row, (await ledgerSums(tx, [row.id])).get(row.id), row.customer_id, t);
        if (row.customer_id) {
          await notify(tx, {
            audience: 'customer',
            customerId: row.customer_id,
            template: row.kind === 'package' ? 'NTF-09.package_session_used' : 'value_used',
            data: {
              instrumentId: row.id,
              label: row.label,
              reference: body.reference ?? '',
              amount: body.amountCents ? money(body.amountCents) : '',
              sessions: String(body.sessions ?? ''),
              left: String(after.sessions?.remaining ?? ''),
              total: String(after.sessions?.total ?? ''),
              until: row.expires_at ? new Intl.DateTimeFormat('en-US', { timeZone: await clinicTz(tx), month: 'short', year: 'numeric' }).format(row.expires_at) : '',
            },
            now: t,
          });
        }
      }
      return toInstrument(row, (await ledgerSums(tx, [row.id])).get(row.id), row.customer_id, t);
    });
    return result;
  });

  app.post('/v1/staff/adjustments', { preHandler: staffOnly('value.adjust') }, async (request) => {
    const body = staffAdjustSchema.parse(request.body);
    const ctx = auth(request);
    const t = now();
    return db.transaction(async (tx) => {
      let instrumentId = body.instrumentId;
      if (!instrumentId) {
        if (!body.customerId) throw new HttpError(400, 'validation_failed', 'Give an instrument or a customer.');
        if (body.customerId === ctx.customerId) throw new HttpError(403, 'forbidden', 'Another staff member must adjust your own value.');
        const [who] = await tx.query('SELECT 1 FROM customers WHERE id::text = $1 AND deleted_at IS NULL', [body.customerId]);
        if (!who) throw new HttpError(404, 'not_found', 'Customer not found.');
        await tx.query(
          `INSERT INTO wallet_instruments (customer_id, kind, label, source, status, created_at) VALUES ($1, 'credit', 'Clinic credit', 'clinic', 'active', $2)
           ON CONFLICT (customer_id) WHERE kind = 'credit' DO NOTHING`,
          [body.customerId, iso(t)],
        );
        const [credit] = await tx.query<{ id: string }>(`SELECT id FROM wallet_instruments WHERE customer_id = $1 AND kind = 'credit'`, [body.customerId]);
        instrumentId = credit!.id;
      }
      const [row] = await tx.query<InstrumentRow>('SELECT * FROM wallet_instruments WHERE id = $1 FOR UPDATE', [instrumentId]);
      if (!row) throw new HttpError(404, 'not_found', 'Not found.');
      if (row.kind === 'package' || row.kind === 'membership') throw new HttpError(409, 'conflict', 'Only credit or gift-card balances can be adjusted.');
      if (row.status === 'voided' || (row.expires_at && row.expires_at.getTime() <= t)) throw new HttpError(409, 'conflict', 'This balance is cancelled or expired and can’t be changed.');
      if (row.customer_id === ctx.customerId) throw new HttpError(403, 'forbidden', 'Another staff member must adjust your own value.');
      const key = `adjust:${body.idempotencyKey}`;
      // A replayed confirm returns the result it already had (no second entry, no second audit row).
      const [done] = await tx.query('SELECT 1 FROM ledger_entries WHERE instrument_id = $1 AND idempotency_key = $2', [row.id, key]);
      if (!done) {
        const before = (await ledgerSums(tx, [row.id])).get(row.id)?.amount ?? 0;
        if (before + body.amountCents < 0) throw new HttpError(409, 'conflict', 'A balance can’t go below zero.');
        // The customer sees `label`; the staff reason stays in the audit trail only.
        const label = body.label ?? (body.amountCents > 0 ? 'Added by the clinic' : 'Adjusted by the clinic');
        await ledger(tx, row.id, body.amountCents > 0 && row.kind === 'credit' ? 'issue' : 'adjust', { amount: body.amountCents }, label, null, null, ctx.customerId, key, t);
        await audit(tx, request, `wallet_instrument:${row.id}`, 'balance', String(before), String(before + body.amountCents), body.reason);
      }
      return toInstrument(row, (await ledgerSums(tx, [row.id])).get(row.id), row.customer_id, t);
    });
  });

  app.post('/v1/staff/payments/:attemptId/refunds', { preHandler: staffOnly('payments.refund') }, async (request) => {
    const { attemptId } = z.object({ attemptId: z.uuid() }).parse(request.params);
    const body = staffRefundSchema.parse(request.body);
    const ctx = auth(request);
    const [owner] = await db.query<{ customer_id: string }>('SELECT o.customer_id FROM payment_attempts a JOIN orders o ON o.id = a.order_id WHERE a.id = $1', [attemptId]);
    if (!owner) throw new HttpError(404, 'not_found', 'Payment not found.');
    if (owner.customer_id === ctx.customerId) throw new HttpError(403, 'forbidden', 'Another staff member must refund your own payment.');
    const r = await refund(attemptId, body.amountCents, body.reason, ctx.customerId, `staff:${attemptId}:${body.idempotencyKey}`, true);
    await db.transaction((tx) => audit(tx, request, `refund:${r.reference}`, 'status', null, String(r.status), body.reason));
    return r;
  });

  // ---------- Staff gift-card actions (STF-17): resend, change recipient, void ----------

  type StaffGiftRow = InstrumentRow & { order_amount: number | null; paid_attempt_id: string | null; buyer_name: string | null };
  async function staffGift(tx: Queryable, id: string, lock = false): Promise<StaffGiftRow> {
    const [row] = await tx.query<StaffGiftRow>(
      `SELECT w.*, o.amount_cents AS order_amount, o.paid_attempt_id, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '') AS buyer_name
         FROM wallet_instruments w LEFT JOIN orders o ON o.id = w.order_id LEFT JOIN customers c ON c.id = w.buyer_id
        WHERE w.id = $1 AND w.kind = 'gift_card' ${lock ? 'FOR UPDATE OF w' : ''}`,
      [id],
    );
    if (!row) throw new HttpError(404, 'not_found', 'Gift card not found.');
    return row;
  }
  async function giftView(tx: Queryable, id: string): Promise<StaffGift> {
    const g = await staffGift(tx, id);
    const remaining = (await ledgerSums(tx, [g.id])).get(g.id)?.amount ?? 0;
    let refunded = 0;
    if (g.paid_attempt_id) {
      const [r] = await tx.query<{ n: string }>(`SELECT COALESCE(SUM(amount_cents), 0)::text AS n FROM refunds WHERE attempt_id = $1 AND status <> 'failed'`, [g.paid_attempt_id]);
      refunded = Number(r!.n);
    }
    return {
      id: g.id,
      reference: `GC-${g.code_last4 ?? g.id.slice(0, 4).toUpperCase()}`,
      remainingCents: remaining,
      originalCents: g.order_amount ?? 0,
      recipientName: g.recipient_name,
      recipientPhoneMasked: g.recipient_phone ? maskPhone(g.recipient_phone) : null,
      buyerName: g.buyer_name,
      delivery: g.delivery,
      sendAt: g.send_at?.toISOString() ?? null,
      sentAt: g.sent_at?.toISOString() ?? null,
      claimed: !!g.claimed_at,
      voided: g.status === 'voided',
      refundableCents: g.paid_attempt_id && g.status !== 'voided' ? Math.max(0, Math.min(remaining, (g.order_amount ?? 0) - refunded)) : 0,
    };
  }

  app.get('/v1/staff/gifts', { preHandler: staffOnly('giftcard.actions') }, async (request) => {
    const { q } = z.object({ q: z.string().trim().max(60).optional() }).parse(request.query);
    const term = q?.replace(/^GC-/i, '').toLowerCase() || null;
    const rows = await db.query<{ id: string }>(
      `SELECT id FROM wallet_instruments WHERE kind = 'gift_card'
          AND ($1::text IS NULL OR position($1 in lower(COALESCE(recipient_name, ''))) > 0 OR lower(code_last4) = $1)
        ORDER BY created_at DESC LIMIT 50`,
      [term],
    );
    return Promise.all(rows.map((r) => giftView(db, r.id)));
  });
  app.get('/v1/staff/gifts/:id', { preHandler: staffOnly('giftcard.actions') }, async (request) => giftView(db, z.object({ id: z.uuid() }).parse(request.params).id));

  // Resend = a new code by text; the old code stops working (that is also how a lost code is reissued).
  app.post('/v1/staff/gifts/:id/resend', { preHandler: staffOnly('giftcard.actions'), ...throttled }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = giftActionSchema.parse(request.body);
    const g = await staffGift(db, id);
    if (g.buyer_id === auth(request).customerId) throw new HttpError(403, 'forbidden', 'Another staff member must act on your own gift card.');
    if (g.claimed_at) throw new HttpError(409, 'conflict', 'This gift card is already in a Wallet: nothing to resend.');
    if (g.status === 'voided') throw new HttpError(409, 'conflict', 'This gift card was voided.');
    await db.transaction((tx) => audit(tx, request, `gift:${id}`, 'code', g.code_last4, 'new code sent', body.reason ?? 'resent by staff'));
    // A scheduled gift is sent now; a sent (or failed) one gets a fresh code.
    await deliverGift(id, { resend: g.delivery !== 'scheduled' });
    return giftView(db, id);
  });

  app.post('/v1/staff/gifts/:id/recipient', { preHandler: staffOnly('giftcard.actions') }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = giftActionSchema.parse(request.body);
    const phone = normalizePhone(body.recipientPhone ?? '');
    if (!body.recipientName || !phone) throw new HttpError(400, 'validation_failed', 'Give the new recipient’s name and mobile number.');
    if (!body.reason) throw new HttpError(400, 'validation_failed', 'A reason is required to change the recipient.');
    // Redirecting value to yourself (or a card you bought) needs another staff member.
    const [actor] = await db.query<{ phone_e164: string }>('SELECT phone_e164 FROM customers WHERE id = $1', [auth(request).customerId]);
    if (actor?.phone_e164 === phone) throw new HttpError(403, 'forbidden', 'Another staff member must send a gift card to you.');
    const resend = await db.transaction(async (tx) => {
      const g = await staffGift(tx, id, true);
      if (g.buyer_id === auth(request).customerId) throw new HttpError(403, 'forbidden', 'Another staff member must act on your own gift card.');
      if (g.claimed_at) throw new HttpError(409, 'conflict', 'This gift card is already in a Wallet: the recipient can’t change.');
      if (g.status === 'voided') throw new HttpError(409, 'conflict', 'This gift card was voided.');
      if (g.recipient_name === body.recipientName && g.recipient_phone === phone) return false;
      await tx.query('UPDATE wallet_instruments SET recipient_name = $2, recipient_phone = $3 WHERE id = $1', [id, body.recipientName, phone]);
      const was = [g.recipient_name, g.recipient_phone ? maskPhone(g.recipient_phone) : null].filter(Boolean).join(' ');
      await audit(tx, request, `gift:${id}`, 'recipient', was || null, `${body.recipientName} ${maskPhone(phone)}`, body.reason ?? 'recipient changed');
      return g.delivery !== 'scheduled';
    });
    // Already sent: the old code stops working and the new person gets their own.
    if (resend) await deliverGift(id, { resend: true });
    return giftView(db, id);
  });

  // Void stops the card. With `refund`, the unused value goes back to the buyer's payment first (refund holds it).
  app.post('/v1/staff/gifts/:id/void', { preHandler: staffOnly('giftcard.void') }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const body = giftActionSchema.parse(request.body);
    if (!body.reason) throw new HttpError(400, 'validation_failed', 'A reason is required to void a gift card.');
    const ctx = auth(request);
    const before = await giftView(db, id);
    if (before.voided) return before;
    const g = await staffGift(db, id);
    if (g.buyer_id === ctx.customerId || g.customer_id === ctx.customerId) throw new HttpError(403, 'forbidden', 'Another staff member must void your own gift card.');
    if (body.refund && before.refundableCents > 0) {
      if (!ctx.permissions.includes('payments.refund')) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: 'payments.refund' });
      await refund(g.paid_attempt_id!, before.refundableCents, body.reason, ctx.customerId, `void:${id}:${body.idempotencyKey}`, true);
    }
    const t = now();
    await db.transaction(async (tx) => {
      const locked = await staffGift(tx, id, true);
      if (locked.status === 'voided') return;
      const left = (await ledgerSums(tx, [id])).get(id)?.amount ?? 0;
      // Whatever wasn't refunded leaves the card too; the ledger says why.
      if (left > 0) await ledger(tx, id, 'adjust', { amount: -left }, 'Gift card voided', null, null, ctx.customerId, `void:${id}`, t);
      await tx.query(`UPDATE wallet_instruments SET status = 'voided', delivery = CASE WHEN delivery = 'scheduled' THEN 'cancelled' ELSE delivery END WHERE id = $1`, [id]);
      await audit(tx, request, `gift:${id}`, 'status', 'active', 'voided', body.reason!);
      if (locked.customer_id) await notify(tx, { audience: 'customer', customerId: locked.customer_id, template: 'gift_voided', data: { instrumentId: id }, now: t });
    });
    return giftView(db, id);
  });

  /**
   * Background check of an open attempt: asks the provider; one abandoned for longer than ABANDON_MS is cancelled
   * at the provider (nothing was charged, or the provider says so). Unchanged attempts are re-checked every 5 min.
   */
  async function reconcileById(id: string) {
    const [a] = await db.query<AttemptRow & { updated_at: Date }>('SELECT * FROM payment_attempts WHERE id = $1', [id]);
    if (!a) return null;
    if (now() - a.created_at.getTime() > ABANDON_MS) await pay.cancel(a.provider_ref).catch(() => undefined);
    const after = await reconcile(a);
    if (after.status === 'requires_action' || after.status === 'processing') await db.query('UPDATE payment_attempts SET updated_at = $2 WHERE id = $1', [id, iso(now())]);
    return after;
  }
  return { reconcileById, deliverGift, retryRefund };
}

/** Scheduled gifts whose time has come (WALT 02). Idempotent: a sent gift is skipped. */
export async function dueGiftIds(db: Db, now: number): Promise<string[]> {
  const rows = await db.query<{ id: string }>(`SELECT id FROM wallet_instruments WHERE kind = 'gift_card' AND delivery = 'scheduled' AND send_at <= $1`, [iso(now)]);
  return rows.map((r) => r.id);
}

/** Refunds the provider hasn't confirmed yet (lost response, outage). */
export async function pendingRefundIds(db: Db, now: number): Promise<string[]> {
  const rows = await db.query<{ id: string }>(`SELECT id FROM refunds WHERE status = 'pending' AND updated_at <= $1`, [iso(now - 60_000)]);
  return rows.map((r) => r.id);
}

/** Payments still open after a while: ask the provider again (PAY 07 recovery after the app closed). */
export async function staleAttemptIds(db: Db, now: number): Promise<string[]> {
  const rows = await db.query<{ id: string }>(`SELECT id FROM payment_attempts WHERE status IN ('requires_action', 'processing') AND updated_at <= $1`, [iso(now - 5 * 60_000)]);
  return rows.map((r) => r.id);
}

export type WalletKit = ReturnType<typeof registerWalletRoutes>;
export type { Integrations };
