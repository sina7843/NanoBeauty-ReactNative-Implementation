import { otpVerifyResponseSchema } from '@nano/contracts';
import { buildApp } from './app';
import { openDb } from './db';
import { createDevIntegrations } from './integrations';
import { migrate } from './migrate';

// NANO-10 API budget check (NFR 02): in-process timings on in-memory PGlite for the hot read paths. This is a
// regression guard for the code, not a production measurement (that needs the hosted API, NANO-11).
//   npx tsx src/bench-cli.ts
const RUNS = 30;
const BUDGET_P95_MS: Record<string, number> = {
  'GET /v1/settings': 100,
  'GET /v1/catalog': 250,
  'GET /v1/content/home': 150,
  'GET /v1/visits': 250,
  'GET /v1/wallet': 250,
  'GET /v1/me/inbox': 200,
  'GET /v1/staff/services?filter=all': 300,
};

const db = await openDb(undefined);
await migrate(db);
const dev = createDevIntegrations();
const app = buildApp({ config: { NODE_ENV: 'test', LOG_LEVEL: 'silent' }, db, integrations: dev.integrations, auth: { devOtpSink: dev.otpSink } });
await app.ready();
const { challengeId } = (await app.inject({ method: 'POST', url: '/v1/auth/otp/start', payload: { phone: '7785550111' } })).json();
const token = otpVerifyResponseSchema.parse((await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { challengeId, code: dev.otpSink.get('+17785550111')! } })).json()).accessToken;
await db.query(`INSERT INTO staff_roles (customer_id, role) SELECT id, 'Owner' FROM customers WHERE phone_e164 = '+17785550111'`);

let failed = 0;
for (const [key, budget] of Object.entries(BUDGET_P95_MS)) {
  const [method, url] = key.split(' ') as ['GET', string];
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const res = await app.inject({ method, url, headers: { authorization: `Bearer ${token}` } });
    times.push(performance.now() - start);
    if (res.statusCode >= 400) throw new Error(`${key} → ${res.statusCode}`);
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(RUNS / 2)]!;
  const p95 = times[Math.floor(RUNS * 0.95)]!;
  const ok = p95 <= budget;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'SLOW'} ${key.padEnd(36)} p50 ${p50.toFixed(1)} ms  p95 ${p95.toFixed(1)} ms  (budget ${budget})`);
}
await app.close();
process.exitCode = failed ? 1 : 0;
