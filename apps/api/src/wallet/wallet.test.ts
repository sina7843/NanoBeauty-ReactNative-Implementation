import {
  attemptSchema,
  giftLookupSchema,
  historyResponseSchema,
  instrumentDetailSchema,
  methodsResponseSchema,
  orderSchema,
  otpVerifyResponseSchema,
  receiptSchema,
  walletSchema,
} from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';
import { dueGiftIds } from './routes';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const MARIA = ['6045550123', '+16045550123'] as const;
const SARA = ['6045550157', '+16045550157'] as const;
const DESK = ['7785550100', '+17785550100'] as const;
const OWNER = ['7785550111', '+17785550111'] as const;

async function setup(methods: Record<string, boolean> = { card: true, applePay: false, googlePay: false, klarna: false, affirm: false }) {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec(
    'TRUNCATE balance_help_cases, ledger_entries, wallet_instruments, refunds, provider_events, payment_attempts, orders, privacy_requests, customer_preferences, notifications, visit_requests, booking_handoffs, visits, audit_entries, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, support_questions, promo_redemptions, legacy_match_cases, customers CASCADE;',
  );
  await db.query(`UPDATE app_settings SET settings = jsonb_set(settings, '{paymentMethods}', $1::jsonb) WHERE id = 1`, [JSON.stringify(methods)]);
  await db.exec(`UPDATE packages SET status = 'live' WHERE id <> 'pkg_laser_fullleg_6';`);
  const clock = { t: Date.parse('2026-10-06T17:00:00Z') };
  const dev = createDevIntegrations({ now: () => clock.t });
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { now: () => clock.t, devOtpSink: dev.otpSink } });
  close = () => app.close();
  const req = (method: 'GET' | 'POST', url: string, token?: string, payload?: object) =>
    app.inject({ method, url, ...(payload ? { payload } : {}), headers: token ? { authorization: `Bearer ${token}` } : {} });
  async function signIn(phone: string, e164: string, role?: string) {
    clock.t += 31_000;
    const { challengeId } = (await req('POST', '/v1/auth/otp/start', undefined, { phone })).json();
    const token = otpVerifyResponseSchema.parse((await req('POST', '/v1/auth/otp/verify', undefined, { challengeId, code: dev.otpSink.get(e164)! })).json()).accessToken;
    if (role) await db.query(`INSERT INTO staff_roles (customer_id, role) SELECT id, $2 FROM customers WHERE phone_e164 = $1 ON CONFLICT DO NOTHING`, [e164, role]);
    return token;
  }
  const order = async (token: string, body: object, key = 'order-key-1') => orderSchema.parse((await req('POST', '/v1/orders', token, { ...body, idempotencyKey: key })).json());
  const attempt = async (token: string, orderId: string, method = 'card', key = 'attempt-key-1') =>
    attemptSchema.parse((await req('POST', `/v1/orders/${orderId}/attempts`, token, { method, idempotencyKey: key })).json());
  const confirm = async (token: string, attemptId: string, paymentToken: string) =>
    attemptSchema.parse((await req('POST', `/v1/payments/attempts/${attemptId}/confirm`, token, { paymentToken })).json());
  const wallet = async (token: string) => walletSchema.parse((await req('GET', '/v1/wallet', token)).json());
  const providerRef = async (attemptId: string) => (await db.query<{ provider_ref: string }>('SELECT provider_ref FROM payment_attempts WHERE id = $1', [attemptId]))[0]!.provider_ref;
  const webhook = (ref: string, eventId?: string) => {
    const { body, signature } = dev.paymentControl.webhook(ref, eventId);
    return app.inject({ method: 'POST', url: '/v1/payments/webhook', payload: body, headers: { 'content-type': 'application/json', 'x-provider-signature': signature } });
  };
  const ledgerCount = async () => Number((await db.query<{ n: string }>('SELECT count(*)::text AS n FROM ledger_entries'))[0]!.n);
  return { app, db, dev, clock, req, signIn, order, attempt, confirm, wallet, providerRef, webhook, ledgerCount };
}

const PACKAGE = { kind: 'package', packageId: 'pkg_sqt_4' };
const gift = (over: object = {}) => ({
  kind: 'gift',
  gift: { design: 'birthday', amountCents: 10000, recipientName: 'Sara', recipientPhone: SARA[0], message: 'Happy birthday!', sendAt: null, ...over },
});

