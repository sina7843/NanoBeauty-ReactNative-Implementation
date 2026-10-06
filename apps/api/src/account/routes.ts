import { randomBytes } from 'node:crypto';
import {
  dataRequestCreateSchema,
  deletionConfirmSchema,
  maskPhone,
  phoneChangeStartSchema,
  phoneChangeVerifySchema,
  preferencesUpdateSchema,
  webDeletionStartSchema,
  type ConsentRecord,
  type DeletionPreview,
  type DeletionStatus,
  type InboxItem,
  type Preferences,
  type PrivacyRequest,
} from '@nano/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthKit } from '../auth/routes';
import { CONSENT_VERSIONS, type AuthContext } from '../auth/session';
import type { Db, Queryable } from '../db';
import { HttpError } from '../errors';
import type { Integrations } from '../integrations';
import { notify } from '../visits/routes';
import { walletFor } from '../wallet/routes';

const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 3600_000;
/** ACC-07 copy: "It usually takes up to 30 days." */
const EXPORT_DUE_DAYS = 30;

/**
 * PRIV 04 deletion plan. Every table holding customer data is in exactly one bucket, and `carryOutDeletion`
 * below acts on exactly these tables. Wording is shown on ACC-08 and stays Sample until legal review.
 */
export const DELETION_PLAN = {
  delete: [
    { label: 'Your profile, sign-in and devices', tables: ['sessions', 'used_refresh_tokens', 'otp_challenges', 'auth_locks', 'staff_roles'] },
    { label: 'Your preferences and app messages', tables: ['customer_preferences', 'notifications'] },
    { label: 'Visits, booking hand-offs and change requests shown in the app', tables: ['visits', 'booking_handoffs', 'visit_requests'] },
    { label: 'Questions you sent us in the app', tables: ['support_questions', 'balance_help_cases'] },
  ],
  deidentify: [{ label: 'Your customer record: name, mobile number and email removed', tables: ['customers', 'privacy_requests'] }],
  retain: [
    { label: 'Consent records and the staff audit trail, linked only to the removed record', tables: ['consents', 'audit_entries'] },
    { label: 'Promo code use and old-account decisions, linked only to the removed record', tables: ['promo_redemptions', 'legacy_match_cases'] },
    {
      label: 'Payment and tax records (purchases, receipts, refunds, gift cards and the balance ledger) for the period required in BC, linked only to the removed record. [Legal to confirm.]',
      tables: ['orders', 'refunds', 'wallet_instruments', 'ledger_entries'],
    },
    { label: 'Bookings in Fresha are kept by the clinic in Fresha; ask the clinic about them.', tables: [] },
    {
      label: 'If you worked for the clinic: content edits, approvals, uploads, imports and invites you made, linked only to the removed record.',
      tables: ['approvals', 'media', 'catalog_imports', 'staff_invites'],
    },
  ],
} as const;

