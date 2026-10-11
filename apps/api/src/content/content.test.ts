import {
  catalogSchema,
  errorEnvelopeSchema,
  homeContentSchema,
  offerResponseSchema,
  otpVerifyResponseSchema,
  policySchema,
  promoValidateResponseSchema,
  supportHubSchema,
} from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { openDb } from '../db';
import { createDevIntegrations } from '../integrations';
import { migrate } from '../migrate';
import { onboard } from '../testOnboard';
import { matchesTarget, offerState } from './routes';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

async function setup(at = '2026-10-06T17:00:00Z') {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec('TRUNCATE support_questions, promo_redemptions, legacy_match_cases, consents, used_refresh_tokens, sessions, otp_challenges, customers CASCADE;');
  const clock = { t: Date.parse(at) };
  const dev = createDevIntegrations({ now: () => clock.t });
  const app = buildApp({
    config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
    db,
    integrations: dev.integrations,
    auth: { now: () => clock.t, devOtpSink: dev.otpSink },
  });
  close = () => app.close();
  const get = (url: string, headers: Record<string, string> = {}) => app.inject({ url, headers });
  const post = (url: string, payload: object, token?: string) =>
    app.inject({ method: 'POST', url, payload, headers: token ? { authorization: `Bearer ${token}` } : {} });
  async function signIn() {
    const { challengeId } = (await post('/v1/auth/otp/start', { phone: '6045550123' })).json();
    const session = otpVerifyResponseSchema.parse((await post('/v1/auth/otp/verify', { challengeId, code: dev.otpSink.get('+16045550123')! })).json());
    await onboard(db, '+16045550123');
    return session;
  }
  return { app, db, clock, get, post, signIn };
}

describe('catalog (DISC 02, 03, 06, 07)', () => {
  it('serves only customer-visible services with aliases, concerns and price kinds', async () => {
    const t = await setup();
    const res = await t.get('/v1/catalog');
    const catalog = catalogSchema.parse(res.json());
    const ids = catalog.services.map((s) => s.id);
    expect(ids).toContain('svc_hifu');
    expect(ids).not.toContain('svc_new_01'); // draft never leaves the server
    expect(catalog.services.find((s) => s.id === 'svc_antiwrinkle')).toMatchObject({ aliases: ['botox'], price: { kind: 'consultation' } });
    expect(catalog.services.find((s) => s.id === 'svc_prp_hair')?.status).toBe('unavailable');
    expect(new Set(catalog.services.map((s) => s.price.kind))).toEqual(new Set(['from', 'fixed', 'perUnit', 'consultation']));
  });

  it('never exposes a professional profile without consent', async () => {
    const t = await setup();
    let catalog = catalogSchema.parse((await t.get('/v1/catalog')).json());
    expect(catalog.professionals.every((p) => p.profile === null)).toBe(true);
    await t.db.query("UPDATE professionals SET profile_consent = true WHERE id = 'stf_naz'");
    catalog = catalogSchema.parse((await t.get('/v1/catalog')).json());
    expect(catalog.professionals.find((p) => p.id === 'stf_naz')?.profile).toMatchObject({ photo: 'team-naz' });
  });

  it('is cacheable: unchanged content answers 304', async () => {
    const t = await setup();
    const first = await t.get('/v1/catalog');
    const etag = first.headers.etag as string;
    expect((await t.get('/v1/catalog', { 'if-none-match': etag })).statusCode).toBe(304);
    await t.db.query("UPDATE services SET name = 'HIFU 12D' WHERE id = 'svc_hifu'");
    expect((await t.get('/v1/catalog', { 'if-none-match': etag })).statusCode).toBe(200);
  });
});

describe('offers (PROMO 02, 05, 09, 11)', () => {
  it('home carries at most two offers in staff order, with state from the server clock', async () => {
    const t = await setup();
    const home = homeContentSchema.parse((await t.get('/v1/content/home')).json());
    expect(home.offers.map((o) => [o.id, o.state])).toEqual([
      ['cmp_autumn_laser', 'live'],
      ['cmp_halloween', 'upcoming'],
    ]);
    expect(home.serverTime).toBe('2026-10-06T17:00:00.000Z');
  });

  it('ended offers leave Home and point to a safe destination with a live alternative', async () => {
    const t = await setup('2026-11-02T12:00:00Z');
    const home = homeContentSchema.parse((await t.get('/v1/content/home')).json());
    expect(home.offers).toEqual([]);
    const res = offerResponseSchema.parse((await t.get('/v1/offers/cmp_autumn_laser')).json());
    expect(res.offer.state).toBe('expired');
    expect(res.offer.fallback).toEqual({ label: 'See laser treatments', href: '/treatments/list?category=laser' });
  });

  it('paused offers say so; unknown offers are 404', async () => {
    const t = await setup();
    await t.db.query("UPDATE campaigns SET paused = true WHERE id = 'cmp_autumn_laser'");
    const res = offerResponseSchema.parse((await t.get('/v1/offers/cmp_autumn_laser')).json());
    expect(res.offer.state).toBe('paused');
    expect(errorEnvelopeSchema.parse((await t.get('/v1/offers/nope')).json()).error.code).toBe('not_found');
  });

  it('computes state at the exact boundaries', () => {
    const c = { starts_at: new Date('2026-10-01T16:00:00Z'), ends_at: new Date('2026-11-01T06:59:00Z'), paused: false };
    expect(offerState(c, Date.parse('2026-10-01T15:59:59Z'))).toBe('upcoming');
    expect(offerState(c, Date.parse('2026-10-01T16:00:00Z'))).toBe('live');
    expect(offerState(c, Date.parse('2026-11-01T06:59:00Z'))).toBe('expired');
  });
});