describe('orders and methods (PAY 05, PAY 12–14)', () => {
  it('orders are idempotent; only live packages and allowed gift values can be bought', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const a = await t.order(token, PACKAGE);
    expect(a).toMatchObject({ kind: 'package', amountCents: 120000, status: 'pending', title: 'SQT Bio-Microneedling · 4 sessions' });
    expect((await t.order(token, PACKAGE)).id).toBe(a.id);
    const bad = (body: object, key: string) => t.req('POST', '/v1/orders', token, { ...body, idempotencyKey: key });
    expect((await bad({ kind: 'package', packageId: 'pkg_laser_fullleg_6' }, 'k-unavailable')).statusCode).toBe(409);
    expect((await bad(gift({ amountCents: 60000 }), 'k-too-much')).statusCode).toBe(400); // over $500
    expect((await bad(gift({ amountCents: 3000 }), 'k-custom-ok')).statusCode).toBe(200); // $30 custom is fine
    expect((await bad(gift({ design: 'halloween' }), 'k-design')).statusCode).toBe(400);
    expect((await t.req('GET', '/v1/packages')).json().map((p: { id: string }) => p.id)).toContain('pkg_laser_fullleg_6'); // "Back soon"
  });

  it('lists only methods switched on AND supported, wallets first; financing never promises approval', async () => {
    const t = await setup({ card: true, applePay: true, googlePay: false, klarna: true, affirm: true });
    const token = await t.signIn(...MARIA);
    const big = await t.order(token, PACKAGE);
    const m = methodsResponseSchema.parse((await t.req('GET', `/v1/orders/${big.id}/methods`, token)).json()).methods;
    expect(m.map((x) => x.method)).toEqual(['apple_pay', 'card', 'klarna', 'affirm']);
    expect(m.find((x) => x.method === 'klarna')).toMatchObject({ available: true, note: 'Subject to approval by the provider' });
    const small = await t.order(token, gift({ amountCents: 3000 }), 'small-gift');
    const sm = methodsResponseSchema.parse((await t.req('GET', `/v1/orders/${small.id}/methods`, token)).json()).methods;
    expect(sm.find((x) => x.method === 'affirm')).toMatchObject({ available: false, note: 'Not offered for this amount' });
    expect((await t.req('POST', `/v1/orders/${small.id}/attempts`, token, { method: 'klarna', idempotencyKey: 'klarna-small' })).statusCode).toBe(409);
    expect((await t.req('POST', `/v1/orders/${small.id}/attempts`, token, { method: 'google_pay', idempotencyKey: 'gpay-off' })).statusCode).toBe(409);
  });
});

