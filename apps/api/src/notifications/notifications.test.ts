import { NTF_IDS, otpVerifyResponseSchema, redactText } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';
import { notify } from '../visits/routes';
import { deliverPushMessages, dispatchDue, queueReminders } from './dispatch';
import { DELIVERY, render } from './templates';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const CUSTOMER = ['6045550123', '+16045550123'] as const;
const OTHER = ['6045550144', '+16045550144'] as const;
const OWNER = ['7785550111', '+17785550111'] as const;
const EDITOR = ['7785550122', '+17785550122'] as const;
// 10:00 Pacific (17:00 UTC): outside quiet hours.
const DAY = Date.parse('2026-10-06T17:00:00Z');
// 23:00 Pacific: inside quiet hours (9 pm–8 am).
const NIGHT = Date.parse('2026-10-07T06:00:00Z');

async function setup(options: { sampleFresha?: boolean } = {}) {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec(
    'TRUNCATE push_messages, staff_invites, catalog_imports, media, approvals, balance_help_cases, ledger_entries, wallet_instruments, refunds, provider_events, payment_attempts, orders, privacy_requests, customer_preferences, notifications, visit_requests, booking_handoffs, visits, audit_entries, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, support_questions, promo_redemptions, legacy_match_cases, customers CASCADE;',
  );
  await db.exec(`UPDATE app_settings SET settings = settings || '{"reminderSender": "fresha", "bookingMode": "handoff"}'::jsonb WHERE id = 1;`);
  const clock = { t: DAY };
  const dev = createDevIntegrations({ now: () => clock.t, sampleFresha: options.sampleFresha });
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { now: () => clock.t, devOtpSink: dev.otpSink } });
  close = () => app.close();
  const req = (method: 'GET' | 'POST' | 'PUT', url: string, token?: string, payload?: object) =>
    app.inject({ method, url, ...(payload ? { payload } : {}), headers: token ? { authorization: `Bearer ${token}` } : {} });
  async function signIn(phone: string, e164: string, role?: string) {
    clock.t += 31_000;
    if (role) {
      await db.query(`INSERT INTO customers (phone_e164, first_name) VALUES ($1, $2) ON CONFLICT (phone_e164) DO NOTHING`, [e164, role]);
      await db.query(`INSERT INTO staff_roles (customer_id, role) SELECT id, $2 FROM customers WHERE phone_e164 = $1 ON CONFLICT DO NOTHING`, [e164, role]);
    }
    const { challengeId } = (await req('POST', '/v1/auth/otp/start', undefined, { phone })).json();
    return otpVerifyResponseSchema.parse((await req('POST', '/v1/auth/otp/verify', undefined, { challengeId, code: dev.otpSink.get(e164)! })).json()).accessToken;
  }
  const idOf = async (e164: string) => (await db.query<{ id: string }>('SELECT id FROM customers WHERE phone_e164 = $1', [e164]))[0]!.id;
  const deliveries = async () =>
    db.query<{ template: string; channel: string; status: string; reason: string | null }>(
      'SELECT n.template, d.channel, d.status, d.reason FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id ORDER BY d.id',
    );
  const sent = (channel: string) => dev.outbox.filter((m) => m.channel === channel);
  return { db, dev, clock, req, signIn, idOf, deliveries, sent };
}

