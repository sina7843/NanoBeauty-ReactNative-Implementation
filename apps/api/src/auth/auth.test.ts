import { errorEnvelopeSchema, meSchema, otpVerifyResponseSchema, tokenPairSchema } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb, type Db } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';
import { LIMITS } from './session';

const MARIA = { input: '(604) 555-0123', e164: '+16045550123' }; // sample legacy record: Maria Chen
const JORDAN = { input: '604-555-0199', e164: '+16045550199' }; // sample legacy record under another name
const NEW = { input: '+1 778 555 0100', e164: '+17785550100' };

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

async function setup({ sampleLegacy = true, sink = true } = {}) {
  const db: Db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  // A real Postgres in CI is shared across tests: start every test from empty identity tables.
  await db.exec(
    'TRUNCATE audit_entries, legacy_match_cases, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, customers CASCADE;',
  );
  const clock = { t: Date.parse('2026-10-06T17:00:00Z') };
  let n = 0;
  const dev = createDevIntegrations({
    now: () => clock.t,
    generateCode: () => String(100000 + ++n * 1111),
    sampleLegacy,
  });
  const app = buildApp({
    config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
    db,
    integrations: dev.integrations,
    auth: { now: () => clock.t, devOtpSink: sink ? dev.otpSink : undefined },
  });
  close = () => app.close();
  const headers = (token?: string) => (token ? { authorization: `Bearer ${token}` } : {});
  const post = (url: string, payload: object, token?: string) => app.inject({ method: 'POST', url, payload, headers: headers(token) });
  const put = (url: string, payload: object, token?: string) => app.inject({ method: 'PUT', url, payload, headers: headers(token) });
  const get = (url: string, token?: string) => app.inject({ url, headers: headers(token) });
  const error = (res: { json: () => unknown }) => errorEnvelopeSchema.parse(res.json()).error;
  const start = (phone: string) => post('/v1/auth/otp/start', { phone });
  const verify = (challengeId: string, code: string) => post('/v1/auth/otp/verify', { challengeId, code });

  async function signIn(who: { input: string; e164: string }) {
    const s = await start(who.input);
    expect(s.statusCode).toBe(200);
    const v = await verify(s.json().challengeId, dev.otpSink.get(who.e164)!);
    expect(v.statusCode).toBe(200);
    return otpVerifyResponseSchema.parse(v.json());
  }
  async function onboard(who: { input: string; e164: string }, name: { firstName: string; lastName: string }) {
    const session = await signIn(who);
    await post('/v1/me/consents', { terms: true, transactional: true, marketing: false }, session.accessToken);
    const profile = await put('/v1/me/profile', { ...name, email: null }, session.accessToken);
    return { session, me: meSchema.parse(profile.json()) };
  }
  async function grant(customerPhone: string, role: string) {
    await db.query(
      `INSERT INTO staff_roles (customer_id, role) SELECT id, $2 FROM customers WHERE phone_e164 = $1`,
      [customerPhone, role],
    );
  }
  return { app, db, clock, dev, post, put, get, error, start, verify, signIn, onboard, grant };
}

describe('guest access (AUTH 01)', () => {
  it('public endpoints need no account; personal ones do', async () => {
    const { get, error } = await setup();
    expect((await get('/v1/settings')).statusCode).toBe(200);
    const me = await get('/v1/me');
    expect(me.statusCode).toBe(401);
    expect(error(me).code).toBe('unauthorized');
  });
});

