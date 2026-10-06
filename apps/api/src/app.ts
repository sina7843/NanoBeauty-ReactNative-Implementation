import { randomUUID } from 'node:crypto';
import {
  REQUEST_ID_HEADER,
  redactText,
  type BookingMode,
  settingsBootstrapSchema,
  type ErrorCode,
  type ErrorEnvelope,
  type Readiness,
} from '@nano/contracts';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config';
import type { Db } from './db';
import { registerAccountRoutes } from './account/routes';
import { registerAuthRoutes } from './auth/routes';
import { registerContentRoutes } from './content/routes';
import { registerVisitRoutes } from './visits/routes';
import { HttpError } from './errors';
import { effectiveBookingMode } from './bookingGate';
import type { Integrations } from './integrations';
import { registerEntityRoutes, type ApprovalHandler } from './staff/entities';
import { registerOpsRoutes } from './staff/ops';
import { registerStaffRoutes } from './staff/routes';
import { registerWalletRoutes, type WalletKit } from './wallet/routes';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    integrations: Integrations;
    /** Background work the server runs on a timer (gift sends, payment reconciliation); set once routes load. */
    jobs: { wallet?: WalletKit };
    /** Approvals queue dispatch for NANO-08 draftable items (services are handled in staff/routes.ts). */
    approvalHandlers: Map<string, ApprovalHandler>;
    /** Every registered route (method + URL), for the authorization sweep and the release audit. */
    routeList: { method: string; url: string }[];
  }
}

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
  503: 'service_unavailable',
};

function sendError(
  request: FastifyRequest,
  reply: FastifyReply,
  status: number,
  code: ErrorCode,
  message: string,
  extra: Partial<Omit<ErrorEnvelope['error'], 'code' | 'message' | 'requestId'>> = {},
) {
  const body: ErrorEnvelope = { error: { code, message, requestId: request.id, ...extra } };
  if (extra.retryAfterSeconds) reply.header('retry-after', String(extra.retryAfterSeconds));
  return reply.status(status).send(body);
}

export interface AppDeps {
  config: Pick<Config, 'LOG_LEVEL' | 'NODE_ENV'> & Partial<Pick<Config, 'TRUST_PROXY'>>;
  db: Db;
  integrations: Integrations;
  /** Injectable clock and the dev-only OTP sink (tests, local QA). */
  auth?: { now?: () => number; devOtpSink?: Map<string, string> };
}

/** Request-log URL without secrets: the deletion status token is a bearer value for its request's status. */
export const redactUrl = (url: string) => url.replace(/(\/v1\/privacy\/deletion\/)[0-9a-f-]{36}/i, '$1:token');