describe('payment lifecycle (PAY 06, PAY 07) with the deterministic provider', () => {
  it('success: paid once, value lands once, receipt itemised; repeats and duplicate webhooks change nothing', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const o = await t.order(token, PACKAGE);
    const a = await t.attempt(token, o.id);
    expect(a.status).toBe('requires_action');
    const paid = await t.confirm(token, a.id, 'tok_visa');
    expect(paid).toMatchObject({ status: 'succeeded', methodLabel: 'Visa •••• 4242' });
    expect(await t.confirm(token, a.id, 'tok_visa')).toMatchObject({ status: 'succeeded' });
    const ref = await t.providerRef(a.id);
    expect((await t.webhook(ref, 'evt_1')).json()).toEqual({ received: true, duplicate: false });
    expect((await t.webhook(ref, 'evt_1')).json()).toEqual({ received: true, duplicate: true });
    expect(await t.ledgerCount()).toBe(1);
    const w = await t.wallet(token);
    expect(w.instruments).toHaveLength(1);
    expect(w.instruments[0]).toMatchObject({ kind: 'package', status: 'active', sessions: { total: 4, used: 0, remaining: 4 } });
    expect(w.instruments[0]!.expiresAt!.startsWith('2027-10-06')).toBe(true); // 12 months
    const receipt = receiptSchema.parse((await t.req('GET', `/v1/receipts/${o.id}`, token)).json());
    expect(receipt).toMatchObject({ status: 'paid', totalCents: 120000, taxIncludedCents: 5714, methodLabel: 'Visa •••• 4242', reference: paid.reference });
    expect((await t.req('POST', `/v1/orders/${o.id}/attempts`, token, { method: 'card', idempotencyKey: 'after-paid' })).statusCode).toBe(409);
    // A forged webhook is refused.
    expect((await t.app.inject({ method: 'POST', url: '/v1/payments/webhook', payload: '{"eventId":"x","providerRef":"y","type":"payment.updated"}', headers: { 'content-type': 'application/json', 'x-provider-signature': 'nope' } })).statusCode).toBe(400);
  });

  it('decline keeps the order open; a retry with another card pays once', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const o = await t.order(token, PACKAGE);
    const a = await t.attempt(token, o.id);
    expect(await t.confirm(token, a.id, 'tok_insufficient')).toMatchObject({ status: 'declined', failureReason: 'insufficient_funds' });
    expect((await t.req('GET', `/v1/orders/${o.id}`, token)).json().status).toBe('pending');
    expect(await t.ledgerCount()).toBe(0);
    const b = await t.attempt(token, o.id, 'card', 'attempt-key-2');
    expect(await t.confirm(token, b.id, 'tok_visa')).toMatchObject({ status: 'succeeded' });
    expect(await t.ledgerCount()).toBe(1);
  });

  it('timeout: stays "checking" (never failed or paid on a guess) until the provider answers, by webhook or by polling', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const o = await t.order(token, PACKAGE);
    const a = await t.attempt(token, o.id);
    expect(await t.confirm(token, a.id, 'tok_timeout')).toMatchObject({ status: 'processing' });
    expect((await t.req('GET', `/v1/payments/attempts/${a.id}`, token)).json().status).toBe('processing');
    expect(await t.ledgerCount()).toBe(0);
    const ref = await t.providerRef(a.id);
    t.dev.paymentControl.settle(ref, 'succeeded');
    await t.webhook(ref);
    expect((await t.req('GET', `/v1/payments/attempts/${a.id}`, token)).json().status).toBe('succeeded');
    expect((await t.wallet(token)).instruments).toHaveLength(1);
  });

  it('Klarna: hosted page; leaving it cancels with nothing charged; the order stays payable', async () => {
    const t = await setup({ card: true, applePay: false, googlePay: false, klarna: true, affirm: false });
    const token = await t.signIn(...MARIA);
    const o = await t.order(token, PACKAGE);
    const a = await t.attempt(token, o.id, 'klarna');
    expect(a.redirectUrl).toMatch(/^https:\/\/pay\.example\.invalid\/klarna\//);
    expect((await t.req('POST', `/v1/payments/attempts/${a.id}/cancel`, token)).json()).toMatchObject({ status: 'cancelled', failureReason: 'cancelled' });
    expect((await t.req('GET', `/v1/orders/${o.id}`, token)).json().status).toBe('pending');
  });

  it('a second successful charge for an already-paid order is refunded automatically, and value lands once', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const o = await t.order(token, PACKAGE);
    const a = await t.attempt(token, o.id);
    await t.confirm(token, a.id, 'tok_visa');
    // A stray second intent the provider also charged (e.g. a lost cancel): simulate it directly.
    const intent = await t.dev.integrations.payments.createIntent({ idempotencyKey: 'stray', amountCents: 120000, context: 'package', method: 'card' });
    await t.db.query(
      `INSERT INTO payment_attempts (reference, order_id, method, provider_ref, status, amount_cents, idempotency_key, created_at, updated_at)
       VALUES ('PAY-STRAY1', $1, 'card', $2, 'processing', 120000, 'stray-key', now(), now())`,
      [o.id, intent.providerRef],
    );
    t.dev.paymentControl.settle(intent.providerRef, 'succeeded');
    await t.webhook(intent.providerRef);
    const refunds = await t.db.query<{ amount_cents: number; status: string; reason: string }>('SELECT amount_cents, status, reason FROM refunds');
    expect(refunds).toEqual([{ amount_cents: 120000, status: 'succeeded', reason: 'Duplicate payment, returned automatically' }]);
    expect(await t.ledgerCount()).toBe(1);
    expect((await t.wallet(token)).instruments[0]!.sessions!.remaining).toBe(4);
  });
});

