import {
  consentHistorySchema,
  deletionPreviewSchema,
  deletionStatusSchema,
  inboxResponseSchema,
  meSchema,
  otpVerifyResponseSchema,
  preferencesSchema,
  privacyRequestSchema,
} from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp, redactUrl } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';
import { DELETION_PLAN, runDueDeletions } from './routes';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

async function setup() {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec(
    'TRUNCATE privacy_requests, customer_preferences, notifications, visit_requests, booking_handoffs, visits, audit_entries, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, support_questions, promo_redemptions, legacy_match_cases, customers CASCADE;',
  );
  const clock = { t: Date.parse('2026-10-06T17:00:00Z') };
  const dev = createDevIntegrations({ now: () => clock.t, sampleFresha: true });
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { now: () => clock.t, devOtpSink: dev.otpSink } });
  close = () => app.close();
  const req = (method: 'GET' | 'POST' | 'PUT', url: string, token?: string, payload?: object) =>
    app.inject({ method, url, ...(payload ? { payload } : {}), headers: token ? { authorization: `Bearer ${token}` } : {} });
  /** Code for the last challenge sent to a number (dev sink). */
  const codeFor = (e164: string) => dev.otpSink.get(e164)!;
  async function signIn(phone: string, e164: string) {
    clock.t += 31_000; // past the resend timer for this number
    const { challengeId } = (await req('POST', '/v1/auth/otp/start', undefined, { phone })).json();
    return otpVerifyResponseSchema.parse((await req('POST', '/v1/auth/otp/verify', undefined, { challengeId, code: codeFor(e164) })).json()).accessToken;
  }
  const me = async (token: string) => meSchema.parse((await req('GET', '/v1/me', token)).json());
  return { app, db, dev, clock, req, codeFor, signIn, me };
}

const MARIA = ['6045550123', '+16045550123'] as const;
const NEW = ['7785550199', '+17785550199'] as const;
const OTHER = ['7785550100', '+17785550100'] as const;

describe('preferences (ACC-03, NOTIF 04)', () => {
  it('booking messages stay on; reminders persist; offers are a consent record written only when they change', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    expect(preferencesSchema.parse((await t.req('GET', '/v1/me/preferences', token)).json())).toEqual({
      bookingMessages: true,
      reminders: true,
      aftercare: true,
      marketing: false,
    });
    const put = (b: object) => t.req('PUT', '/v1/me/preferences', token, b);
    expect((await put({ reminders: false, aftercare: true, marketing: true })).json()).toMatchObject({ reminders: false, marketing: true });
    await put({ reminders: false, aftercare: false, marketing: true });
    expect((await t.req('GET', '/v1/me/preferences', token)).json()).toMatchObject({ reminders: false, aftercare: false, marketing: true });
    const history = consentHistorySchema.parse((await t.req('GET', '/v1/me/consents', token)).json());
    expect(history.filter((c) => c.purpose === 'marketing')).toHaveLength(1);
    expect((await t.req('PUT', '/v1/me/preferences', token, { reminders: true })).statusCode).toBe(400);
  });
});