export function buildApp({ config, db, integrations, auth = {} }: AppDeps) {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            // Structured, non-sensitive: never log credentials or session material.
            redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            // URLs only, with bearer-like path segments (deletion status token) masked.
            serializers: {
              req: (req: { method: string; url: string; id: string }) => ({ method: req.method, url: redactUrl(req.url), id: req.id }),
            },
          },
    // Accept a caller's request ID only if it is a safe token; otherwise mint one.
    genReqId: (req) => {
      const incoming = req.headers[REQUEST_ID_HEADER];
      return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    },
    bodyLimit: 1_048_576,
    // Hop count, never true: the per-IP auth throttle must see the real client, not a spoofable header.
    trustProxy: (_address: string, hop: number) => hop < (config.TRUST_PROXY ?? 0),
  });

  app.decorate('db', db);
  app.decorate('integrations', integrations);
  app.decorate('jobs', {});
  app.decorate('approvalHandlers', new Map<string, ApprovalHandler>());
  app.decorate('routeList', []);
  app.addHook('onRoute', (route) => {
    for (const method of [route.method].flat()) if (method !== 'HEAD') app.routeList.push({ method, url: route.url });
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
    // Baseline hardening for every response (JSON API; the deletion web page sets its own when hosted, NANO-11).
    reply.header('x-content-type-options', 'nosniff').header('referrer-policy', 'no-referrer').header('x-frame-options', 'DENY');
  });
  app.addHook('onClose', async () => {
    await db.close();
  });

  app.setNotFoundHandler((request, reply) => sendError(request, reply, 404, 'not_found', 'Route not found.'));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return sendError(request, reply, error.statusCode, error.code, error.message, error.extra);
    }
    if (error instanceof ZodError) {
      const details = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return sendError(request, reply, 400, 'validation_failed', 'Request validation failed.', { details });
    }
    const err = error as { statusCode?: number; validation?: unknown; message?: string };
    if (err.validation) return sendError(request, reply, 400, 'validation_failed', 'Request validation failed.');
    const status = err.statusCode ?? 500;
    if (status < 500) {
      return sendError(request, reply, status, STATUS_CODES[status] ?? 'bad_request', err.message ?? 'Bad request.');
    }
    request.log.error({ err: error }, 'unhandled error');
    // Crash/error telemetry: message redacted (no contact details, codes or tokens), traced by request ID.
    integrations.errors.capture({ message: redactText(error instanceof Error ? error.message : String(error)), code: 'internal_error', requestId: request.id, where: redactUrl(request.url) });
    return sendError(request, reply, 500, 'internal_error', 'Something went wrong. Try again.');
  });

  // Identity, sessions, consents, legacy match and staff permission checks (NANO-02). Scoped so the per-IP
  // rate limiter only applies to the routes that opt in.
  app.register(async (scope) => {
    await scope.register(rateLimit, { global: false });
    const kit = registerAuthRoutes(scope, { now: auth.now ?? Date.now, devOtpSink: auth.devOtpSink });
    registerAccountRoutes(scope, { now: auth.now ?? Date.now, kit });
    // Public discovery content (NANO-03): catalogue, offers, promo checks, support, policies.
    registerContentRoutes(scope, { now: auth.now ?? Date.now });
    // Fresha hand-off, visits and visit requests (NANO-04).
    registerVisitRoutes(scope, { now: auth.now ?? Date.now });
    // Payments, wallet, gifts and counter redemption (NANO-06).
    app.jobs.wallet = registerWalletRoutes(scope, { now: auth.now ?? Date.now, kit });
    // Staff workspace core and content governance (NANO-07).
    registerStaffRoutes(scope, { now: auth.now ?? Date.now });
    // Staff selling, operations, settings and reports (NANO-08).
    registerEntityRoutes(scope, { now: auth.now ?? Date.now });
    registerOpsRoutes(scope, { now: auth.now ?? Date.now });
  });

  app.get('/health/live', async () => ({ status: 'ok' as const }));

  app.get('/health/ready', async (request, reply) => {
    let database: Readiness['checks']['database'] = 'ok';
    try {
      await db.query('SELECT 1');
    } catch (err) {
      request.log.warn({ err }, 'readiness: database check failed');
      database = 'fail';
    }
    const body: Readiness = { status: database === 'ok' ? 'ready' : 'not_ready', checks: { database } };
    return reply.status(database === 'ok' ? 200 : 503).send(body);
  });

  // Public, cacheable bootstrap: settings + feature flags + clinic info. Validated on the way out so a
  // bad row surfaces as a 500 here instead of undefined behaviour in the app.
  app.get('/v1/settings', async (request, reply) => {
    const [row] = await db.query<{
      version: number;
      settings: unknown;
      features: unknown;
      clinic: unknown;
      app: unknown;
      updated_at: Date;
    }>('SELECT version, settings, features, clinic, app, updated_at FROM app_settings WHERE id = 1');
    if (!row) return sendError(request, reply, 503, 'service_unavailable', 'Settings are not initialised.');

    const etag = `"settings-v${row.version}"`;
    reply.header('etag', etag).header('cache-control', 'no-cache');
    if (request.headers['if-none-match'] === etag) return reply.status(304).send();

    const stored = row.settings as { bookingMode: BookingMode };
    const parsed = settingsBootstrapSchema.safeParse({
      version: row.version,
      updatedAt: row.updated_at.toISOString(),
      // D33: apps only ever see the mode that can really work (in-app needs a selected booking provider).
      settings: { ...stored, bookingMode: effectiveBookingMode(stored.bookingMode, integrations) },
      features: row.features,
      clinic: row.clinic,
      app: row.app,
    });
    if (!parsed.success) throw new Error(`Stored settings v${row.version} violate the contract: ${parsed.error.message}`);
    return parsed.data;
  });

  return app;
}
