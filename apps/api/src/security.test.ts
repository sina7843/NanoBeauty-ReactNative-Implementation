import { otpVerifyResponseSchema } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { openDb } from './db';
import { createDevIntegrations } from './integrations';
import { migrate } from './migrate';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

/** Routes that are meant to work without a session (public content, sign-in, web gift/deletion, webhook, health). */
const PUBLIC = [
  /^\/health\//,
  /^\/v1\/settings$/,
  /^\/v1\/catalog$/,
  /^\/v1\/content\/home$/,
  /^\/v1\/offers\/:id$/,
  /^\/v1\/promo\/validate$/,
  /^\/v1\/support(\/articles\/:id)?$/,
  /^\/v1\/policies\/:id$/,
  /^\/v1\/packages$/,
  /^\/v1\/media\/:id$/,
  /^\/v1\/auth\/(otp\/start|otp\/verify|refresh)$/,
  /^\/v1\/gifts\/(lookup|claim\/start|claim\/confirm)$/,
  /^\/v1\/privacy\/deletion\/(start|confirm|:token)$/,
  /^\/v1\/payments\/webhook$/,
  /^\/v1\/dev\/otp$/,
];
const UUID = '3f2c1b8e-1a2b-4c3d-8e9f-0123456789ab';

async function setup() {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  await db.exec('TRUNCATE staff_roles, consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, customers CASCADE;');
  const clock = { t: Date.parse('2026-10-07T17:00:00Z') };
  const dev = createDevIntegrations({ now: () => clock.t });
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { now: () => clock.t, devOtpSink: dev.otpSink } });
  close = () => app.close();
  await app.ready();
  const { challengeId } = (await app.inject({ method: 'POST', url: '/v1/auth/otp/start', payload: { phone: '6045550123' } })).json();
  const token = otpVerifyResponseSchema.parse((await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { challengeId, code: dev.otpSink.get('+16045550123')! } })).json()).accessToken;
  return { app, token };
}

const fill = (url: string) => url.replace(/:[A-Za-z]+/g, (p) => (p === ':template' ? 'own' : p === ':action' ? 'publish' : UUID));

describe('authorization sweep (NFR 04, D34)', () => {
  it('every non-public route refuses a caller without a session', async () => {
    const { app } = await setup();
    const routes = app.routeList.filter((r) => r.url.startsWith('/v1/') && !PUBLIC.some((p) => p.test(r.url)));
    expect(routes.length).toBeGreaterThan(100);
    const open: string[] = [];
    for (const r of routes) {
      const res = await app.inject({ method: r.method as 'GET', url: fill(r.url), payload: r.method === 'GET' ? undefined : {} });
      if (res.statusCode !== 401) open.push(`${r.method} ${r.url} → ${res.statusCode}`);
    }
    expect(open).toEqual([]);
  });

  it('every staff route refuses a signed-in customer with the missing permission', async () => {
    const { app, token } = await setup();
    const staff = app.routeList.filter((r) => r.url.startsWith('/v1/staff'));
    expect(staff.length).toBeGreaterThan(80);
    const leaks: string[] = [];
    for (const r of staff) {
      const res = await app.inject({ method: r.method as 'GET', url: fill(r.url), payload: r.method === 'GET' ? undefined : {}, headers: { authorization: `Bearer ${token}` } });
      if (res.statusCode !== 403 || !res.json().error?.missingPermission) leaks.push(`${r.method} ${r.url} → ${res.statusCode}`);
    }
    expect(leaks).toEqual([]);
  });

  it('responses carry nosniff and never echo stack traces', async () => {
    const { app } = await setup();
    const res = await app.inject({ method: 'GET', url: '/v1/nope' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.body).not.toMatch(/at \w+ \(/);
  });
});