/** Inbox wording per customer notification template (ACC-04/05). Unknown templates are not shown. */
const INBOX: Record<string, (d: Record<string, string>) => Omit<InboxItem, 'id' | 'createdAt' | 'read'>> = {
  visit_request_submitted: (d) => ({
    title: 'Request sent to the clinic',
    body: `Reference ${d.reference}. The clinic will reply by text; your visit stays as it is until they confirm.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: d.visitId ? 'See your visit' : null,
  }),
  'NTF-03.visit_request_approved': (d) => ({
    title: 'Your change was approved',
    body: `Reference ${d.reference}. Open your visit to see the latest details.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: d.visitId ? 'See your visit' : null,
  }),
  visit_request_declined: (d) => ({
    title: 'The clinic couldn’t make that change',
    body: `Reference ${d.reference}.${d.reason ? ` ${d.reason}` : ''} Your visit stays as it was.`,
    href: d.visitId ? `/visits/${d.visitId}` : null,
    hrefLabel: d.visitId ? 'Need to change it?' : null,
  }),
  visit_request_call_needed: (d) => ({
    title: 'The clinic would like to talk',
    body: `Reference ${d.reference}. They’ll call you, or you can call them.`,
    href: '/support/contact',
    hrefLabel: 'Contact the clinic',
  }),
  payment_receipt: (d) => ({
    title: 'Payment received',
    body: `Reference ${d.reference}. Your receipt is in your Wallet.`,
    href: d.orderId ? `/pay/receipt/${d.orderId}` : null,
    hrefLabel: d.orderId ? 'View receipt' : null,
  }),
  refund_status: (d) => ({
    title: d.status === 'succeeded' ? 'Refund sent' : 'Refund didn’t go through',
    body:
      d.status === 'succeeded'
        ? `Reference ${d.reference}. It can take up to 5 business days to show on your statement.`
        : `Reference ${d.reference}. The clinic will contact you; nothing has been lost.`,
    href: d.orderId ? `/pay/receipt/${d.orderId}` : null,
    hrefLabel: d.orderId ? 'View receipt' : null,
  }),
  gift_scheduled: (d) => ({
    title: `Gift card for ${d.name}`,
    body: 'Paid. We’ll text it at the time you chose.',
    href: d.instrumentId ? `/wallet/gift-cards/${d.instrumentId}` : null,
    hrefLabel: 'See the gift',
  }),
  gift_sent: (d) => ({
    title: `Gift card sent to ${d.name}`,
    body: 'They got a link and a code by text.',
    href: d.instrumentId ? `/wallet/gift-cards/${d.instrumentId}` : null,
    hrefLabel: 'See the gift',
  }),
  gift_claimed: (d) => ({
    title: `${d.name} added your gift card`,
    body: 'It’s now in their Wallet.',
    href: d.instrumentId ? `/wallet/gift-cards/${d.instrumentId}` : null,
    hrefLabel: 'See the gift',
  }),
  'NTF-09.package_session_used': (d) => ({
    title: 'Package session used',
    body: `${d.label}${d.reference ? ` · ${d.reference}` : ''}.`,
    href: d.instrumentId ? `/wallet/packages/${d.instrumentId}` : null,
    hrefLabel: 'See your package',
  }),
  value_used: (d) => ({
    title: 'Balance used at your visit',
    body: `${d.label}${d.reference ? ` · ${d.reference}` : ''}.`,
    href: '/wallet',
    hrefLabel: 'Open Wallet',
  }),
  data_request_received: (d) => ({
    title: 'We’re preparing your data',
    body: `Reference ${d.reference}. We’ll email you when it’s ready, usually within 30 days.`,
    href: '/account/data-request',
    hrefLabel: 'See your request',
  }),
};

type RequestRow = { id: string; reference: string; kind: 'export' | 'delete'; status: PrivacyRequest['status']; created_at: Date; due_at: Date; completed_at: Date | null };
const toRequest = (r: RequestRow): PrivacyRequest => ({
  reference: r.reference,
  kind: r.kind,
  status: r.status,
  createdAt: r.created_at.toISOString(),
  dueAt: r.due_at.toISOString(),
  completedAt: r.completed_at?.toISOString() ?? null,
});
const toDeletion = (r: RequestRow): DeletionStatus => ({
  token: r.id,
  reference: r.reference,
  status: r.status as DeletionStatus['status'],
  dueAt: r.due_at.toISOString(),
  completedAt: r.completed_at?.toISOString() ?? null,
});

/**
 * Carries out one deletion request (PRIV 04). Deletes, deidentifies and retains exactly per DELETION_PLAN, in
 * one transaction, then texts the completion notice to the number that asked (ACC-10 "we'll text you").
 */
