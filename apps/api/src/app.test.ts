import { errorEnvelopeSchema, settingsBootstrapSchema } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb, type Db } from './db';
import { applyDevSampleClinic } from './devSample';
import { createDevIntegrations } from './integrations';
import { migrate } from './migrate';

// Test DB strategy: in-process PGlite by default (no Docker); CI also runs this file against a real
// Postgres service by setting TEST_DATABASE_URL.
async function setup() {
  const db = await openDb(process.env.TEST_DATABASE_URL);
  await migrate(db);
  const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: createDevIntegrations().integrations });
  return { app, db };
}

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

describe('health', () => {
  it('reports liveness and readiness', async () => {
    const { app } = await setup();
    close = () => app.close();
    expect((await app.inject('/health/live')).json()).toEqual({ status: 'ok' });
    const ready = await app.inject('/health/ready');
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: 'ready', checks: { database: 'ok' } });
  });

  it('reports not ready with 503 when the database fails', async () => {
    const { db } = await setup();
    const broken: Db = { ...db, query: async () => Promise.reject(new Error('down')) };
    const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db: broken, integrations: createDevIntegrations().integrations });
    close = () => app.close();
    const res = await app.inject('/health/ready');
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'not_ready', checks: { database: 'fail' } });
  });
});

describe('GET /v1/settings', () => {
  it('returns the contract with handover defaults for pending decisions', async () => {
    const { app } = await setup();
    close = () => app.close();
    const res = await app.inject('/v1/settings');
    expect(res.statusCode).toBe(200);
    const body = settingsBootstrapSchema.parse(res.json());
    expect(body.settings.bookingMode).toBe('handoff'); // D33
    expect(body.settings.secondApprover.on).toBe(false); // D35
    expect(body.features.legacyMembership).toBe(false); // D38
    expect(body.settings.paymentMethods).toEqual({ card: true, applePay: false, googlePay: false, klarna: false, affirm: false });
    expect(body.settings.gift.expiry).toBeNull();
    expect(body.settings.sample).toBe(true);
    expect(body.clinic.timezone).toBe('America/Vancouver');
    expect(body.app).toEqual({
      minimumVersion: { ios: '1.0.0', android: '1.0.0' },
      storeUrl: { ios: null, android: null },
      maintenance: null,
    });
  });

  it('answers 304 for a matching ETag', async () => {
    const { app } = await setup();
    close = () => app.close();
    const first = await app.inject('/v1/settings');
    const etag = first.headers.etag as string;
    expect(etag).toMatch(/^"settings-v\d+"$/);
    const second = await app.inject({ url: '/v1/settings', headers: { 'if-none-match': etag } });
    expect(second.statusCode).toBe(304);
  });

  it('fails closed with a 500 envelope when the stored row violates the contract', async () => {
    const { app, db } = await setup();
    close = () => app.close();
    await db.exec(`UPDATE app_settings SET settings = settings || '{"bookingMode":"bogus"}'::jsonb WHERE id = 1;`);
    const res = await app.inject('/v1/settings');
    expect(res.statusCode).toBe(500);
    const body = errorEnvelopeSchema.parse(res.json());
    expect(body.error.code).toBe('internal_error');
    expect(body.error.message).not.toContain('bogus');
    await db.exec(`UPDATE app_settings SET settings = settings || '{"bookingMode":"handoff"}'::jsonb WHERE id = 1;`);
  });
});