describe('refunds (PAY 09)', () => {
  it('partial and full refunds take unused value first, show on the receipt, never exceed what was paid, and a failed refund puts value back', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const owner = await t.signIn(...OWNER, 'Owner');
    const desk = await t.signIn(...DESK, 'Front desk');
    const o = await t.order(token, gift({ recipientPhone: MARIA[0], recipientName: 'Me' }));
    const a = await t.attempt(token, o.id);
    await t.confirm(token, a.id, 'tok_visa');
    const refund = (who: string, amountCents: number, key: string) => t.req('POST', `/v1/staff/payments/${a.id}/refunds`, who, { amountCents, reason: 'Customer asked', idempotencyKey: key });
    expect((await refund(desk, 1000, 'refund-desk')).statusCode).toBe(403);
    expect((await refund(owner, 4000, 'refund-key-1')).json()).toMatchObject({ status: 'succeeded' });
    expect((await refund(owner, 4000, 'refund-key-1')).json().status).toBe('succeeded'); // same key, same refund
    expect((await refund(owner, 7000, 'refund-key-2')).statusCode).toBe(409); // only 60.00 left to refund
    const receipt = receiptSchema.parse((await t.req('GET', `/v1/receipts/${o.id}`, token)).json());
    expect(receipt.status).toBe('partially_refunded');
    expect(receipt.refunds).toEqual([expect.objectContaining({ amountCents: 4000, status: 'succeeded' })]);
    // A provider failure returns the held value.
    t.dev.integrations.payments.refund = async () => ({ refundRef: 'dev_re_fail', status: 'failed' });
    expect((await refund(owner, 1000, 'refund-key-3')).json().status).toBe('failed');
    const sums = await t.db.query<{ total: string }>('SELECT SUM(amount_cents)::text AS total FROM ledger_entries');
    expect(Number(sums[0]!.total)).toBe(6000); // 100 − 40 refunded; the failed 10 came back
  });
});

describe('review hardening', () => {
  it('a webhook that fails mid-processing is not swallowed: the provider retry is processed', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const o = await t.order(token, PACKAGE);
    const a = await t.attempt(token, o.id);
    await t.confirm(token, a.id, 'tok_timeout');
    const ref = await t.providerRef(a.id);
    t.dev.paymentControl.settle(ref, 'succeeded');
    const real = t.dev.integrations.payments.getStatus;
    t.dev.integrations.payments.getStatus = async () => {
      throw new Error('provider down');
    };
    expect((await t.webhook(ref, 'evt_retry')).statusCode).toBe(500);
    t.dev.integrations.payments.getStatus = real;
    expect((await t.webhook(ref, 'evt_retry')).json()).toEqual({ received: true, duplicate: false });
    expect((await t.wallet(token)).instruments).toHaveLength(1);
  });

  it('package refunds are whole sessions at the price paid; a refund the provider never answered is retried', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const owner = await t.signIn(...OWNER, 'Owner');
    const o = await t.order(token, PACKAGE); // $1,200 for 4 sessions = $300 each
    const a = await t.attempt(token, o.id);
    await t.confirm(token, a.id, 'tok_visa');
    await t.db.exec(`UPDATE packages SET price_cents = 100000 WHERE id = 'pkg_sqt_4';`); // price changes later
    const refund = (amountCents: number, key: string) => t.req('POST', `/v1/staff/payments/${a.id}/refunds`, owner, { amountCents, reason: 'Moving away', idempotencyKey: key });
    expect((await refund(100, 'refund-part-cents')).statusCode).toBe(409); // not a whole session
    const realRefund = t.dev.integrations.payments.refund;
    t.dev.integrations.payments.refund = async () => {
      throw new Error('provider timeout');
    };
    expect((await refund(30000, 'refund-one-session')).json().status).toBe('pending');
    expect((await t.wallet(token)).instruments[0]!.sessions!.remaining).toBe(3); // held while pending
    t.dev.integrations.payments.refund = realRefund;
    const [pending] = await t.db.query<{ id: string }>(`SELECT id FROM refunds WHERE status = 'pending'`);
    await t.app.jobs.wallet!.retryRefund(pending!.id);
    expect((await t.db.query(`SELECT status FROM refunds`))[0]).toEqual({ status: 'succeeded' });
    expect(receiptSchema.parse((await t.req('GET', `/v1/receipts/${o.id}`, token)).json()).status).toBe('partially_refunded');
  });

  it('a replayed adjustment returns the first result; customers see the label, never the staff reason', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const owner = await t.signIn(...OWNER, 'Owner');
    const [{ id }] = (await t.db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1', [MARIA[1]])) as [{ id: string }];
    const adjust = (amountCents: number, key: string) =>
      t.req('POST', '/v1/staff/adjustments', owner, { customerId: id, amountCents, label: 'Late cancellation credit', reason: 'Fresha NB-20418 cancelled at 2 h, policy says credit', idempotencyKey: key });
    await adjust(4000, 'adjust-key-a');
    expect((await adjust(-4000, 'adjust-key-b')).json().balanceCents).toBe(0);
    expect((await adjust(-4000, 'adjust-key-b')).json().balanceCents).toBe(0); // replay, not a 409
    expect(await t.db.query('SELECT 1 FROM audit_entries')).toHaveLength(2);
    const credit = (await t.wallet(maria)).instruments[0]!;
    const lines = instrumentDetailSchema.parse((await t.req('GET', `/v1/wallet/instruments/${credit.id}`, maria)).json()).lines;
    expect(lines.map((l) => l.label)).toEqual(['Late cancellation credit', 'Late cancellation credit']);
    expect(JSON.stringify(lines)).not.toContain('policy says');
    expect((await t.req('POST', '/v1/staff/adjustments', owner, { instrumentId: 'not-a-uuid', amountCents: 100, reason: 'x x x', idempotencyKey: 'adjust-key-c' })).statusCode).toBe(400);
  });

  it('the scheduled-send job and "send now" can’t double-send a gift', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const o = await t.order(maria, gift({ sendAt: '2026-10-06T18:00:00.000Z' }));
    await t.confirm(maria, (await t.attempt(maria, o.id)).id, 'tok_visa');
    const id = (await t.wallet(maria)).instruments[0]!.id;
    t.clock.t = Date.parse('2026-10-06T18:01:00Z');
    await Promise.all([t.app.jobs.wallet!.deliverGift(id), t.app.jobs.wallet!.deliverGift(id)]);
    expect(t.dev.outbox.filter((m) => m.template === 'NTF-07.gift_received')).toHaveLength(1);
  });
});

