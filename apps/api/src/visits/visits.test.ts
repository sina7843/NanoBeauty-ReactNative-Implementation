import { errorEnvelopeSchema, handoffStatusSchema, otpVerifyResponseSchema, visitRequestSchema, visitsResponseSchema } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations, type FreshaVisit } from '../integrations';
import { migrate } from '../migrate';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const FRESHA_URL = 'https://booking.example.invalid/nano-beauty';

async function setup({ connected = true } = {}) {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec(
    'TRUNCATE notifications, visit_requests, booking_handoffs, visits, audit_entries, staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, support_questions, promo_redemptions, legacy_match_cases, customers CASCADE;',
  );
  await db.exec(`UPDATE app_settings SET settings = settings || '{"bookingMode":"handoff"}'::jsonb WHERE id = 1;`);
  const clock = { t: Date.parse('2026-10-06T17:00:00Z') };
  const dev = createDevIntegrations({ now: () => clock.t, sampleFresha: connected, freshaBookingUrl: FRESHA_URL });
  const app = buildApp({
    config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
    db,
    integrations: dev.integrations,
    auth: { now: () => clock.t, devOtpSink: dev.otpSink },
  });
  close = () => app.close();
  const req = (method: 'GET' | 'POST', url: string, token?: string, payload?: object) =>
    app.inject({ method, url, ...(payload ? { payload } : {}), headers: token ? { authorization: `Bearer ${token}` } : {} });
  async function signIn(phone: string, e164: string) {
    const { challengeId } = (await req('POST', '/v1/auth/otp/start', undefined, { phone })).json();
    clock.t += 1; // keep timestamps strictly increasing between steps
    return otpVerifyResponseSchema.parse((await req('POST', '/v1/auth/otp/verify', undefined, { challengeId, code: dev.otpSink.get(e164)! })).json())
      .accessToken;
  }
  const visits = async (token: string) => visitsResponseSchema.parse((await req('GET', '/v1/visits', token)).json());
  const handoff = async (token: string, key = 'handoff-key-1', items: object[] = [{ serviceId: 'svc_hifu' }]) =>
    req('POST', '/v1/bookings/handoffs', token, { items, idempotencyKey: key });
  const status = async (token: string, id: string) => handoffStatusSchema.parse((await req('GET', `/v1/bookings/handoffs/${id}`, token)).json());
  return { app, db, clock, dev, req, signIn, visits, handoff, status };
}

const MARIA = ['6045550123', '+16045550123'] as const;
const OTHER = ['7785550100', '+17785550100'] as const;
const newBooking: FreshaVisit = {
  ref: 'NB-30001',
  serviceId: 'svc_hifu',
  serviceName: '12D HIFU',
  detail: 'Lower face',
  professional: 'Maria',
  startsAt: '2026-10-20T17:00:00-07:00',
  durationMin: 60,
  status: 'confirmed',
  depositCAD: 50,
};

describe('visits (BOOK 08, BOOK 19)', () => {
  it('without a Fresha read-back, visits say so instead of inventing data', async () => {
    const t = await setup({ connected: false });
    const token = await t.signIn(...MARIA);
    expect(await t.visits(token)).toMatchObject({ sync: 'not_connected', syncedAt: null, upcoming: [], past: [] });
  });

  it('with a read-back, splits upcoming and past and keeps Fresha status as reported', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const v = await t.visits(token);
    expect(v.sync).toBe('synced');
    expect(v.upcoming.map((x) => [x.ref, x.status])).toEqual([
      ['NB-20418', 'confirmed'],
      ['NB-20533', 'pending'],
    ]);
    expect(v.past.map((x) => x.ref)).toEqual(['NB-19877']);
    expect(v.upcoming[0]).toMatchObject({ serviceId: 'svc_hifu', depositCAD: 50, openRequest: null });
  });

  it('visits are private to their customer', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const id = (await t.visits(maria)).upcoming[0]!.id;
    t.clock.t += 31_000;
    const other = await t.signIn(...OTHER);
    expect((await t.req('GET', `/v1/visits/${id}`, other)).statusCode).toBe(404);
    expect((await t.req('GET', '/v1/visits')).statusCode).toBe(401);
  });
});