describe('errors and request IDs', () => {
  it('returns the error envelope with the request ID for unknown routes', async () => {
    const { app } = await setup();
    close = () => app.close();
    const res = await app.inject({ url: '/nope', headers: { 'x-request-id': 'client-req-12345' } });
    expect(res.statusCode).toBe(404);
    expect(res.headers['x-request-id']).toBe('client-req-12345');
    expect(errorEnvelopeSchema.parse(res.json()).error).toMatchObject({ code: 'not_found', requestId: 'client-req-12345' });
  });

  it('replaces unsafe incoming request IDs', async () => {
    const { app } = await setup();
    close = () => app.close();
    const res = await app.inject({ url: '/health/live', headers: { 'x-request-id': 'bad id\nwith newline' } });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('migrations', () => {
  it('are idempotent', async () => {
    const db = await openDb(process.env.TEST_DATABASE_URL);
    close = () => db.close();
    await migrate(db);
    expect(await migrate(db)).toEqual([]);
  });
});

describe('config', () => {
  it('boots locally with no environment at all', () => {
    expect(loadConfig({})).toMatchObject({ APP_ENV: 'development', PORT: 4000, INTEGRATIONS_MODE: 'dev' });
  });

  it('refuses development adapters and a missing database in production', () => {
    expect(() => loadConfig({ APP_ENV: 'production' })).toThrow(/DATABASE_URL.*INTEGRATIONS_MODE/s);
  });

  it('refuses NODE_ENV=production without an explicit deployment tier', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/APP_ENV/);
  });

  it('refuses the OTP sink and sample legacy data anywhere but local development', () => {
    const staging = { APP_ENV: 'staging', DATABASE_URL: 'postgres://u:p@db.example/x' };
    expect(() => loadConfig({ ...staging, DEV_OTP_SINK: 'true' })).toThrow(/DEV_OTP_SINK/);
    expect(() => loadConfig({ ...staging, DEV_SAMPLE_LEGACY: 'true' })).toThrow(/DEV_SAMPLE_LEGACY/);
    expect(loadConfig({ DEV_OTP_SINK: 'true' }).DEV_OTP_SINK).toBe(true);
  });

  it('D-QA-06: the sample clinic switch is refused anywhere but local development', () => {
    const staging = { APP_ENV: 'staging', DATABASE_URL: 'postgres://u:p@db.example/x' };
    expect(() => loadConfig({ ...staging, DEV_SAMPLE_CLINIC: 'true' })).toThrow(/DEV_SAMPLE_CLINIC/);
    expect(loadConfig({ DEV_SAMPLE_CLINIC: 'true' }).DEV_SAMPLE_CLINIC).toBe(true);
  });

  it('never echoes values in error messages', () => {
    expect(() => loadConfig({ DATABASE_URL: 'not a url but secret-ish' })).toThrow(/^(?!.*secret-ish)/s);
  });
});

describe('dev integrations', () => {
  it('payments are idempotent and never auto-complete', async () => {
    const { integrations } = createDevIntegrations();
    const a = await integrations.payments.createIntent({ idempotencyKey: 'k1', amountCents: 5000, context: 'gift', method: 'card' });
    const b = await integrations.payments.createIntent({ idempotencyKey: 'k1', amountCents: 5000, context: 'gift', method: 'card' });
    expect(a.providerRef).toBe(b.providerRef);
    expect(a.status).toBe('requires_action');
    expect((await integrations.payments.getStatus(a.providerRef)).status).toBe('requires_action');
    // Webhooks with a bad signature are rejected.
    expect(integrations.payments.parseWebhook('{"eventId":"e","providerRef":"x","type":"payment.updated"}', 'nope')).toBeNull();
  });

  it('OTP codes are random, single-use, expire, and only visible in the dev sink', async () => {
    let t = 0;
    const { integrations, otpSink } = createDevIntegrations({ now: () => t });
    const { providerRef } = await integrations.otp.send('+16045550100');
    const code = otpSink.get('+16045550100')!;
    expect(code).toMatch(/^\d{6}$/);
    expect(await integrations.otp.check(providerRef, code === '111111' ? '222222' : '111111')).toBe('wrong');
    expect(await integrations.otp.check(providerRef, code)).toBe('approved');
    expect(await integrations.otp.check(providerRef, code)).toBe('expired');
    const second = await integrations.otp.send('+16045550100');
    t = 11 * 60_000;
    expect(await integrations.otp.check(second.providerRef, otpSink.get('+16045550100')!)).toBe('expired');
  });

  it('Fresha and legacy report not connected instead of inventing data', async () => {
    const { integrations } = createDevIntegrations();
    expect(integrations.fresha.handoffUrl()).toBeNull();
    expect(await integrations.fresha.readVisits('c1')).toEqual({ status: 'not_connected' });
    expect(await integrations.legacy.findByPhone('+16045550100')).toEqual({ status: 'not_connected' });
  });
});

describe('development sample clinic (D-QA-06)', () => {
  it('fills a 555 phone and weekly hours marked Sample, and never overwrites what the clinic set', async () => {
    const { app, db } = await setup();
    close = () => app.close();
    await db.query(`UPDATE app_settings SET clinic = clinic - 'phone', settings = settings - 'clinicHours' WHERE id = 1`);
    expect(await applyDevSampleClinic(db)).toBe(true);
    const boot = settingsBootstrapSchema.parse((await app.inject('/v1/settings')).json());
    expect(boot.clinic.phone).toMatch(/555/);
    expect(boot.settings.clinicHours?.weekly.length).toBeGreaterThan(0);
    expect(boot.settings.sample).toBe(true);
    expect(await applyDevSampleClinic(db)).toBe(false); // already there
    await db.query(`UPDATE app_settings SET clinic = jsonb_set(clinic, '{phone}', '"(604) 123-4567"') WHERE id = 1`);
    await applyDevSampleClinic(db);
    expect(settingsBootstrapSchema.parse((await app.inject('/v1/settings')).json()).clinic.phone).toBe('(604) 123-4567');
  });
});