export async function carryOutDeletion(db: Db, integrations: Integrations, requestId: string, now: number): Promise<boolean> {
  const phone = await db.transaction(async (tx) => {
    const [r] = await tx.query<{ customer_id: string; status: string }>('SELECT customer_id, status FROM privacy_requests WHERE id = $1 FOR UPDATE', [requestId]);
    if (!r || r.status !== 'pending') return null;
    const id = r.customer_id;
    // Same lock and rule as the team routes: the clinic never ends up without an Owner.
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['staff_roles']);
    if (await isLastOwner(tx, id)) throw new Error('last Owner: deletion waits until another Owner exists');
    const [c] = await tx.query<{ phone_e164: string }>('SELECT phone_e164 FROM customers WHERE id = $1', [id]);
    // delete
    await tx.query('DELETE FROM used_refresh_tokens WHERE session_id IN (SELECT id FROM sessions WHERE customer_id = $1)', [id]);
    await tx.query('DELETE FROM sessions WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM otp_challenges WHERE phone_e164 = $1', [c!.phone_e164]);
    await tx.query('DELETE FROM auth_locks WHERE phone_e164 = $1', [c!.phone_e164]);
    await tx.query('DELETE FROM staff_invites WHERE phone_e164 = $1 AND accepted_at IS NULL', [c!.phone_e164]);
    await tx.query('DELETE FROM staff_roles WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM customer_preferences WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM notifications WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM visit_requests WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM booking_handoffs WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM visits WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM support_questions WHERE customer_id = $1', [id]);
    await tx.query('DELETE FROM balance_help_cases WHERE customer_id = $1', [id]);
    // Gifts this person sent: once delivered, the recipient's number and the message aren't needed in the kept record.
    await tx.query(
      `UPDATE wallet_instruments SET recipient_phone = NULL, message = NULL WHERE buyer_id = $1 AND delivery IN ('sent', 'failed', 'cancelled')`,
      [id],
    );
    await tx.query(`UPDATE orders SET gift = gift - 'recipientPhone' - 'message' WHERE customer_id = $1 AND gift IS NOT NULL`, [id]);
    // deidentify (other retained records still point at this row)
    await tx.query(
      `UPDATE customers SET phone_e164 = 'deleted:' || id::text, first_name = NULL, last_name = NULL, email = NULL,
         match_checked_at = NULL, deleted_at = $2, updated_at = $2 WHERE id = $1`,
      [id, iso(now)],
    );
    // An export still being prepared can no longer be sent anywhere: close it.
    await tx.query(`UPDATE privacy_requests SET status = 'cancelled', cancelled_at = $2 WHERE customer_id = $1 AND kind = 'export' AND status = 'received'`, [
      id,
      iso(now),
    ]);
    await tx.query('UPDATE privacy_requests SET email = NULL WHERE customer_id = $1', [id]);
    // retain: consents, audit_entries, promo_redemptions, legacy_match_cases stay as they are.
    await tx.query(`UPDATE privacy_requests SET status = 'completed', completed_at = $2 WHERE id = $1`, [requestId, iso(now)]);
    return c!.phone_e164;
  });
  if (!phone) return false;
  // After the commit: a failed text never undoes a completed deletion.
  await integrations.messages.send({ channel: 'sms', to: phone, template: 'account_deleted', data: {} }).catch(() => undefined);
  return true;
}

/**
 * Runs every deletion whose grace period has ended. One failing request is reported (by id only) and skipped, so it
 * can never hold up everyone else's deletion. Returns how many were carried out.
 */
/** True when this person holds the only Owner role (D34 needs one Owner to manage the team). */
async function isLastOwner(tx: Queryable, customerId: string): Promise<boolean> {
  const rows = await tx.query<{ customer_id: string }>(`SELECT customer_id FROM staff_roles WHERE role = 'Owner'`);
  return rows.length > 0 && rows.every((r) => r.customer_id === customerId);
}

export async function runDueDeletions(db: Db, integrations: Integrations, now: number, onError?: (requestId: string, err: unknown) => void): Promise<number> {
  const due = await db.query<{ id: string }>(`SELECT id FROM privacy_requests WHERE kind = 'delete' AND status = 'pending' AND due_at <= $1 ORDER BY due_at`, [iso(now)]);
  let done = 0;
  for (const r of due) {
    try {
      if (await carryOutDeletion(db, integrations, r.id, now)) done++;
    } catch (err) {
      onError?.(r.id, err);
    }
  }
  return done;
}

