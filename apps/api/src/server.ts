import { runDueDeletions } from './account/routes';
import { buildApp } from './app';
import { dueGiftIds, pendingRefundIds, staleAttemptIds } from './wallet/routes';
import { loadConfig } from './config';
import { openDb } from './db';
import { createDevIntegrations, withReviewAccount } from './integrations';
import { migrate } from './migrate';
import { deliverPushMessages, dispatchDue, queueReminders } from './notifications/dispatch';

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
const review = config.REVIEW_PHONE && config.REVIEW_CODE && config.REVIEW_EXPIRES ? { phone: config.REVIEW_PHONE, code: config.REVIEW_CODE, expiresAt: Date.parse(config.REVIEW_EXPIRES) } : null;
integrations.otp = withReviewAccount(integrations.otp, review);
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

// Scheduled gift sends and payments left open (app closed mid-payment): every minute, idempotent.
// ponytail: in-process timer like deletions; move to the platform scheduler with hosting (open item).
let walletBusy = false;
const walletJobs = setInterval(async () => {
  const wallet = app.jobs.wallet;
  if (!wallet || walletBusy) return; // a long run never overlaps the next tick
  walletBusy = true;
  // Each item on its own: one failure is logged (by id only) and the rest still run.
  const each = async (ids: string[], run: (id: string) => Promise<unknown>, what: string) => {
    for (const id of ids) await run(id).catch((err: unknown) => app.log.error({ err, id }, `${what} failed; retried next minute`));
  };
  try {
    const t = Date.now();
    await each(await dueGiftIds(db, t), (id) => wallet.deliverGift(id), 'gift send');
    await each(await staleAttemptIds(db, t), (id) => wallet.reconcileById(id), 'payment check');
    await each(await pendingRefundIds(db, t), (id) => wallet.retryRefund(id), 'refund check');
  } catch (err) {
    app.log.error({ err }, 'wallet jobs failed');
  } finally {
    walletBusy = false;
  }
}, 60_000);
walletJobs.unref();
app.addHook('onClose', async () => clearInterval(walletJobs));

// Notification delivery (NANO-09): reminders queued (only when the app is the sender), the outbox dispatched and
// scheduled marketing pushes sent. Every minute, idempotent (dedupe keys, unique delivery rows, claimed pushes).
// ponytail: in-process timer like the others; move to the platform scheduler with hosting (open item).
let notifyBusy = false;
const notifyJobs = setInterval(async () => {
  if (notifyBusy) return;
  notifyBusy = true;
  try {
    const t = Date.now();
    await queueReminders(db, t);
    await dispatchDue(db, integrations, t, (id, err) => app.log.error({ err, id }, 'notification failed; retried next minute'));
    await deliverPushMessages(db, integrations, t);
  } catch (err) {
    app.log.error({ err }, 'notification jobs failed');
  } finally {
    notifyBusy = false;
  }
}, 60_000);
notifyJobs.unref();
app.addHook('onClose', async () => clearInterval(notifyJobs));

if (review) app.log.warn({ until: config.REVIEW_EXPIRES }, 'App Review sign-in is ON; remove REVIEW_* after the review');

await app.listen({ host: config.HOST, port: config.PORT });
app.log.info(
  { appEnv: config.APP_ENV, database: config.DATABASE_URL ? 'postgres' : 'pglite-memory', integrations: config.INTEGRATIONS_MODE },
  'api ready',
);