describe('phone change (ACC-02)', () => {
  it('changes only after a code to the new number, is audited, and refuses a number that has an account', async () => {
    const t = await setup();
    const otherDevice = await t.signIn(...MARIA);
    const token = await t.signIn(...MARIA);
    const start = (phone: string) => t.req('POST', '/v1/me/phone/start', token, { phone });
    const { challengeId } = (await start(NEW[0])).json();
    expect((await t.req('POST', '/v1/me/phone/verify', token, { challengeId, code: '000000' === t.codeFor(NEW[1]) ? '111111' : '000000' })).statusCode).toBe(401);
    expect((await t.me(token)).customer.phone).toBe(MARIA[1]);
    const ok = await t.req('POST', '/v1/me/phone/verify', token, { challengeId, code: t.codeFor(NEW[1]) });
    expect(meSchema.parse(ok.json()).customer.phone).toBe(NEW[1]);
    const audit = await t.db.query<{ field: string; old_value: string; new_value: string }>('SELECT field, old_value, new_value FROM audit_entries');
    expect(audit).toEqual([{ field: 'phone', old_value: '(604) •••-••23', new_value: '(778) •••-••99' }]);

    // The old number is told, and other devices must sign in again.
    expect(t.dev.outbox.at(-1)).toMatchObject({ channel: 'sms', to: MARIA[1], template: 'phone_changed' });
    expect((await t.req('GET', '/v1/me', otherDevice)).statusCode).toBe(401);
    expect((await t.req('GET', '/v1/me', token)).statusCode).toBe(200);

    await t.signIn(...OTHER); // someone else owns this number
    t.clock.t += 31_000;
    const second = (await start(OTHER[0])).json();
    expect((await t.req('POST', '/v1/me/phone/verify', token, { challengeId: second.challengeId, code: t.codeFor(OTHER[1]) })).statusCode).toBe(409);
  });
});

describe('inbox (ACC-04/05, NOTIF 05)', () => {
  it('shows transactional messages, counts unread, marks read on open, and is private', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const visit = (await t.req('GET', '/v1/visits', token)).json().upcoming[0];
    await t.req('POST', `/v1/visits/${visit.id}/requests`, token, { type: 'change', message: 'Move to Tuesday?', idempotencyKey: 'req-key-0001' });
    const inbox = inboxResponseSchema.parse((await t.req('GET', '/v1/me/inbox', token)).json());
    expect(inbox.unread).toBe(1);
    expect(inbox.items[0]).toMatchObject({ title: 'Request sent to the clinic', href: `/visits/${visit.id}`, read: false });
    expect((await t.req('GET', `/v1/me/inbox/${inbox.items[0]!.id}`, token)).json()).toMatchObject({ read: true });
    expect(inboxResponseSchema.parse((await t.req('GET', '/v1/me/inbox', token)).json()).unread).toBe(0);
    const other = await t.signIn(...OTHER);
    expect((await t.req('GET', `/v1/me/inbox/${inbox.items[0]!.id}`, other)).statusCode).toBe(404);
    // Staff notices never appear in a customer's inbox.
    expect(inboxResponseSchema.parse((await t.req('GET', '/v1/me/inbox', other)).json()).items).toEqual([]);
  });
});

describe('data request (ACC-07, PRIV 08)', () => {
  it('is tracked with a reference, deduplicated while open, and announced to staff', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const ask = (key: string) => t.req('POST', '/v1/me/data-requests', token, { email: 'maria@example.com', idempotencyKey: key });
    const first = privacyRequestSchema.parse((await ask('export-key-1')).json());
    expect(first).toMatchObject({ kind: 'export', status: 'received', dueAt: '2026-11-05T17:00:31.000Z' });
    expect(first.reference).toMatch(/^DR-[0-9A-F]{6}$/);
    expect((await ask('export-key-2')).json().reference).toBe(first.reference);
    expect((await t.req('GET', '/v1/me/data-requests', token)).json().latest.reference).toBe(first.reference);
    const staff = await t.db.query<{ permission: string }>("SELECT permission FROM notifications WHERE audience = 'staff'");
    expect(staff).toEqual([{ permission: 'customers.view' }]);
    expect((await t.req('POST', '/v1/me/data-requests', token, { email: 'not-an-email', idempotencyKey: 'export-key-3' })).statusCode).toBe(400);
  });

  it('two requests racing from two devices open one export', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const [a, b] = await Promise.all(
      ['race-key-1', 'race-key-2'].map((k) => t.req('POST', '/v1/me/data-requests', token, { email: 'maria@example.com', idempotencyKey: k })),
    );
    expect(a!.json().reference).toBe(b!.json().reference);
    expect(await t.db.query("SELECT id FROM privacy_requests WHERE kind = 'export'")).toHaveLength(1);
  });
});

