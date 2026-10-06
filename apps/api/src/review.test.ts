import { otpVerifyResponseSchema } from '@nano/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';
import { createDevIntegrations, withReviewAccount } from './integrations';
import { migrate } from './migrate';

let close: (() => Promise<unknown>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

describe('App Review sign-in (NANO-11)', () => {
  it('config: both values or neither, a real 6-digit code, never a trivial one', () => {
    const soon = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    expect(() => loadConfig({ REVIEW_PHONE: '+16045550100' })).toThrow(/REVIEW_CODE/);
    expect(() => loadConfig({ REVIEW_PHONE: '+16045550100', REVIEW_CODE: '482913' })).toThrow(/REVIEW_EXPIRES/);
    expect(() => loadConfig({ REVIEW_PHONE: '+16045550100', REVIEW_CODE: '111111', REVIEW_EXPIRES: soon })).toThrow(/too easy/);
    expect(() => loadConfig({ REVIEW_PHONE: '6045550100', REVIEW_CODE: '482913', REVIEW_EXPIRES: soon })).toThrow(/REVIEW_PHONE/);
    expect(() => loadConfig({ REVIEW_PHONE: '+16045550100', REVIEW_CODE: '482913', REVIEW_EXPIRES: new Date(Date.now() + 90 * 24 * 3600_000).toISOString() })).toThrow(/60 days/);
    expect(loadConfig({ REVIEW_PHONE: '+16045550100', REVIEW_CODE: '482913', REVIEW_EXPIRES: soon }).REVIEW_CODE).toBe('482913');
    expect(loadConfig({}).REVIEW_PHONE).toBeUndefined();
  });

  it('the review number signs in with its code and gets no text; everyone else is unchanged', async () => {
    const db = await openDb(process.env.TEST_DATABASE_URL);
    await migrate(db);
    await db.exec('TRUNCATE consents, used_refresh_tokens, sessions, auth_locks, otp_challenges, customers CASCADE;');
    const dev = createDevIntegrations();
    const clock = { t: Date.parse('2026-10-07T17:00:00Z') };
    dev.integrations.otp = withReviewAccount(dev.integrations.otp, { phone: '+16045550100', code: '482913', expiresAt: clock.t + 24 * 3600_000 }, () => clock.t);
    const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { now: () => clock.t, devOtpSink: dev.otpSink } });
    close = () => app.close();
    const start = async (phone: string) => (await app.inject({ method: 'POST', url: '/v1/auth/otp/start', payload: { phone } })).json();
    const verify = (challengeId: string, code: string) => app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { challengeId, code } });

    const review = await start('6045550100');
    expect(dev.otpSink.has('+16045550100')).toBe(false); // nothing sent
    expect((await verify(review.challengeId, '000000')).statusCode).not.toBe(200); // wrong code counts as an attempt
    expect(otpVerifyResponseSchema.parse((await verify(review.challengeId, '482913')).json()).accessToken).toBeTruthy();

    const other = await start('6045550123');
    expect(dev.otpSink.get('+16045550123')).toMatch(/^\d{6}$/);
    expect((await verify(other.challengeId, '482913')).statusCode).not.toBe(200); // the review code works nowhere else

    // After the expiry the number gets a real text like anyone else.
    clock.t += 2 * 24 * 3600_000;
    await start('6045550100');
    expect(dev.otpSink.get('+16045550100')).toMatch(/^\d{6}$/);
  });
});