describe('gift cards (WALT 01–04, 13, 14)', () => {
  it('pay → text with a code → recipient claims; sender sees delivery, not spending; codes are single-owner', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const o = await t.order(maria, gift());
    await t.confirm(maria, (await t.attempt(maria, o.id)).id, 'tok_visa');
    const sms = t.dev.outbox.find((m) => m.template === 'NTF-07.gift_received')!;
    expect(sms).toMatchObject({ channel: 'sms', to: SARA[1] });
    const code = sms.data.code!;
    expect(sms.data.link).toBe(`https://app.nanobeautystar.com/gift/${code}`);
    expect(await t.db.query('SELECT 1 FROM wallet_instruments WHERE code_hash = $1', [code])).toEqual([]); // only a hash is stored

    expect(giftLookupSchema.parse((await t.req('POST', '/v1/gifts/lookup', undefined, { code })).json())).toMatchObject({
      state: 'valid',
      amountCents: 10000,
      recipientName: 'Sara',
      fromName: null,
      message: 'Happy birthday!',
    });
    const sara = await t.signIn(...SARA);
    expect((await t.req('POST', '/v1/gifts/claim', sara, { code: code.toLowerCase() })).json().state).toBe('claimed');
    expect((await t.wallet(sara)).instruments[0]).toMatchObject({ kind: 'gift_card', role: 'owner', balanceCents: 10000, last4: code.slice(-4) });
    const sent = (await t.wallet(maria)).instruments[0]!;
    expect(sent).toMatchObject({ role: 'sender', balanceCents: null });
    expect(sent.gift).toMatchObject({ delivery: 'sent', recipientName: 'Sara' });
    expect(instrumentDetailSchema.parse((await t.req('GET', `/v1/wallet/instruments/${sent.id}`, maria)).json()).lines).toEqual([]);
    const desk = await t.signIn(...DESK);
    expect((await t.req('POST', '/v1/gifts/claim', desk, { code })).statusCode).toBe(409);
    expect((await t.req('POST', '/v1/gifts/lookup', undefined, { code })).json()).toMatchObject({ state: 'claimed', amountCents: null });
    expect((await t.req('POST', '/v1/gifts/lookup', undefined, { code: 'ZZZZZZZZZZZZ' })).json().state).toBe('notfound');
  });

  it('scheduled send waits for its time; the buyer can move it; web claim works after a code to the recipient', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const o = await t.order(maria, gift({ sendAt: '2026-12-24T17:00:00.000Z' }));
    await t.confirm(maria, (await t.attempt(maria, o.id)).id, 'tok_visa');
    expect(t.dev.outbox.some((m) => m.template === 'NTF-07.gift_received')).toBe(false);
    const id = (await t.wallet(maria)).instruments[0]!.id;
    expect(await dueGiftIds(t.db, t.clock.t)).toEqual([]);
    expect((await t.req('POST', `/v1/wallet/gifts/${id}/send-time`, maria, { sendAt: null })).statusCode).toBe(200); // send now
    const code = t.dev.outbox.find((m) => m.template === 'NTF-07.gift_received')!.data.code!;
    t.clock.t += 31_000;
    const start = (await t.req('POST', '/v1/gifts/claim/start', undefined, { code, phone: SARA[0] })).json();
    expect(start.state).toBe('valid');
    const claimed = (await t.req('POST', '/v1/gifts/claim/confirm', undefined, { code, challengeId: start.challenge.challengeId, otp: t.dev.otpSink.get(SARA[1]) })).json();
    expect(claimed).toMatchObject({ state: 'claimed' });
    // Resend after a claim is refused (the card is someone's now).
    expect((await t.req('POST', `/v1/wallet/gifts/${id}/resend`, maria)).statusCode).toBe(409);
  });
});

