import { randomUUID } from 'node:crypto';
import {
  REQUEST_ID_HEADER,
  settingsBootstrapSchema,
  type ErrorCode,
  type ErrorEnvelope,
  type Readiness,
} from '@nano/contracts';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config';
import type { Db } from './db';
import type { Integrations } from './integrations';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    integrations: Integrations;
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
  details?: ErrorEnvelope['error']['details'],
) {
  const body: ErrorEnvelope = { error: { code, message, requestId: request.id, ...(details ? { details } : {}) } };
  return reply.status(status).send(body);
}

export interface AppDeps {
  config: Pick<Config, 'LOG_LEVEL' | 'NODE_ENV'>;
  db: Db;
  integrations: Integrations;
}

export function buildApp({ config, db, integrations }: AppDeps) {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            // Structured, non-sensitive: never log credentials or session material.
            redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          },
    // Accept a caller's request ID only if it is a safe token; otherwise mint one.
    genReqId: (req) => {
      const incoming = req.headers[REQUEST_ID_HEADER];
      return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    },
    bodyLimit: 1_048_576,
  });

  app.decorate('db', db);
  app.decorate('integrations', integrations);
  app.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });
  app.addHook('onClose', async () => {
    await db.close();
  });

  app.setNotFoundHandler((request, reply) => sendError(request, reply, 404, 'not_found', 'Route not found.'));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const details = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return sendError(request, reply, 400, 'validation_failed', 'Request validation failed.', details);
    }
    const err = error as { statusCode?: number; validation?: unknown; message?: string };
    if (err.validation) return sendError(request, reply, 400, 'validation_failed', 'Request validation failed.');
    const status = err.statusCode ?? 500;
    if (status < 500) {
      return sendError(request, reply, status, STATUS_CODES[status] ?? 'bad_request', err.message ?? 'Bad request.');
    }
    request.log.error({ err: error }, 'unhandled error');
    return sendError(request, reply, 500, 'internal_error', 'Something went wrong. Try again.');
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
      updated_at: Date;
    }>('SELECT version, settings, features, clinic, updated_at FROM app_settings WHERE id = 1');
    if (!row) return sendError(request, reply, 503, 'service_unavailable', 'Settings are not initialised.');

    const etag = `"settings-v${row.version}"`;
    reply.header('etag', etag).header('cache-control', 'no-cache');
    if (request.headers['if-none-match'] === etag) return reply.status(304).send();

    const parsed = settingsBootstrapSchema.safeParse({
      version: row.version,
      updatedAt: row.updated_at.toISOString(),
      settings: row.settings,
      features: row.features,
      clinic: row.clinic,
    });
    if (!parsed.success) throw new Error(`Stored settings v${row.version} violate the contract: ${parsed.error.message}`);
    return parsed.data;
  });

  return app;
}