describe('OTP sign-in end to end (AUTH 02, 03, 09, 11)', () => {
  it('phone → code → consents → profile → match → done, with separate versioned consents', async () => {
    const t = await setup();
    expect((await t.start(MARIA.input)).json()).toMatchObject({ sentTo: '(604) •••-••23' });
    t.clock.t += LIMITS.resendCooldownMs; // past the resend timer the first code started
    const session = await t.signIn(MARIA);
    expect(session.next).toBe('consents');

    expect((await t.post('/v1/me/consents', { terms: true, transactional: false, marketing: false }, session.accessToken)).statusCode).toBe(400);
    const afterConsents = meSchema.parse(
      (await t.post('/v1/me/consents', { terms: true, transactional: true, marketing: false }, session.accessToken)).json(),
    );
    expect(afterConsents.next).toBe('profile');
    expect(afterConsents.consents.map((c) => [c.purpose, c.granted])).toEqual([
      ['marketing', false],
      ['terms', true],
      ['transactional', true],
    ]);
    expect(afterConsents.consents.every((c) => c.version.length > 0)).toBe(true);

    const profile = meSchema.parse((await t.put('/v1/me/profile', { firstName: 'Maria', lastName: 'Chen', email: null }, session.accessToken)).json());
    expect(profile.next).toBe('match');

    const match = (await t.post('/v1/me/legacy-match', {}, session.accessToken)).json();
    expect(match).toMatchObject({ state: 'matched', sample: true });
    expect(match.items).toHaveLength(4);

    const decision = (await t.post('/v1/me/legacy-match/decision', { decision: 'looks_right' }, session.accessToken)).json();
    expect(decision).toMatchObject({ status: 'awaiting_clinic' });
    expect(decision.reference).toMatch(/^NB-M[0-9A-F]{8}$/);
    expect(meSchema.parse((await t.get('/v1/me', session.accessToken)).json()).next).toBe('done');

    // Consents are append-only records (PRIV 02).
    await expect(t.db.exec("UPDATE consents SET granted = true WHERE purpose = 'marketing';")).rejects.toThrow(/append-only/);
  });

  it('a returning customer who finished onboarding goes straight to done', async () => {
    const t = await setup({ sampleLegacy: false });
    await t.onboard(NEW, { firstName: 'Sam', lastName: 'Park' });
    t.clock.t += LIMITS.resendCooldownMs;
    expect((await t.signIn(NEW)).next).toBe('done');
  });

  it('rejects numbers that are not 10-digit North American mobiles', async () => {
    const t = await setup();
    const res = await t.start('(604) 555-01');
    expect(res.statusCode).toBe(400);
    expect(t.error(res).message).toBe('Enter a 10-digit Canadian mobile number');
  });
});

describe('rate limits and code states (AUT-02, AUT-08)', () => {
  it('enforces the resend timer and the hourly cap', async () => {
    const t = await setup();
    expect((await t.start(MARIA.input)).statusCode).toBe(200);
    const early = await t.start(MARIA.input);
    expect(early.statusCode).toBe(429);
    expect(t.error(early)).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 30 });
    expect(early.headers['retry-after']).toBe('30');
    for (let i = 1; i < LIMITS.maxSendsPerHour; i++) {
      t.clock.t += LIMITS.resendCooldownMs;
      expect((await t.start(MARIA.input)).statusCode).toBe(200);
    }
    t.clock.t += LIMITS.resendCooldownMs;
    expect(t.error(await t.start(MARIA.input)).code).toBe('rate_limited');
  });

  it('counts down tries, then pauses codes for 10 minutes', async () => {
    const t = await setup();
    const { challengeId } = (await t.start(MARIA.input)).json();
    const first = await t.verify(challengeId, '000000');
    expect(first.statusCode).toBe(401);
    expect(t.error(first)).toMatchObject({ code: 'code_wrong', attemptsLeft: 2 });
    expect(t.error(await t.verify(challengeId, '000000'))).toMatchObject({ attemptsLeft: 1 });
    const third = await t.verify(challengeId, '000000');
    expect(third.statusCode).toBe(429);
    expect(t.error(third)).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 600 });
    // Even the right code is refused while paused, and no new code can be sent.
    expect(t.error(await t.verify(challengeId, t.dev.otpSink.get(MARIA.e164)!)).code).toBe('rate_limited');
    expect(t.error(await t.start(MARIA.input)).code).toBe('rate_limited');
    t.clock.t += LIMITS.lockMs;
    expect((await t.start(MARIA.input)).statusCode).toBe(200);
  });

  it('expired codes and replayed codes are refused', async () => {
    const t = await setup();
    const { challengeId } = (await t.start(MARIA.input)).json();
    const code = t.dev.otpSink.get(MARIA.e164)!;
    t.clock.t += LIMITS.codeTtlMs + 1;
    expect(t.error(await t.verify(challengeId, code)).code).toBe('code_expired');

    const again = (await t.start(MARIA.input)).json();
    expect((await t.verify(again.challengeId, t.dev.otpSink.get(MARIA.e164)!)).statusCode).toBe(200);
    expect(t.error(await t.verify(again.challengeId, t.dev.otpSink.get(MARIA.e164)!)).code).toBe('code_expired');
    expect(t.error(await t.verify('not-a-uuid', '123456')).code).toBe('code_expired');
  });

  it('parallel code requests for one number send exactly one SMS', async () => {
    const t = await setup();
    const results = await Promise.all([t.start(MARIA.input), t.start(MARIA.input), t.start(MARIA.input)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 429, 429]);
    const rows = await t.db.query<{ count: number }>('SELECT count(*)::int AS count FROM otp_challenges');
    expect(rows[0]?.count).toBe(1);
  });

  it('throttles each client address on the unauthenticated endpoints', async () => {
    const t = await setup();
    let last;
    for (let i = 0; i < 21; i++) last = await t.post('/v1/auth/refresh', { refreshToken: 'nope' });
    expect(last!.statusCode).toBe(429);
    expect(t.error(last!).code).toBe('rate_limited');
  });
});