describe('templates (spec 3, NOTIF 06)', () => {
  it('every outbox template renders with an in-app destination; NTF-01–12 are all covered', () => {
    const covered = new Set(Object.values(DELIVERY).map((d) => d.ntf));
    // NTF-07 (gift received) is sent straight to the recipient when the code is made, never stored in the outbox.
    expect(NTF_IDS.filter((id) => id !== 'NTF-07' && !covered.has(id))).toEqual([]);
    for (const template of Object.keys(DELIVERY)) {
      const msg = render(template, { visitId: 'v1', instrumentId: 'i1', orderId: 'o1', requestId: 'r1', reference: 'NB-1', service: 'HIFU', when: 'Fri 16 Oct', label: 'SQT', name: 'Sara', item: 'HIFU', status: 'succeeded', message: 'Hi' });
      expect(msg, template).not.toBeNull();
      expect(msg!.href ?? '/', template).toMatch(/^\//);
    }
  });
});

describe('dispatcher (NOTIF 01, 05; delivery state)', () => {
  it('sends each approved channel once, records what was skipped, and keeps the inbox copy', async () => {
    const t = await setup();
    const token = await t.signIn(...CUSTOMER);
    expect((await t.req('POST', '/v1/me/devices', token, { token: 'ExponentPushToken[abc123]', platform: 'ios' })).statusCode).toBe(200);
    const id = await t.idOf(CUSTOMER[1]);
    await notify(t.db, { audience: 'customer', customerId: id, template: 'payment_receipt', data: { reference: 'PAY-1', orderId: 'o1' }, now: t.clock.t });
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    await dispatchDue(t.db, t.dev.integrations, t.clock.t); // a second run sends nothing more
    expect(await t.deliveries()).toEqual([
      { template: 'payment_receipt', channel: 'email', status: 'skipped', reason: 'no_email' },
      { template: 'payment_receipt', channel: 'push', status: 'sent', reason: null },
    ]);
    expect(t.sent('push')).toHaveLength(1);
    expect(t.sent('push')[0]!.data).toMatchObject({ title: 'Payment received', href: '/pay/receipt/o1' });
    expect((await t.req('GET', '/v1/me/inbox', token)).json().items[0].title).toBe('Payment received');
  });

  it('a failed send is recorded as failed, not sent', async () => {
    const t = await setup();
    const token = await t.signIn(...CUSTOMER);
    await t.req('POST', '/v1/me/devices', token, { token: 'ExponentPushToken[abc123]', platform: 'android' });
    t.dev.integrations.messages.send = async () => {
      throw new Error('down');
    };
    await notify(t.db, { audience: 'customer', customerId: await t.idOf(CUSTOMER[1]), template: 'value_used', data: { label: 'Credit' }, now: t.clock.t });
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    expect(await t.deliveries()).toEqual([{ template: 'value_used', channel: 'push', status: 'failed', reason: 'provider_error' }]);
  });

  it('quiet hours hold texts and non-urgent pushes until morning; urgent ones and email go now', async () => {
    const t = await setup();
    const token = await t.signIn(...CUSTOMER);
    await t.req('POST', '/v1/me/devices', token, { token: 'ExponentPushToken[abc123]', platform: 'ios' });
    const id = await t.idOf(CUSTOMER[1]);
    t.clock.t = NIGHT;
    await notify(t.db, { audience: 'customer', customerId: id, template: 'visit_request_declined', data: { reference: 'NB-R1', visitId: 'v1' }, now: t.clock.t });
    await notify(t.db, { audience: 'customer', customerId: id, template: 'NTF-09.package_session_used', data: { label: 'SQT' }, now: t.clock.t });
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    expect((await t.deliveries()).map((d) => d.template)).toEqual(['NTF-09.package_session_used']);
    t.clock.t = NIGHT + 10 * 3600_000; // 9:00 Pacific
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    expect(await t.deliveries()).toEqual(
      expect.arrayContaining([
        { template: 'visit_request_declined', channel: 'push', status: 'sent', reason: null },
        { template: 'visit_request_declined', channel: 'sms', status: 'sent', reason: null },
      ]),
    );
  });

  it('staff notices go to people holding the permission; approval outcomes to the submitter only', async () => {
    const t = await setup();
    const owner = await t.signIn(...OWNER, 'Owner');
    const editor = await t.signIn(...EDITOR, 'Editor');
    await t.req('POST', '/v1/me/devices', owner, { token: 'ExponentPushToken[owner]', platform: 'ios' });
    await t.req('POST', '/v1/me/devices', editor, { token: 'ExponentPushToken[editor]', platform: 'ios' });
    await notify(t.db, { audience: 'staff', permission: 'content.publish', template: 'NTF-12.approval_needed', data: { item: 'HIFU' }, now: t.clock.t });
    await notify(t.db, { audience: 'staff', permission: 'content.draft', template: 'approval_sent_back', data: { item: 'HIFU', reason: 'Price', submitter: await t.idOf(EDITOR[1]) }, now: t.clock.t });
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    expect(t.sent('push').map((m) => [m.to, m.data.title])).toEqual([
      ['ExponentPushToken[owner]', 'Approval needed'],
      ['ExponentPushToken[editor]', 'Sent back to you'],
    ]);
  });
});

describe('one reminder sender (NOTIF 02, 07)', () => {
  async function visit(t: Awaited<ReturnType<typeof setup>>, hoursAhead: number) {
    await t.db.query(
      `INSERT INTO visits (customer_id, external_ref, source, service_name, starts_at, status, synced_at, first_seen_at) VALUES ($1, 'FR-9', 'fresha_sync', 'HIFU', $2, 'confirmed', $3, $3)`,
      [await t.idOf(CUSTOMER[1]), new Date(t.clock.t + hoursAhead * 3600_000).toISOString(), new Date(t.clock.t).toISOString()],
    );
  }
  const reminders = async (t: Awaited<ReturnType<typeof setup>>) => (await t.db.query(`SELECT 1 FROM notifications WHERE template = 'NTF-02.reminder'`)).length;

  it('while Fresha sends reminders the app queues none', async () => {
    const t = await setup();
    await t.signIn(...CUSTOMER);
    await visit(t, 40);
    expect(await queueReminders(t.db, t.clock.t)).toBe(0);
    expect(await reminders(t)).toBe(0);
  });

  it('when the app sends: one reminder per timing, never twice; switching back to Fresha stops queued ones', async () => {
    const t = await setup();
    const token = await t.signIn(...CUSTOMER);
    await t.req('POST', '/v1/me/devices', token, { token: 'ExponentPushToken[abc123]', platform: 'ios' });
    await t.db.exec(`UPDATE app_settings SET settings = settings || '{"reminderSender": "app"}'::jsonb WHERE id = 1;`);
    await visit(t, 40);
    expect(await queueReminders(t.db, t.clock.t)).toBe(1);
    expect(await queueReminders(t.db, t.clock.t)).toBe(0);
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    expect(t.sent('push').map((m) => m.data.title)).toEqual(['Visit reminder']);
    t.clock.t += 38 * 3600_000; // 2 h before: the 3-hour reminder
    expect(await queueReminders(t.db, t.clock.t)).toBe(1);
    await t.db.exec(`UPDATE app_settings SET settings = settings || '{"reminderSender": "fresha"}'::jsonb WHERE id = 1;`);
    await dispatchDue(t.db, t.dev.integrations, t.clock.t);
    expect(t.sent('push')).toHaveLength(1);
    expect((await t.deliveries()).filter((d) => d.reason === 'fresha_sends_reminders').length).toBeGreaterThan(0);
  });

  it('respects the reminders preference', async () => {
    const t = await setup();
    const token = await t.signIn(...CUSTOMER);
    await t.req('PUT', '/v1/me/preferences', token, { reminders: false, aftercare: true, marketing: false });
    await t.db.exec(`UPDATE app_settings SET settings = settings || '{"reminderSender": "app"}'::jsonb WHERE id = 1;`);
    await visit(t, 40);
    expect(await queueReminders(t.db, t.clock.t)).toBe(0);
  });
});

describe('Fresha read-back triggers (NTF-01, 03, 04)', () => {
  it('a new upcoming booking, a moved one and a cancelled one each notify once', async () => {
    const t = await setup({ sampleFresha: true });
    const token = await t.signIn(...CUSTOMER);
    await t.req('GET', '/v1/visits', token);
    const templates = async () => (await t.db.query<{ template: string }>(`SELECT template FROM notifications WHERE template LIKE 'NTF-0%' ORDER BY id`)).map((r) => r.template);
    // Two upcoming sample bookings; the past one doesn't notify.
    expect(await templates()).toEqual(['NTF-01.booking_confirmed', 'NTF-01.booking_confirmed']);
    const list = t.dev.freshaBookings.get(CUSTOMER[1])!;
    list[0] = { ...list[0]!, startsAt: '2026-10-17T14:30:00-07:00' };
    list[1] = { ...list[1]!, status: 'cancelled' };
    t.clock.t += 60_000;
    await t.req('GET', '/v1/visits', token);
    await t.req('GET', '/v1/visits', token);
    expect(await templates()).toEqual(['NTF-01.booking_confirmed', 'NTF-01.booking_confirmed', 'NTF-03.visit_changed', 'NTF-04.visit_cancelled']);
  });
});

describe('marketing push (STF-35 → delivery)', () => {
  it('goes only to devices of people whose latest choice is yes, and waits out quiet hours', async () => {
    const t = await setup();
    const yes = await t.signIn(...CUSTOMER);
    const no = await t.signIn(...OTHER);
    const owner = await t.signIn(...OWNER, 'Owner');
    await t.req('POST', '/v1/me/consents', yes, { terms: true, transactional: true, marketing: true });
    await t.req('POST', '/v1/me/consents', no, { terms: true, transactional: true, marketing: false });
    await t.req('POST', '/v1/me/devices', yes, { token: 'ExponentPushToken[yes]', platform: 'ios' });
    await t.req('POST', '/v1/me/devices', no, { token: 'ExponentPushToken[no]', platform: 'ios' });
    // Scheduled during the day for 11 pm: held by quiet hours, sent in the morning.
    await t.req('POST', '/v1/staff/push', owner, { text: 'Winter glow is back.', opens: '/offers/cmp_halloween', sendAt: new Date(NIGHT).toISOString(), idempotencyKey: 'push-0001' });
    t.clock.t = NIGHT;
    expect(await deliverPushMessages(t.db, t.dev.integrations, t.clock.t)).toBe(0);
    t.clock.t = NIGHT + 10 * 3600_000;
    await deliverPushMessages(t.db, t.dev.integrations, t.clock.t);
    await deliverPushMessages(t.db, t.dev.integrations, t.clock.t);
    expect(t.sent('push').map((m) => m.to)).toEqual(['ExponentPushToken[yes]']);
    expect(await t.db.query('SELECT status, sent_count FROM push_messages')).toEqual([{ status: 'sent', sent_count: 1 }]);
  });
});

describe('stale offer pushes', () => {
  it('a push that couldn’t go out within 12 hours of its time is dropped, not sent late', async () => {
    const t = await setup();
    const yes = await t.signIn(...CUSTOMER);
    const owner = await t.signIn(...OWNER, 'Owner');
    await t.req('POST', '/v1/me/consents', yes, { terms: true, transactional: true, marketing: true });
    await t.req('POST', '/v1/me/devices', yes, { token: 'ExponentPushToken[yes]', platform: 'ios' });
    await t.req('POST', '/v1/staff/push', owner, { text: 'Winter glow is back.', opens: '/offers/cmp_halloween', sendAt: null, idempotencyKey: 'push-0002' });
    t.clock.t += 13 * 3600_000;
    await deliverPushMessages(t.db, t.dev.integrations, t.clock.t + 10 * 3600_000);
    expect(t.sent('push')).toHaveLength(0);
    expect(await t.db.query('SELECT status FROM push_messages')).toEqual([{ status: 'cancelled' }]);
  });
});

describe('devices and analytics consent', () => {
  it('a device token moves to whoever signs in on it; removal is per owner', async () => {
    const t = await setup();
    const a = await t.signIn(...CUSTOMER);
    const b = await t.signIn(...OTHER);
    const body = { token: 'ExponentPushToken[shared]', platform: 'ios' };
    await t.req('POST', '/v1/me/devices', a, body);
    await t.req('POST', '/v1/me/devices', b, body);
    const [row] = await t.db.query<{ customer_id: string }>('SELECT customer_id FROM push_devices');
    expect(row!.customer_id).toBe(await t.idOf(OTHER[1]));
    await t.req('POST', '/v1/me/devices/remove', a, { token: body.token });
    expect(await t.db.query('SELECT 1 FROM push_devices')).toHaveLength(1);
    await t.req('POST', '/v1/me/devices/remove', b, { token: body.token });
    expect(await t.db.query('SELECT 1 FROM push_devices')).toHaveLength(0);
  });

  it('usage analytics is an opt-in consent, recorded append-only and only on change', async () => {
    const t = await setup();
    const token = await t.signIn(...CUSTOMER);
    await t.req('PUT', '/v1/me/consents/analytics', token, { granted: true });
    await t.req('PUT', '/v1/me/consents/analytics', token, { granted: true });
    const me = (await t.req('GET', '/v1/me', token)).json();
    expect(me.consents.find((c: { purpose: string }) => c.purpose === 'analytics')).toMatchObject({ granted: true, version: 'usage-v1' });
    expect(await t.db.query(`SELECT 1 FROM consents WHERE purpose = 'analytics'`)).toHaveLength(1);
  });
});

describe('D33 gate and telemetry', () => {
  it('a stored in-app mode without a selected booking provider is served as hand-off, and staff can’t switch it on', async () => {
    const t = await setup();
    await t.db.exec(`UPDATE app_settings SET settings = settings || '{"bookingMode": "inapp"}'::jsonb WHERE id = 1;`);
    expect((await t.req('GET', '/v1/settings')).json().settings.bookingMode).toBe('handoff');
    expect(t.dev.integrations.booking.selected()).toBeNull();
  });

  it('redacts contact details, codes and tokens but keeps record IDs and dates', () => {
    const text =
      'User +1 604 555 0123 / (604) 555-0199 / maria@example.com sent code 123456 and gift ABCDEFGHJK23 with Bearer abc.def token Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4cXV1eA at 2026-10-07 for 3f2c1b8e-1a2b-4c3d-8e9f-0123456789ab';
    expect(redactText(text)).toBe('User [phone] / [phone] / [email] sent code [code] and gift [code] with Bearer [redacted] token [token] at 2026-10-07 for 3f2c1b8e-1a2b-4c3d-8e9f-0123456789ab');
  });
});