export function registerAccountRoutes(app: FastifyInstance, { now, kit }: { now: () => number; kit: AuthKit }) {
  const { db, integrations } = app;
  const auth = (request: FastifyRequest) => request.auth as AuthContext;
  const signedIn = { preHandler: kit.requireAuth };
  const throttled = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };
  const reference = (prefix: string) => `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;

  async function preferences(customerId: string): Promise<Preferences> {
    const [p] = await db.query<{ reminders: boolean; aftercare: boolean }>('SELECT reminders, aftercare FROM customer_preferences WHERE customer_id = $1', [customerId]);
    const [m] = await db.query<{ granted: boolean }>(
      `SELECT granted FROM consents WHERE customer_id = $1 AND purpose = 'marketing' ORDER BY recorded_at DESC, id DESC LIMIT 1`,
      [customerId],
    );
    return { bookingMessages: true, reminders: p?.reminders ?? true, aftercare: p?.aftercare ?? true, marketing: m?.granted ?? false };
  }

  // ACC-03 (NOTIF 04). Offers are a consent decision, recorded append-only only when it changes.
  app.get('/v1/me/preferences', signedIn, async (request) => preferences(auth(request).customerId));
  app.put('/v1/me/preferences', signedIn, async (request) => {
    const body = preferencesUpdateSchema.parse(request.body);
    const id = auth(request).customerId;
    const t = iso(now());
    const current = await preferences(id);
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO customer_preferences (customer_id, reminders, aftercare, updated_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (customer_id) DO UPDATE SET reminders = EXCLUDED.reminders, aftercare = EXCLUDED.aftercare, updated_at = EXCLUDED.updated_at`,
        [id, body.reminders, body.aftercare, t],
      );
      if (body.marketing !== current.marketing) {
        await tx.query('INSERT INTO consents (customer_id, purpose, granted, version, channel, recorded_at) VALUES ($1, $2, $3, $4, $5, $6)', [
          id,
          'marketing',
          body.marketing,
          CONSENT_VERSIONS.marketing,
          'app',
          t,
        ]);
      }
    });
    return preferences(id);
  });

  // ACC-02 phone change: the number changes only after a code to the NEW number is verified.
  app.post('/v1/me/phone/start', { ...signedIn, ...throttled }, async (request) => {
    const { phone } = phoneChangeStartSchema.parse(request.body);
    return kit.startCode(phone);
  });
  app.post('/v1/me/phone/verify', { ...signedIn, ...throttled }, async (request) => {
    const { challengeId, code } = phoneChangeVerifySchema.parse(request.body);
    const ctx = auth(request);
    const phone = await kit.checkCode(challengeId, code);
    const t = iso(now());
    // Ownership is proven by the code, so saying the number is taken reveals nothing new.
    const taken = new HttpError(409, 'conflict', 'That number belongs to another account. Contact the clinic to merge them.');
    let old: string | null = null;
    try {
      await db.transaction(async (tx) => {
        const [c] = await tx.query<{ phone_e164: string }>('SELECT phone_e164 FROM customers WHERE id = $1 FOR UPDATE', [ctx.customerId]);
        if (c!.phone_e164 === phone) return;
        if ((await tx.query('SELECT 1 FROM customers WHERE phone_e164 = $1', [phone])).length) throw taken;
        await tx.query('UPDATE customers SET phone_e164 = $2, updated_at = $3 WHERE id = $1', [ctx.customerId, phone, t]);
        // Every other device signs in again with the new number.
        await tx.query(`UPDATE sessions SET revoked_at = $3, revoked_reason = 'phone_changed' WHERE customer_id = $1 AND id <> $2 AND revoked_at IS NULL`, [
          ctx.customerId,
          ctx.sessionId,
          t,
        ]);
        await tx.query(
          `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at)
           VALUES ($1, $2, $3, 'phone', $4, $5, 'verified by code', $6, $7)`,
          [ctx.customerId, ctx.roles.join(','), `customer:${ctx.customerId}`, maskPhone(c!.phone_e164), maskPhone(phone), String(request.headers['user-agent'] ?? ''), t],
        );
        old = c!.phone_e164;
      });
    } catch (err) {
      // Two accounts verifying the same new number at once: the unique constraint decides.
      if ((err as { code?: string }).code === '23505') throw taken;
      throw err;
    }
    // The old number hears about it, so a change made from a stolen session doesn't go unnoticed.
    if (old) await integrations.messages.send({ channel: 'sms', to: old, template: 'phone_changed', data: { to: maskPhone(phone) } }).catch(() => undefined);
    return kit.me(ctx);
  });

  // ACC-04/05 (NOTIF 05).
  type NoteRow = { id: string; template: string; data: Record<string, string>; created_at: Date; read_at: Date | null };
  const toItem = (n: NoteRow): InboxItem | null => {
    const render = INBOX[n.template];
    return render ? { id: String(n.id), ...render(n.data), createdAt: n.created_at.toISOString(), read: n.read_at !== null } : null;
  };
  app.get('/v1/me/inbox', signedIn, async (request) => {
    const rows = await db.query<NoteRow>(
      `SELECT id, template, data, created_at, read_at FROM notifications WHERE audience = 'customer' AND customer_id = $1 ORDER BY created_at DESC, id DESC LIMIT 100`,
      [auth(request).customerId],
    );
    const items = rows.map(toItem).filter((i): i is InboxItem => i !== null);
    return { items, unread: items.filter((i) => !i.read).length };
  });
  app.get('/v1/me/inbox/:id', signedIn, async (request) => {
    const { id } = z.object({ id: z.string().regex(/^\d{1,18}$/) }).parse(request.params);
    // Opening a message marks it read; the owner check is in the same statement.
    const [row] = await db.query<NoteRow>(
      `UPDATE notifications SET read_at = COALESCE(read_at, $3) WHERE id = $1 AND audience = 'customer' AND customer_id = $2
       RETURNING id, template, data, created_at, read_at`,
      [id, auth(request).customerId, iso(now())],
    );
    const item = row ? toItem(row) : null;
    if (!item) throw new HttpError(404, 'not_found', 'Message not found.');
    return item;
  });

  // ACC-06 consent history (PRIV 02).
  app.get('/v1/me/consents', signedIn, async (request): Promise<ConsentRecord[]> => {
    const rows = await db.query<{ purpose: ConsentRecord['purpose']; granted: boolean; version: string; channel: string; recorded_at: Date }>(
      'SELECT purpose, granted, version, channel, recorded_at FROM consents WHERE customer_id = $1 ORDER BY recorded_at DESC, id DESC',
      [auth(request).customerId],
    );
    return rows.map((r) => ({ purpose: r.purpose, granted: r.granted, version: r.version, channel: r.channel, recordedAt: r.recorded_at.toISOString() }));
  });

  // ACC-07 (PRIV 08). Tracked request; the export itself is prepared by the clinic (no automatic file yet).
  app.get('/v1/me/data-requests', signedIn, async (request) => {
    const [r] = await db.query<RequestRow>(
      `SELECT * FROM privacy_requests WHERE customer_id = $1 AND kind = 'export' ORDER BY created_at DESC LIMIT 1`,
      [auth(request).customerId],
    );
    return { latest: r ? toRequest(r) : null };
  });
  app.post('/v1/me/data-requests', { ...signedIn, ...throttled }, async (request) => {
    const body = dataRequestCreateSchema.parse(request.body);
    const id = auth(request).customerId;
    const t = now();
    return db.transaction(async (tx) => {
      // Serialized per customer, so two devices or a retry racing the first call can't open two exports.
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`export:${id}`]);
      // A retry, or a second tap while one is being prepared, returns the open request.
      const [open] = await tx.query<RequestRow>(
        `SELECT * FROM privacy_requests WHERE customer_id = $1 AND kind = 'export' AND (status = 'received' OR idempotency_key = $2)
         ORDER BY created_at DESC LIMIT 1`,
        [id, body.idempotencyKey],
      );
      if (open) return toRequest(open);
      const ref = reference('DR');
      const [row] = await tx.query<RequestRow>(
        `INSERT INTO privacy_requests (reference, customer_id, kind, status, channel, email, idempotency_key, created_at, due_at)
         VALUES ($1, $2, 'export', 'received', 'app', $3, $4, $5, $6) RETURNING *`,
        [ref, id, body.email, body.idempotencyKey, iso(t), iso(t + EXPORT_DUE_DAYS * DAY)],
      );
      await notify(tx, { audience: 'staff', permission: 'customers.view', template: 'privacy_request', data: { reference: ref, kind: 'export' }, now: t });
      await notify(tx, { audience: 'customer', customerId: id, template: 'data_request_received', data: { reference: ref }, now: t });
      return toRequest(row!);
    });
  });

  // ACC-08: consequences from the person's real data and the plan above.
  app.get('/v1/me/deletion/preview', signedIn, async (request): Promise<DeletionPreview> => {
    const id = auth(request).customerId;
    const [v] = await db.query<{ count: string; next: Date | null }>(
      `SELECT count(*)::text AS count, min(starts_at) AS next FROM visits
        WHERE customer_id = $1 AND starts_at > $2 AND status IN ('confirmed', 'pending', 'changed')`,
      [id, iso(now())],
    );
    return {
      upcomingVisits: { count: Number(v?.count ?? 0), next: v?.next?.toISOString() ?? null },
      // Value the person would lose access to in the app (from the ledger, never a stored number).
      balances: (await walletFor(db, id, now()))
        .filter((i) => i.role === 'owner' && i.status === 'active')
        .flatMap((i) =>
          i.balanceCents
            ? [{ label: i.kind === 'gift_card' ? `gift card •••• ${i.last4 ?? ''}`.trim() : i.label.toLowerCase(), amountCAD: i.balanceCents / 100 }]
            : i.sessions?.remaining
              ? [{ label: `${i.label} (${i.sessions.remaining} sessions)`, amountCAD: 0 }]
              : [],
        ),
      delete: DELETION_PLAN.delete.map((d) => d.label),
      deidentify: DELETION_PLAN.deidentify.map((d) => d.label),
      retain: DELETION_PLAN.retain.map((d) => d.label),
      graceDays: await graceDays(),
      sample: true,
    };
  });

  async function graceDays(): Promise<number> {
    const [s] = await db.query<{ settings: { deletionGraceDays: number } }>('SELECT settings FROM app_settings WHERE id = 1');
    return s?.settings.deletionGraceDays ?? 30;
  }

  /** Records a deletion for a verified account holder; existing pending request is returned, never stacked. */
  async function requestDeletion(customerId: string, channel: 'app' | 'web', phone: string): Promise<DeletionStatus> {
    const t = now();
    const days = await graceDays();
    const status = await db.transaction(async (tx) => {
      if (await isLastOwner(tx, customerId)) {
        throw new HttpError(409, 'conflict', 'You’re the clinic’s only Owner. Give someone else the Owner role first, then delete your account.');
      }
      const [open] = await tx.query<RequestRow>(`SELECT * FROM privacy_requests WHERE customer_id = $1 AND kind = 'delete' AND status = 'pending'`, [customerId]);
      if (open) return { row: open, created: false };
      const [row] = await tx.query<RequestRow>(
        `INSERT INTO privacy_requests (reference, customer_id, kind, status, channel, created_at, due_at)
         VALUES ($1, $2, 'delete', 'pending', $3, $4, $5) RETURNING *`,
        [reference('DEL'), customerId, channel, iso(t), iso(t + days * DAY)],
      );
      await notify(tx, { audience: 'staff', permission: 'customers.view', template: 'privacy_request', data: { reference: row!.reference, kind: 'delete' }, now: t });
      // Signed out everywhere (ACC-10 "You're signed out"); signing in again during the grace period can cancel.
      await tx.query(`UPDATE sessions SET revoked_at = $2, revoked_reason = 'deletion_requested' WHERE customer_id = $1 AND revoked_at IS NULL`, [customerId, iso(t)]);
      return { row: row!, created: true };
    });
    if (status.created) {
      await integrations.messages.send({ channel: 'sms', to: phone, template: 'deletion_requested', data: { reference: status.row.reference } }).catch(() => undefined);
    }
    return toDeletion(status.row);
  }

  // ACC-09: confirm it's you with a code to the account's own number.
  app.post('/v1/me/deletion/start', { ...signedIn, ...throttled }, async (request) => {
    const [c] = await db.query<{ phone_e164: string }>('SELECT phone_e164 FROM customers WHERE id = $1', [auth(request).customerId]);
    return kit.startCode(c!.phone_e164);
  });
  app.post('/v1/me/deletion', { ...signedIn, ...throttled }, async (request) => {
    const { challengeId, code } = deletionConfirmSchema.parse(request.body);
    const id = auth(request).customerId;
    const phone = await kit.checkCode(challengeId, code);
    const [c] = await db.query<{ phone_e164: string }>('SELECT phone_e164 FROM customers WHERE id = $1', [id]);
    if (c!.phone_e164 !== phone) throw new HttpError(403, 'forbidden', 'Use the code sent to this account’s number.');
    return requestDeletion(id, 'app', phone);
  });
  // Changed your mind (WEB-04: sign in within the grace period to cancel).
  app.post('/v1/me/deletion/cancel', signedIn, async (request) => {
    const ctx = auth(request);
    const t = iso(now());
    const [row] = await db.query<RequestRow>(
      `UPDATE privacy_requests SET status = 'cancelled', cancelled_at = $2 WHERE customer_id = $1 AND kind = 'delete' AND status = 'pending' RETURNING *`,
      [ctx.customerId, t],
    );
    if (!row) throw new HttpError(409, 'conflict', 'There is no deletion to cancel.');
    await db.query(
      `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at)
       VALUES ($1, $2, $3, 'status', 'pending', 'cancelled', 'customer cancelled', $4, $5)`,
      [ctx.customerId, ctx.roles.join(','), `privacy_request:${row.id}`, String(request.headers['user-agent'] ?? ''), t],
    );
    return toDeletion(row);
  });

  // ACC-10 / WEB-04 status after sign-out: by unguessable token only.
  app.get('/v1/privacy/deletion/:token', throttled, async (request) => {
    const { token } = z.object({ token: z.uuid() }).parse(request.params);
    const [row] = await db.query<RequestRow>(`SELECT * FROM privacy_requests WHERE id = $1 AND kind = 'delete'`, [token]);
    if (!row) throw new HttpError(404, 'not_found', 'Request not found.');
    return toDeletion(row);
  });

  // WEB-03 contract (Google Play web deletion route; the page itself ships in NANO-11). Same code limits as sign-in.
  app.post('/v1/privacy/deletion/start', throttled, async (request) => {
    const { phone } = webDeletionStartSchema.parse(request.body);
    return kit.startCode(phone);
  });
  app.post('/v1/privacy/deletion/confirm', throttled, async (request) => {
    const { challengeId, code } = deletionConfirmSchema.parse(request.body);
    const phone = await kit.checkCode(challengeId, code);
    // The code proves the number is theirs, so "no account" reveals nothing about anyone else.
    const [c] = await db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1 AND deleted_at IS NULL', [phone]);
    if (!c) throw new HttpError(404, 'not_found', 'No Nano Beauty account uses this number.');
    return requestDeletion(c.id, 'web', phone);
  });
}
