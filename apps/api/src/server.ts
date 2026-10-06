import { runDueDeletions } from './account/routes';
import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';
import { createDevIntegrations } from './integrations';
import { migrate } from './migrate';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const config = loadConfig();
const db = await openDb(config.DATABASE_URL);
// In-memory PGlite starts empty every run; a real Postgres is migrated by the `migrate` deploy step.
if (!config.DATABASE_URL) await migrate(db);

const { integrations, otpSink } = createDevIntegrations({
  freshaBookingUrl: config.FRESHA_BOOKING_URL,
  sampleLegacy: config.DEV_SAMPLE_LEGACY,
  sampleFresha: config.DEV_SAMPLE_FRESHA,
});
const app = buildApp({ config, db, integrations, auth: config.DEV_OTP_SINK ? { devOtpSink: otpSink } : {} });

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'shutting down');
    // Fastify answers new requests with 503 while in-flight ones finish; onClose closes the DB.
    const force = setTimeout(() => {
      app.log.error('graceful shutdown timed out');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error({ err }, 'shutdown failed');
        process.exit(1);
      },
    );
  });
}

// Deletions whose grace period has ended (PRIV 04). Idempotent, so overlapping instances can't double-run one.
// ponytail: in-process timer; move to the platform scheduler when the API is hosted (open item).
const deletions = setInterval(() => {
  runDueDeletions(db, integrations, Date.now(), (requestId, err) => app.log.error({ err, requestId }, 'deletion failed; will retry')).catch((err: unknown) => app.log.error({ err }, 'deletion run failed'));
}, 3600_000);
deletions.unref();
app.addHook('onClose', async () => clearInterval(deletions));

await app.listen({ host: config.HOST, port: config.PORT });
app.log.info(
  { appEnv: config.APP_ENV, database: config.DATABASE_URL ? 'postgres' : 'pglite-memory', integrations: config.INTEGRATIONS_MODE },
  'api ready',
);