describe('sessions (AUTH 05)', () => {
  it('rotates tokens; a replayed refresh token revokes the whole session', async () => {
    const t = await setup();
    const session = await t.signIn(MARIA);
    const rotated = tokenPairSchema.parse((await t.post('/v1/auth/refresh', { refreshToken: session.refreshToken })).json());
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect((await t.get('/v1/me', rotated.accessToken)).statusCode).toBe(200);
    expect(t.error(await t.get('/v1/me', session.accessToken)).code).toBe('unauthorized');

    t.clock.t += LIMITS.refreshGraceMs + 1;
    const replay = await t.post('/v1/auth/refresh', { refreshToken: session.refreshToken });
    expect(t.error(replay).code).toBe('session_expired');
    expect(t.error(await t.get('/v1/me', rotated.accessToken)).code).toBe('session_expired');
    expect(t.error(await t.post('/v1/auth/refresh', { refreshToken: rotated.refreshToken })).code).toBe('session_expired');
  });

  it('a refresh lost in transit can be retried once within 30 s; older tokens still revoke', async () => {
    const t = await setup();
    const s0 = await t.signIn(MARIA);
    const lost = tokenPairSchema.parse((await t.post('/v1/auth/refresh', { refreshToken: s0.refreshToken })).json());
    // The client never stored `lost` (timeout/app kill) and retries with the old token.
    t.clock.t += 5_000;
    const retried = await t.post('/v1/auth/refresh', { refreshToken: s0.refreshToken });
    expect(retried.statusCode).toBe(200);
    const s2 = tokenPairSchema.parse(retried.json());
    expect((await t.get('/v1/me', s2.accessToken)).statusCode).toBe(200);
    expect(t.error(await t.get('/v1/me', lost.accessToken)).code).toBe('unauthorized');
    // Rotate again; now s0 is no longer the latest rotated token → presenting it is a replay.
    tokenPairSchema.parse((await t.post('/v1/auth/refresh', { refreshToken: s2.refreshToken })).json());
    expect(t.error(await t.post('/v1/auth/refresh', { refreshToken: s0.refreshToken })).code).toBe('session_expired');
  });

  it('access tokens expire in 15 minutes; customer sessions end after 30 days', async () => {
    const t = await setup();
    const session = await t.signIn(MARIA);
    t.clock.t += LIMITS.accessTtlMs;
    expect(t.error(await t.get('/v1/me', session.accessToken)).code).toBe('token_expired');
    const rotated = tokenPairSchema.parse((await t.post('/v1/auth/refresh', { refreshToken: session.refreshToken })).json());
    expect((await t.get('/v1/me', rotated.accessToken)).statusCode).toBe(200);
    t.clock.t = Date.parse(session.sessionExpiresAt);
    expect(t.error(await t.post('/v1/auth/refresh', { refreshToken: rotated.refreshToken })).code).toBe('session_expired');
    expect(Date.parse(session.sessionExpiresAt) - Date.parse('2026-10-06T17:00:00Z')).toBe(LIMITS.customerSessionMs);
  });

  it('sign-out revokes the session server-side', async () => {
    const t = await setup();
    const session = await t.signIn(MARIA);
    expect((await t.post('/v1/auth/logout', {}, session.accessToken)).statusCode).toBe(204);
    expect(t.error(await t.get('/v1/me', session.accessToken)).code).toBe('session_expired');
    expect(t.error(await t.post('/v1/auth/refresh', { refreshToken: session.refreshToken })).code).toBe('session_expired');
  });
});

describe('server-side permissions (D34)', () => {
  it('maps roles to permissions on the server and enforces them per request', async () => {
    const t = await setup();
    const owner = await t.signIn(MARIA);
    t.clock.t += LIMITS.resendCooldownMs;
    const editor = await t.signIn(NEW);
    await t.grant(MARIA.e164, 'Owner');
    await t.grant(NEW.e164, 'Editor');

    const ownerMe = meSchema.parse((await t.get('/v1/me', owner.accessToken)).json());
    expect(ownerMe.permissions).toContain('accountMatch.resolve');
    const editorMe = meSchema.parse((await t.get('/v1/me', editor.accessToken)).json());
    expect(editorMe.permissions).toEqual(['content.draft', 'policies.draft', 'professionals.draft', 'selling.draft']);

    const denied = await t.get('/v1/staff/match-cases', editor.accessToken);
    expect(denied.statusCode).toBe(403);
    expect(t.error(denied)).toMatchObject({ code: 'forbidden', missingPermission: 'accountMatch.resolve' });
    expect((await t.get('/v1/staff/match-cases', owner.accessToken)).statusCode).toBe(200);
  });

  it('staff sessions end after 12 hours even if the role was granted mid-session', async () => {
    const t = await setup();
    const session = await t.signIn(MARIA);
    await t.grant(MARIA.e164, 'Front desk');
    const refreshed = tokenPairSchema.parse((await t.post('/v1/auth/refresh', { refreshToken: session.refreshToken })).json());
    expect(Date.parse(refreshed.sessionExpiresAt) - Date.parse('2026-10-06T17:00:00Z')).toBe(LIMITS.staffSessionMs);
    t.clock.t += LIMITS.staffSessionMs;
    expect(t.error(await t.get('/v1/me', refreshed.accessToken)).code).toBe('session_expired');
    expect(t.error(await t.post('/v1/auth/refresh', { refreshToken: refreshed.refreshToken })).code).toBe('session_expired');
  });
});