describe('Fresha hand-off (BOOK 15, BOOK 16)', () => {
  it('is idempotent per key and needs live treatments and hand-off mode', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const a = (await t.handoff(token)).json();
    const b = (await t.handoff(token)).json();
    expect(a.id).toBe(b.id);
    expect(a.url).toBe(FRESHA_URL);
    expect((await t.handoff(token, 'other-key-123')).json().id).not.toBe(a.id);
    expect((await t.handoff(token, 'k-unavailable', [{ serviceId: 'svc_prp_hair' }])).statusCode).toBe(409);
    const laser = (names: string[], set = 'women') => t.handoff(token, `k-areas-${set}-${names.length}`, [{ serviceId: 'svc_laser', areas: { set, names } }]);
    expect((await laser(['Upper lip', 'Underarms'])).statusCode).toBe(200);
    expect((await laser(['Beard'])).statusCode).toBe(400); // a men's area under the women's set
    expect((await laser(['Upper lip', 'Chin', 'Underarms', 'Bikini line', 'Lower leg'])).statusCode).toBe(400); // over the max of 4
    await t.db.exec(`UPDATE app_settings SET settings = settings || '{"bookingMode":"inapp"}'::jsonb WHERE id = 1;`);
    expect(errorEnvelopeSchema.parse((await t.handoff(token, 'k-inapp-mode')).json()).error.code).toBe('conflict');
  });

  it('returning from Fresha alone never confirms: no read-back → "not yet"', async () => {
    const t = await setup({ connected: false });
    const token = await t.signIn(...MARIA);
    const { id } = (await t.handoff(token)).json();
    expect((await t.status(token, id)).state).toBe('notyet');
  });

  it('checks, then confirms only when a new Fresha booking appears; existing bookings never count', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const { id } = (await t.handoff(token)).json();
    // The three sample bookings already existed: still "checking", not "confirmed".
    expect((await t.status(token, id)).state).toBe('checking');
    t.clock.t += 120_000;
    expect((await t.status(token, id)).state).toBe('notyet');
    // The customer finishes booking in Fresha; the next Fresha read (at most every 15 s) sees it.
    t.dev.freshaBookings.get(MARIA[1])!.push(newBooking);
    t.clock.t += 15_000;
    const done = await t.status(token, id);
    expect(done).toMatchObject({ state: 'confirmed', visit: { ref: 'NB-30001', status: 'confirmed' } });
    // Relaunch / stale return link a day later: still the same truthful answer, and no duplicate visit.
    t.clock.t += 20 * 3600_000;
    const later = await t.signIn(...MARIA); // the app relaunched; a fresh session
    expect((await t.status(later, id)).visit?.ref).toBe('NB-30001');
    const refs = (await t.visits(later)).upcoming.map((v) => v.ref);
    expect(refs.filter((r) => r === 'NB-30001')).toHaveLength(1);
  });

  it('one booking is claimed by one hand-off only, and a hand-off past its expiry never matches', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const old = (await t.handoff(token, 'handoff-key-old')).json().id;
    t.dev.freshaBookings.get(MARIA[1])!.push(newBooking);
    t.clock.t += 25 * 3600_000; // past the 24 h hand-off lifetime
    const fresh = await t.signIn(...MARIA);
    expect((await t.status(fresh, old)).state).toBe('notyet');
    // Two live hand-offs at the same time: only the first to see it claims the booking.
    const c = (await t.handoff(fresh, 'handoff-key-c', [{ serviceId: 'svc_hifu' }])).json().id;
    const d = (await t.handoff(fresh, 'handoff-key-d', [{ serviceId: 'svc_hifu' }])).json().id;
    t.dev.freshaBookings.get(MARIA[1])!.push({ ...newBooking, ref: 'NB-30002' });
    t.clock.t += 15_000;
    expect((await t.status(fresh, c)).visit?.ref).toBe('NB-30002');
    expect((await t.status(fresh, d)).state).not.toBe('confirmed');
  });

  it('a Fresha outage degrades to "not synced" instead of an error', async () => {
    const t = await setup();
    const token = await t.signIn(...MARIA);
    const { id } = (await t.handoff(token)).json();
    t.dev.integrations.fresha.readVisits = async () => {
      throw new Error('Fresha timed out');
    };
    t.clock.t += 15_000;
    expect((await t.visits(token)).sync).toBe('not_connected');
    t.clock.t += 15_000;
    expect((await t.status(token, id)).state).toBe('notyet');
  });

  it('a hand-off belongs to its customer', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const { id } = (await t.handoff(maria)).json();
    t.clock.t += 31_000;
    const other = await t.signIn(...OTHER);
    expect((await t.req('GET', `/v1/bookings/handoffs/${id}`, other)).statusCode).toBe(404);
  });
});