describe('promo codes (PROMO 06)', () => {
  const check = async (t: Awaited<ReturnType<typeof setup>>, code: string, appliesTo?: string, token?: string) =>
    promoValidateResponseSchema.parse((await t.post('/v1/promo/validate', { code, ...(appliesTo ? { appliesTo } : {}) }, token)).json());

  it('covers valid, invalid, ended, not yet, used up, not eligible and already used', async () => {
    const t = await setup();
    expect(await check(t, ' glow25 ')).toMatchObject({ state: 'valid', code: 'GLOW25', appliesLabel: 'laser packages' });
    expect((await check(t, 'NOPE')).state).toBe('invalid');
    expect((await check(t, 'HALLO25')).state).toBe('ended');
    // Not-yet and ended codes don't leak what they are.
    expect(await check(t, 'BFRIDAY')).toMatchObject({ state: 'notyet', startsAt: '2026-11-27T08:00:00.000Z', description: null, appliesLabel: null });
    expect((await check(t, 'GLOW25', 'category:facials')).state).toBe('noteligible');
    // FE-6: checked from an offer page, a code for another campaign doesn't apply; its own campaign's code does.
    expect((await check(t, 'GLOW25', 'offer:cmp_halloween')).state).toBe('noteligible');
    expect((await check(t, 'GLOW25', 'offer:cmp_autumn_laser')).state).toBe('valid');

    t.clock.t = Date.parse('2026-10-21T17:00:00Z');
    await t.db.query("UPDATE promo_codes SET used = total_limit WHERE code = 'HALLO26'");
    expect((await check(t, 'HALLO26')).state).toBe('usedup');

    const session = await t.signIn();
    await t.db.query(
      "INSERT INTO promo_redemptions (code, customer_id, redeemed_at) SELECT 'WELCOME20', id, '2026-09-12T18:00:00Z' FROM customers",
    );
    expect(await check(t, 'WELCOME20', undefined, session.accessToken)).toMatchObject({ state: 'alreadyused', usedAt: '2026-09-12T18:00:00.000Z' });
    expect((await check(t, 'WELCOME20')).state).toBe('valid'); // anonymous check can't know; purchase re-checks
    // A stale token degrades to the anonymous check instead of failing.
    expect((await check(t, 'GLOW25', undefined, 'not-a-real-token')).state).toBe('valid');
  });

  it('matches targets precisely', () => {
    expect(matchesTarget('package:laser', 'package:laser')).toBe(true);
    expect(matchesTarget('package:any', 'package:laser')).toBe(true);
    expect(matchesTarget('package:laser', 'category:laser')).toBe(false);
  });
});

describe('support and policies (SUP 01–05, ACC-11)', () => {
  it('serves the hub, articles and versioned policies', async () => {
    const t = await setup();
    const hub = supportHubSchema.parse((await t.get('/v1/support')).json());
    expect(hub.articles.map((a) => a.id)).toEqual(['change-or-cancel', 'deposits']);
    expect(hub.askTopics).toContain('Something else');
    expect((await t.get('/v1/support/articles/deposits')).json()).toMatchObject({ title: 'How do deposits work?', sample: true });
    expect(policySchema.parse((await t.get('/v1/policies/booking')).json())).toMatchObject({ version: '1.0', updatedOn: '2026-09-25' });
  });

  it('Ask us needs a signed-in customer and returns a reference', async () => {
    const t = await setup();
    const payload = { topic: 'Unwanted hair', channel: 'text', message: 'Is laser OK for tanned skin?', idempotencyKey: 'key-0001' };
    expect((await t.post('/v1/support/questions', payload)).statusCode).toBe(401);
    const session = await t.signIn();
    expect((await t.post('/v1/support/questions', { ...payload, message: '' }, session.accessToken)).statusCode).toBe(400);
    const res = await t.post('/v1/support/questions', payload, session.accessToken);
    expect(res.json().reference).toMatch(/^SUP-[0-9A-F]{6}$/);
    // A retry with the same key (response lost) returns the same reference and stores nothing new.
    const retry = await t.post('/v1/support/questions', payload, session.accessToken);
    expect(retry.json().reference).toBe(res.json().reference);
    const rows = await t.db.query<{ topic: string; channel: string }>('SELECT topic, channel FROM support_questions');
    expect(rows).toEqual([{ topic: 'Unwanted hair', channel: 'text' }]);
  });
});