describe('legacy account match (AUTH 11)', () => {
  it('mismatch never merges; only the clinic can resolve, with an audit entry and no value moved', async () => {
    const t = await setup();
    const { session } = await t.onboard(JORDAN, { firstName: 'Maria', lastName: 'Chen' });
    expect((await t.post('/v1/me/legacy-match', {}, session.accessToken)).json()).toMatchObject({ state: 'mismatch', items: [] });
    // A choice that belongs to another state is refused, not guessed.
    expect((await t.post('/v1/me/legacy-match/decision', { decision: 'looks_right' }, session.accessToken)).statusCode).toBe(409);
    const asked = (await t.post('/v1/me/legacy-match/decision', { decision: 'ask_clinic' }, session.accessToken)).json();
    expect(asked.status).toBe('awaiting_clinic');
    // One answer per customer: repeats can't flood the clinic queue.
    expect((await t.post('/v1/me/legacy-match/decision', { decision: 'ask_clinic' }, session.accessToken)).statusCode).toBe(409);

    // A staff member who is also the customer can't confirm their own case.
    await t.grant(JORDAN.e164, 'Owner');
    const [own] = (await t.get('/v1/staff/match-cases', session.accessToken)).json();
    const self = await t.post(`/v1/staff/match-cases/${own.id}/resolve`, { outcome: 'confirmed', reason: 'it is me' }, session.accessToken);
    expect(self.statusCode).toBe(403);

    t.clock.t += LIMITS.resendCooldownMs;
    const desk = await t.signIn(MARIA);
    await t.grant(MARIA.e164, 'Front desk');
    const [pending] = (await t.get('/v1/staff/match-cases', desk.accessToken)).json();
    expect(pending.reference).toBe(asked.reference);
    const resolved = await t.post(`/v1/staff/match-cases/${pending.id}/resolve`, { outcome: 'confirmed', reason: 'ID checked at desk' }, desk.accessToken);
    expect(resolved.json()).toMatchObject({ status: 'confirmed', valueMoved: false });
    expect((await t.post(`/v1/staff/match-cases/${pending.id}/resolve`, { outcome: 'rejected', reason: 'again' }, desk.accessToken)).statusCode).toBe(409);
    const audit = await t.db.query<{ item: string; new_value: string; reason: string }>('SELECT item, new_value, reason FROM audit_entries');
    expect(audit).toEqual([{ item: `legacy_match_case:${pending.id}`, new_value: 'confirmed', reason: 'ID checked at desk' }]);
  });

  it('not found offers new account or clinic lookup', async () => {
    const t = await setup();
    const { session, me } = await t.onboard(NEW, { firstName: 'Sam', lastName: 'Park' });
    expect(me.next).toBe('match');
    expect((await t.post('/v1/me/legacy-match', {}, session.accessToken)).json()).toMatchObject({ state: 'notfound' });
    const created = (await t.post('/v1/me/legacy-match/decision', { decision: 'new_client' }, session.accessToken)).json();
    expect(created).toEqual({ reference: null, status: 'closed' });
  });

  it('with the old app not connected, the match step is skipped instead of claiming "not found"', async () => {
    const t = await setup({ sampleLegacy: false });
    const { session, me } = await t.onboard(MARIA, { firstName: 'Maria', lastName: 'Chen' });
    expect(me.next).toBe('done');
    expect((await t.post('/v1/me/legacy-match', {}, session.accessToken)).json()).toMatchObject({ state: 'unavailable' });
  });
});

describe('dev OTP sink', () => {
  it('exists only when enabled and never for unknown numbers', async () => {
    const off = await setup({ sink: false });
    await off.start(MARIA.input);
    expect((await off.get('/v1/dev/otp?phone=6045550123')).statusCode).toBe(404);
    await close?.();
    const on = await setup();
    await on.start(MARIA.input);
    expect((await on.get('/v1/dev/otp?phone=6045550123')).json()).toEqual({ code: on.dev.otpSink.get(MARIA.e164) });
    expect((await on.get('/v1/dev/otp?phone=7785550100')).statusCode).toBe(404);
  });
});