describe('visit requests (BOOK 18)', () => {
  it('lands in the staff queue once, is audited, and the customer is told the outcome', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const visit = (await t.visits(maria)).upcoming[0]!;
    const body = { type: 'change', message: 'Can I move to next Tuesday morning?', idempotencyKey: 'req-key-0001' };
    const created = visitRequestSchema.parse((await t.req('POST', `/v1/visits/${visit.id}/requests`, maria, body)).json());
    expect(created).toMatchObject({ status: 'submitted', type: 'change' });
    // Retry (same key) and a second request while one is open both return the same request.
    expect((await t.req('POST', `/v1/visits/${visit.id}/requests`, maria, body)).json().id).toBe(created.id);
    expect((await t.req('POST', `/v1/visits/${visit.id}/requests`, maria, { ...body, idempotencyKey: 'req-key-0002' })).json().id).toBe(created.id);
    // A different request while one is open would be silently lost: refused instead.
    expect((await t.req('POST', `/v1/visits/${visit.id}/requests`, maria, { ...body, type: 'cancel', idempotencyKey: 'req-key-0003' })).statusCode).toBe(409);
    expect((await t.visits(maria)).upcoming[0]!.openRequest?.id).toBe(created.id);

    const notes = await t.db.query<{ audience: string; template: string }>('SELECT audience, template FROM notifications ORDER BY id');
    expect(notes).toEqual([
      { audience: 'staff', template: 'NTF-11.request_needs_you' },
      { audience: 'customer', template: 'visit_request_submitted' },
    ]);

    t.clock.t += 31_000;
    const desk = await t.signIn(...OTHER);
    expect((await t.req('GET', '/v1/staff/requests', desk)).statusCode).toBe(403);
    await t.db.query(`INSERT INTO staff_roles (customer_id, role) SELECT id, 'Front desk' FROM customers WHERE phone_e164 = $1`, [OTHER[1]]);
    expect((await t.req('GET', '/v1/staff/requests', desk)).json()).toHaveLength(1);

    const decline = await t.req('POST', `/v1/staff/requests/${created.id}/transition`, desk, { to: 'declined' });
    expect(decline.statusCode).toBe(400); // a decline needs a reason the customer is told
    const approved = await t.req('POST', `/v1/staff/requests/${created.id}/transition`, desk, { to: 'approved', note: 'Moved in Fresha' });
    expect(approved.json()).toMatchObject({ status: 'approved' });
    expect((await t.req('POST', `/v1/staff/requests/${created.id}/transition`, desk, { to: 'declined', reason: 'too late' })).statusCode).toBe(409);
    expect((await t.visits(maria)).upcoming[0]!.openRequest).toBeNull();
    // Approved stays in the staff queue until marked done (moved in Fresha).
    expect((await t.req('GET', '/v1/staff/requests', desk)).json().map((r: { status: string }) => r.status)).toEqual(['approved']);
    expect((await t.req('POST', `/v1/staff/requests/${created.id}/transition`, desk, { to: 'done' })).statusCode).toBe(200);
    expect((await t.req('GET', '/v1/staff/requests', desk)).json()).toHaveLength(0);

    const audit = await t.db.query<{ item: string; old_value: string; new_value: string }>('SELECT item, old_value, new_value FROM audit_entries');
    expect(audit).toEqual([
      { item: `visit_request:${created.id}`, old_value: 'submitted', new_value: 'approved' },
      { item: `visit_request:${created.id}`, old_value: 'approved', new_value: 'done' },
    ]);
    const told = await t.db.query<{ template: string }>("SELECT template FROM notifications WHERE audience = 'customer' ORDER BY id");
    expect(told.map((n) => n.template)).toEqual(['visit_request_submitted', 'NTF-03.visit_request_approved']);
  });

  it('past or cancelled visits cannot take requests; staff never handle their own', async () => {
    const t = await setup();
    const maria = await t.signIn(...MARIA);
    const v = await t.visits(maria);
    const past = v.past[0]!;
    expect((await t.req('POST', `/v1/visits/${past.id}/requests`, maria, { type: 'cancel', message: 'Cancel please', idempotencyKey: 'req-key-past' })).statusCode).toBe(409);

    const created = (await t.req('POST', `/v1/visits/${v.upcoming[0]!.id}/requests`, maria, { type: 'cancel', message: 'Please cancel', idempotencyKey: 'req-key-own' })).json();
    await t.db.query(`INSERT INTO staff_roles (customer_id, role) SELECT id, 'Owner' FROM customers WHERE phone_e164 = $1`, [MARIA[1]]);
    expect((await t.req('POST', `/v1/staff/requests/${created.id}/transition`, maria, { to: 'approved' })).statusCode).toBe(403);
  });
});