describe('counter redemption and adjustments (WALT 07, 10, 15)', () => {
  it('front desk uses a session once per confirm; never more than remains; never their own', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const o = await t.order(maria, PACKAGE);
    await t.confirm(maria, (await t.attempt(maria, o.id)).id, 'tok_visa');
    const pkg = (await t.wallet(maria)).instruments[0]!;
    const desk = await t.signIn(...DESK, 'Front desk');
    const redeem = (sessions: number, key: string, who = desk) => t.req('POST', '/v1/staff/redemptions', who, { instrumentId: pkg.id, sessions, reference: 'NB-20418', idempotencyKey: key });
    expect((await redeem(1, 'redeem-key-1')).json().sessions).toEqual({ total: 4, used: 1, remaining: 3 });
    expect((await redeem(1, 'redeem-key-1')).json().sessions.remaining).toBe(3); // retried confirm
    expect((await redeem(5, 'redeem-key-2')).statusCode).toBe(409);
    expect((await t.req('GET', `/v1/staff/lookup?phone=${MARIA[0]}`, desk)).json().instruments[0].sessions.remaining).toBe(3);
    const history = historyResponseSchema.parse((await t.req('GET', '/v1/wallet/history', maria)).json());
    expect(history.map((h) => h.title)).toEqual(['Used at your visit', 'SQT Bio-Microneedling · 4 sessions']);
    // Expired packages can't be used.
    t.clock.t += 400 * 24 * 3600_000;
    const desk2 = await t.signIn(...DESK);
    expect((await redeem(1, 'redeem-key-3', desk2)).statusCode).toBe(409);
  });

  it('only the Owner issues credit; balances never go below zero; every change is audited', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const desk = await t.signIn(...DESK, 'Front desk');
    const owner = await t.signIn(...OWNER, 'Owner');
    const [{ id }] = (await t.db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1', [MARIA[1]])) as [{ id: string }];
    const issue = (who: string, amountCents: number, key: string) => t.req('POST', '/v1/staff/adjustments', who, { customerId: id, amountCents, reason: 'Late cancellation credit', idempotencyKey: key });
    expect((await issue(desk, 4000, 'adjust-key-1')).statusCode).toBe(403);
    expect((await issue(owner, 4000, 'adjust-key-2')).json()).toMatchObject({ kind: 'credit', balanceCents: 4000 });
    expect((await issue(owner, -5000, 'adjust-key-3')).statusCode).toBe(409);
    expect((await t.wallet(maria)).instruments[0]).toMatchObject({ kind: 'credit', balanceCents: 4000 });
    expect(await t.db.query('SELECT field, old_value, new_value FROM audit_entries')).toEqual([{ field: 'balance', old_value: '0', new_value: '4000' }]);
    // The ledger is append-only.
    await expect(t.db.exec('UPDATE ledger_entries SET amount_cents = 999999')).rejects.toThrow();
  });

  it('balance help gets a reference and changes nothing', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const o = await t.order(maria, PACKAGE);
    await t.confirm(maria, (await t.attempt(maria, o.id)).id, 'tok_visa');
    const id = (await t.wallet(maria)).instruments[0]!.id;
    const ask = () => t.req('POST', '/v1/wallet/help', maria, { instrumentId: id, expected: 'I thought it had 5 left', idempotencyKey: 'help-key-1' });
    const first = (await ask()).json().reference;
    expect(first).toMatch(/^BH-/);
    expect((await ask()).json().reference).toBe(first);
    expect(await t.ledgerCount()).toBe(1);
  });
});