describe('account deletion (ACC-08–10, AUTH 06, PRIV 04)', () => {
  it('explains, confirms identity, signs out, can be cancelled, and is carried out per the plan after the grace period', async () => {
    const t = await setup();
    let token = await t.signIn(...MARIA);
    await t.req('PUT', '/v1/me/profile', token, { firstName: 'Maria', lastName: 'Chen', email: 'maria@example.com' });
    await t.req('POST', '/v1/me/consents', token, { terms: true, transactional: true, marketing: false });
    await t.req('GET', '/v1/visits', token); // syncs sample Fresha visits into the app
    await t.req('POST', '/v1/me/data-requests', token, { email: 'maria@example.com', idempotencyKey: 'export-before-delete' });

    const preview = deletionPreviewSchema.parse((await t.req('GET', '/v1/me/deletion/preview', token)).json());
    expect(preview.upcomingVisits.count).toBe(2);
    expect(preview).toMatchObject({ graceDays: 30, sample: true });
    expect(preview.delete.length && preview.deidentify.length && preview.retain.length).toBeTruthy();

    // A code to a different number can't confirm this account's deletion.
    const otherStart = (await t.req('POST', '/v1/privacy/deletion/start', undefined, { phone: OTHER[0] })).json();
    expect((await t.req('POST', '/v1/me/deletion', token, { challengeId: otherStart.challengeId, code: t.codeFor(OTHER[1]) })).statusCode).toBe(403);

    t.clock.t += 31_000;
    const { challengeId } = (await t.req('POST', '/v1/me/deletion/start', token)).json();
    const status = deletionStatusSchema.parse((await t.req('POST', '/v1/me/deletion', token, { challengeId, code: t.codeFor(MARIA[1]) })).json());
    expect(status.status).toBe('pending');
    expect(Date.parse(status.dueAt)).toBe(t.clock.t + 30 * 24 * 3600_000); // settings.deletionGraceDays
    expect((await t.req('GET', '/v1/me', token)).statusCode).toBe(401); // signed out everywhere
    expect(t.dev.outbox.at(-1)).toMatchObject({ channel: 'sms', to: MARIA[1], template: 'deletion_requested' });

    // Signing in again during the grace period shows it and can cancel it.
    token = await t.signIn(...MARIA);
    expect((await t.me(token)).deletion?.reference).toBe(status.reference);
    expect((await t.req('POST', '/v1/me/deletion/cancel', token)).json()).toMatchObject({ status: 'cancelled' });
    expect((await t.me(token)).deletion).toBeNull();
    expect((await t.req('POST', '/v1/me/deletion/cancel', token)).statusCode).toBe(409);

    // Ask again, then let the grace period pass.
    t.clock.t += 31_000;
    const again = (await t.req('POST', '/v1/me/deletion/start', token)).json();
    const pending = deletionStatusSchema.parse((await t.req('POST', '/v1/me/deletion', token, { challengeId: again.challengeId, code: t.codeFor(MARIA[1]) })).json());
    expect(await runDueDeletions(t.db, t.dev.integrations, t.clock.t)).toBe(0); // not before it's due
    t.clock.t += 31 * 24 * 3600_000;
    expect(await runDueDeletions(t.db, t.dev.integrations, t.clock.t)).toBe(1);
    expect(await runDueDeletions(t.db, t.dev.integrations, t.clock.t)).toBe(0); // idempotent

    const [customer] = await t.db.query<{ phone_e164: string; first_name: string | null; email: string | null; deleted_at: Date | null }>(
      'SELECT phone_e164, first_name, email, deleted_at FROM customers',
    );
    expect(customer).toMatchObject({ first_name: null, email: null });
    expect(customer!.phone_e164.startsWith('deleted:')).toBe(true);
    expect(customer!.deleted_at).not.toBeNull();
    const count = async (table: string) => Number((await t.db.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`))[0]!.n);
    for (const table of ['sessions', 'visits', 'notifications WHERE customer_id IS NOT NULL', 'customer_preferences', "otp_challenges WHERE phone_e164 = '+16045550123'"]) expect(await count(table)).toBe(0);
    expect(await count('consents')).toBeGreaterThan(0); // retained, linked only to the removed record
    // An export still being prepared is closed, and no request keeps an email.
    expect(await t.db.query("SELECT status, email FROM privacy_requests WHERE kind = 'export'")).toEqual([{ status: 'cancelled', email: null }]);
    expect(t.dev.outbox.at(-1)).toMatchObject({ to: MARIA[1], template: 'account_deleted' });

    // Status by token after sign-out (ACC-10 completed); the number can start fresh.
    expect((await t.req('GET', `/v1/privacy/deletion/${pending.token}`)).json()).toMatchObject({ status: 'completed' });
    const fresh = await t.signIn(...MARIA);
    expect((await t.me(fresh)).customer.firstName).toBeNull();
  });

  it('the deletion plan covers every table that points at a customer', async () => {
    const t = await setup();
    const linked = await t.db.query<{ table_name: string }>(
      `SELECT DISTINCT tc.table_name FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'customers' AND tc.table_name <> 'customers'`,
    );
    const planned = new Set(Object.values(DELETION_PLAN).flatMap((group) => group.flatMap((g) => [...g.tables])));
    expect(linked.length).toBeGreaterThan(5);
    // A new table holding customer data must be added to DELETION_PLAN and carryOutDeletion.
    expect(linked.map((r) => r.table_name).filter((name) => !planned.has(name as never))).toEqual([]);
  });

  it('one failing deletion does not hold up the others', async () => {
    const t = await setup();
    for (const [phone, e164] of [MARIA, OTHER]) {
      const token = await t.signIn(phone, e164);
      t.clock.t += 31_000;
      const { challengeId } = (await t.req('POST', '/v1/me/deletion/start', token)).json();
      await t.req('POST', '/v1/me/deletion', token, { challengeId, code: t.codeFor(e164) });
    }
    t.clock.t += 31 * 24 * 3600_000;
    let calls = 0;
    const flaky = { ...t.db, transaction: <T,>(fn: Parameters<typeof t.db.transaction<T>>[0]) => (calls++ === 0 ? Promise.reject(new Error('boom')) : t.db.transaction(fn)) };
    const failed: string[] = [];
    expect(await runDueDeletions(flaky, t.dev.integrations, t.clock.t, (id) => failed.push(id))).toBe(1);
    expect(failed).toHaveLength(1);
    expect(await runDueDeletions(t.db, t.dev.integrations, t.clock.t)).toBe(1); // retried next run
  });

  it('request logs never carry the deletion status token', () => {
    expect(redactUrl('/v1/privacy/deletion/0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d')).toBe('/v1/privacy/deletion/:token');
    expect(redactUrl('/v1/me/inbox')).toBe('/v1/me/inbox');
  });

  it('web route (WEB-03/04): code by text, one pending request, and an honest "no account" answer', async () => {
    const t = await setup();
    await t.signIn(...MARIA);
    t.clock.t += 31_000;
    const web = async (phone: string, e164: string) => {
      t.clock.t += 31_000;
      const { challengeId } = (await t.req('POST', '/v1/privacy/deletion/start', undefined, { phone })).json();
      return t.req('POST', '/v1/privacy/deletion/confirm', undefined, { challengeId, code: t.codeFor(e164) });
    };
    const first = deletionStatusSchema.parse((await web(...MARIA)).json());
    expect(first.status).toBe('pending');
    expect((await web(...MARIA)).json().reference).toBe(first.reference); // never stacked
    expect((await web(...NEW)).statusCode).toBe(404);
    const rows = await t.db.query<{ channel: string }>("SELECT channel FROM privacy_requests WHERE kind = 'delete'");
    expect(rows).toEqual([{ channel: 'web' }]);
  });
});
