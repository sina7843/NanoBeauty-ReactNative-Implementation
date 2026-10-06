import { randomBytes } from 'node:crypto';
import {
  consentsRequestSchema,
  maskPhone,
  matchDecisionRequestSchema,
  normalizePhone,
  otpStartRequestSchema,
  otpVerifyRequestSchema,
  profileRequestSchema,
  refreshRequestSchema,
  staffMatchResolutionSchema,
  type MatchResult,
  type Me,
  type OtpStartResponse,
  type OtpVerifyResponse,
  type Permission,
} from '@nano/contracts';
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../errors';
import { acceptStaffInvite } from '../staff/routes';
import type { LegacyRecord } from '../integrations';
import {
  authenticate,
  CONSENT_VERSIONS,
  issueSession,
  LIMITS,
  nextStep,
  revokeSession,
  rotateSession,
  type AuthContext,
} from './session';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

export interface AuthOptions {
  now: () => number;
  /** Dev/test-only OTP sink, exposed at GET /v1/dev/otp. Never set in production (config refuses it). */
  devOtpSink?: Map<string, string>;
}

const iso = (ms: number) => new Date(ms).toISOString();
const seconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Allowed answers per AUT-05…07 state; anything else is rejected rather than guessed. */
const DECISIONS: Record<MatchResult['state'], readonly string[]> = {
  matched: ['looks_right', 'something_missing'],
  mismatch: ['ask_clinic', 'new_client'],
  notfound: ['new_client', 'had_account'],
  unavailable: [],
};

export function registerAuthRoutes(app: FastifyInstance, { now, devOtpSink }: AuthOptions) {
  const { db, integrations } = app;
  app.decorateRequest('auth', null);

  const requireAuth: preHandlerHookHandler = async (request) => {
    request.auth = await authenticate(db, request.headers.authorization, now());
  };
  const requirePermission =
    (permission: Permission): preHandlerHookHandler =>
    async (request) => {
      request.auth = await authenticate(db, request.headers.authorization, now());
      // The server is the authority (D34); the app only hides what it can't use.
      if (!request.auth.permissions.includes(permission)) {
        throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: permission });
      }
    };
  const auth = (request: FastifyRequest) => request.auth as AuthContext;
  // Per-IP throttle on the unauthenticated endpoints, on top of the per-number limits below.
  const throttled = { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } };

  async function lockedFor(phone: string): Promise<number> {
    const [lock] = await db.query<{ locked_until: Date }>('SELECT locked_until FROM auth_locks WHERE phone_e164 = $1', [phone]);
    return lock ? lock.locked_until.getTime() - now() : 0;
  }
  async function lock(phone: string) {
    await db.query(
      `INSERT INTO auth_locks (phone_e164, locked_until) VALUES ($1, $2)
       ON CONFLICT (phone_e164) DO UPDATE SET locked_until = EXCLUDED.locked_until`,
      [phone, iso(now() + LIMITS.lockMs)],
    );
  }
  const limited = (ms: number) =>
    new HttpError(429, 'rate_limited', 'Too many code attempts. Try again later.', { retryAfterSeconds: seconds(ms) });

  // AUT-01. Same response whether or not the number has an account (no enumeration).
  app.post('/v1/auth/otp/start', throttled, async (request): Promise<OtpStartResponse> => {
    const { phone: raw } = otpStartRequestSchema.parse(request.body);
    return startCode(raw);
  });

  /** Sends a code to a number, with the per-number limits. Also used for phone change and deletion (NANO-05). */
  async function startCode(raw: string): Promise<OtpStartResponse> {
    const phone = normalizePhone(raw);
    if (!phone) throw new HttpError(400, 'validation_failed', 'Enter a 10-digit Canadian mobile number');
    const t = now();
    const wait = await lockedFor(phone);
    if (wait > 0) throw limited(wait);

    // Serialized per number (advisory lock) so parallel requests can't slip past the resend timer or the
    // hourly cap and pump SMS. The challenge row is written first; if sending fails, the transaction rolls back.
    return db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [phone]);
      const recent = await tx.query<{ created_at: Date; resend_available_at: Date }>(
        `SELECT created_at, resend_available_at FROM otp_challenges
          WHERE phone_e164 = $1 AND created_at > $2 ORDER BY created_at DESC`,
        [phone, iso(t - 3600_000)],
      );
      const last = recent[0];
      if (last && last.resend_available_at.getTime() > t) {
        throw new HttpError(429, 'rate_limited', 'Wait before asking for another code.', {
          retryAfterSeconds: seconds(last.resend_available_at.getTime() - t),
        });
      }
      if (recent.length >= LIMITS.maxSendsPerHour) {
        const oldest = recent[recent.length - 1]!.created_at.getTime();
        throw limited(oldest + 3600_000 - t);
      }
      const expiresAt = iso(t + LIMITS.codeTtlMs);
      const resendAvailableAt = iso(t + LIMITS.resendCooldownMs);
      const [row] = await tx.query<{ id: string }>(
        `INSERT INTO otp_challenges (phone_e164, provider_ref, created_at, expires_at, resend_available_at)
         VALUES ($1, 'pending', $2, $3, $4) RETURNING id`,
        [phone, iso(t), expiresAt, resendAvailableAt],
      );
      const { providerRef } = await integrations.otp.send(phone);
      await tx.query('UPDATE otp_challenges SET provider_ref = $2 WHERE id = $1', [row!.id, providerRef]);
      return { challengeId: row!.id, sentTo: maskPhone(phone), expiresAt, resendAvailableAt };
    });
  }

  // AUT-02.
  app.post('/v1/auth/otp/verify', throttled, async (request): Promise<OtpVerifyResponse> => {
    const { challengeId, code } = otpVerifyRequestSchema.parse(request.body);
    const phone = await checkCode(challengeId, code);
    const t = now();
    const [customer] = await db.query<{ id: string }>(
      `INSERT INTO customers (phone_e164) VALUES ($1)
       ON CONFLICT (phone_e164) DO UPDATE SET updated_at = customers.updated_at RETURNING id`,
      [phone],
    );
    // A pending staff invite for this number becomes access now (STF-13/38), before the session's roles load.
    await acceptStaffInvite(db, customer!.id, phone, t);
    const tokens = await issueSession(db, customer!.id, t);
    return { ...tokens, next: await nextStep(db, customer!.id, integrations.legacy.isConnected()) };
  });

  /**
   * Checks and consumes a code; returns the verified number. Attempts are counted before the provider is asked,
   * so parallel guesses can't exceed the limit.
   */
  async function checkCode(challengeId: string, code: string): Promise<string> {
    const expired = new HttpError(400, 'code_expired', 'This code has expired.');
    if (!UUID.test(challengeId)) throw expired;
    const t = now();
    const [challenge] = await db.query<{ phone_e164: string; provider_ref: string; expires_at: Date; consumed_at: Date | null }>(
      'SELECT phone_e164, provider_ref, expires_at, consumed_at FROM otp_challenges WHERE id = $1',
      [challengeId],
    );
    if (!challenge) throw expired;
    const wait = await lockedFor(challenge.phone_e164);
    if (wait > 0) throw limited(wait);
    // A used code can't be replayed; an old one can't be revived.
    if (challenge.consumed_at || challenge.expires_at.getTime() <= t) throw expired;

    const [counted] = await db.query<{ attempts: number }>(
      `UPDATE otp_challenges SET attempts = attempts + 1
        WHERE id = $1 AND consumed_at IS NULL AND attempts < $2 RETURNING attempts`,
      [challengeId, LIMITS.maxAttempts],
    );
    if (!counted) throw limited(LIMITS.lockMs);

    const result = await integrations.otp.check(challenge.provider_ref, code);
    if (result === 'expired') throw expired;
    if (result === 'wrong') {
      const attemptsLeft = LIMITS.maxAttempts - counted.attempts;
      if (attemptsLeft <= 0) {
        await db.query('UPDATE otp_challenges SET consumed_at = $2 WHERE id = $1', [challengeId, iso(t)]);
        await lock(challenge.phone_e164);
        throw limited(LIMITS.lockMs);
      }
      throw new HttpError(401, 'code_wrong', 'That code didn’t match.', { attemptsLeft });
    }

    const consumed = await db.query('UPDATE otp_challenges SET consumed_at = $2 WHERE id = $1 AND consumed_at IS NULL RETURNING id', [
      challengeId,
      iso(t),
    ]);
    if (consumed.length === 0) throw expired;
    return challenge.phone_e164;
  }

  app.post('/v1/auth/refresh', throttled, async (request) => {
    const { refreshToken } = refreshRequestSchema.parse(request.body);
    return rotateSession(db, refreshToken, now());
  });

  app.post('/v1/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    await revokeSession(db, auth(request).sessionId, 'sign_out', now());
    return reply.status(204).send();
  });

  async function me(ctx: AuthContext): Promise<Me> {
    const [c] = await db.query<{ id: string; phone_e164: string; first_name: string | null; last_name: string | null; email: string | null; created_at: Date }>(
      'SELECT id, phone_e164, first_name, last_name, email, created_at FROM customers WHERE id = $1',
      [ctx.customerId],
    );
    const [deletion] = await db.query<{ reference: string; due_at: Date }>(
      `SELECT reference, due_at FROM privacy_requests WHERE customer_id = $1 AND kind = 'delete' AND status = 'pending'`,
      [ctx.customerId],
    );
    if (!c) throw new HttpError(401, 'session_expired', 'Please sign in again.');
    const consents = await db.query<{ purpose: 'terms' | 'transactional' | 'marketing'; granted: boolean; version: string; recorded_at: Date }>(
      `SELECT DISTINCT ON (purpose) purpose, granted, version, recorded_at FROM consents
        WHERE customer_id = $1 ORDER BY purpose, recorded_at DESC, id DESC`,
      [c.id],
    );
    return {
      customer: { id: c.id, phone: c.phone_e164, firstName: c.first_name, lastName: c.last_name, email: c.email, createdAt: c.created_at.toISOString() },
      deletion: deletion ? { reference: deletion.reference, dueAt: deletion.due_at.toISOString() } : null,
      consents: consents.map((r) => ({ purpose: r.purpose, granted: r.granted, version: r.version, recordedAt: r.recorded_at.toISOString() })),
      roles: ctx.roles,
      permissions: ctx.permissions,
      next: await nextStep(db, c.id, integrations.legacy.isConnected()),
      sessionExpiresAt: ctx.sessionExpiresAt,
    };
  }

  app.get('/v1/me', { preHandler: requireAuth }, async (request) => me(auth(request)));

  // AUT-03: three separate records, versions stamped here (AUTH 09). Marketing is never required.
  app.post('/v1/me/consents', { preHandler: requireAuth }, async (request) => {
    const body = consentsRequestSchema.parse(request.body);
    if (!body.terms || !body.transactional) {
      throw new HttpError(400, 'validation_failed', 'Accept the terms and booking texts to continue.');
    }
    const t = iso(now());
    // All three decisions land together or not at all.
    await db.transaction(async (tx) => {
      for (const purpose of ['terms', 'transactional', 'marketing'] as const) {
        await tx.query(
          'INSERT INTO consents (customer_id, purpose, granted, version, channel, recorded_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [auth(request).customerId, purpose, body[purpose], CONSENT_VERSIONS[purpose], 'app', t],
        );
      }
    });
    return me(auth(request));
  });

  // AUT-04
  app.put('/v1/me/profile', { preHandler: requireAuth }, async (request) => {
    const body = profileRequestSchema.parse(request.body);
    await db.query('UPDATE customers SET first_name = $2, last_name = $3, email = $4, updated_at = $5 WHERE id = $1', [
      auth(request).customerId,
      body.firstName,
      body.lastName,
      body.email,
      iso(now()),
    ]);
    return me(auth(request));
  });

  async function matchFor(customerId: string): Promise<MatchResult & { record: LegacyRecord | null }> {
    const [c] = await db.query<{ phone_e164: string; first_name: string | null; last_name: string | null }>(
      'SELECT phone_e164, first_name, last_name FROM customers WHERE id = $1',
      [customerId],
    );
    const found = await integrations.legacy.findByPhone(c!.phone_e164);
    if (found.status === 'not_connected') return { state: 'unavailable', items: [], sample: false, record: null };
    if (found.status === 'not_found') return { state: 'notfound', items: [], sample: false, record: null };
    const same = (a: string | null, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();
    // Never merge on a partial match: phone AND full name must agree.
    const matched = same(c!.first_name, found.record.firstName) && same(c!.last_name, found.record.lastName);
    return matched
      ? { state: 'matched', items: found.record.items, sample: found.sample, record: found.record }
      : { state: 'mismatch', items: [], sample: found.sample, record: found.record };
  }

  // AUT-05…07: read-only view of what the old app holds. Nothing is copied or moved.
  app.post('/v1/me/legacy-match', { preHandler: requireAuth }, async (request): Promise<MatchResult> => {
    const { state, items, sample } = await matchFor(auth(request).customerId);
    return { state, items, sample };
  });

  app.post('/v1/me/legacy-match/decision', { preHandler: requireAuth }, async (request) => {
    const { decision } = matchDecisionRequestSchema.parse(request.body);
    const ctx = auth(request);
    // Re-derive the state server-side; the client's view of it is never trusted.
    const result = await matchFor(ctx.customerId);
    if (!DECISIONS[result.state].includes(decision)) {
      throw new HttpError(409, 'conflict', 'That choice doesn’t apply to this account.');
    }
    const needsClinic = decision !== 'new_client';
    const reference = needsClinic ? `NB-M${randomBytes(4).toString('hex').toUpperCase()}` : `NB-N${randomBytes(4).toString('hex').toUpperCase()}`;
    const t = iso(now());
    return db.transaction(async (tx) => {
      // One answer per customer: a repeat can't spam the clinic queue. Later changes go through support.
      const marked = await tx.query(
        'UPDATE customers SET match_checked_at = $2 WHERE id = $1 AND match_checked_at IS NULL RETURNING id',
        [ctx.customerId, t],
      );
      if (marked.length === 0) throw new HttpError(409, 'conflict', 'This account check is already done.');
      await tx.query(
        `INSERT INTO legacy_match_cases (reference, customer_id, state, decision, legacy_ref, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reference, ctx.customerId, result.state, decision, result.record?.ref ?? null, needsClinic ? 'awaiting_clinic' : 'closed', t],
      );
      return { reference: needsClinic ? reference : null, status: needsClinic ? 'awaiting_clinic' : 'closed' };
    });
  });

  // Staff resolution path (STF-28 lands in NANO-07/08). Records the decision with audit; moves no value.
  app.get('/v1/staff/match-cases', { preHandler: requirePermission('accountMatch.resolve') }, async () => {
    const rows = await db.query<{
      id: string;
      reference: string;
      customer_id: string;
      state: string;
      decision: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, reference, customer_id, state, decision, status, created_at FROM legacy_match_cases
        WHERE status = 'awaiting_clinic' ORDER BY created_at`,
    );
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      customerId: r.customer_id,
      state: r.state,
      decision: r.decision,
      status: r.status,
      createdAt: r.created_at.toISOString(),
    }));
  });

  app.post('/v1/staff/match-cases/:id/resolve', { preHandler: requirePermission('accountMatch.resolve') }, async (request) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    const { outcome, reason } = staffMatchResolutionSchema.parse(request.body);
    const ctx = auth(request);
    const t = iso(now());
    // Decision and audit entry commit together; a failed audit write leaves the case open for a retry.
    return db.transaction(async (tx) => {
      const [current] = await tx.query<{ customer_id: string; status: string }>(
        'SELECT customer_id, status FROM legacy_match_cases WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!current) throw new HttpError(404, 'not_found', 'Case not found.');
      // Segregation of duties: nobody confirms their own record.
      if (current.customer_id === ctx.customerId) {
        throw new HttpError(403, 'forbidden', 'Another staff member must resolve your own case.');
      }
      if (current.status !== 'awaiting_clinic') throw new HttpError(409, 'conflict', 'This case was already resolved.');
      await tx.query(
        `UPDATE legacy_match_cases SET status = $2, resolved_by = $3, resolved_at = $4, resolution_reason = $5 WHERE id = $1`,
        [id, outcome, ctx.customerId, t, reason],
      );
      await tx.query(
        `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at)
         VALUES ($1, $2, $3, 'status', 'awaiting_clinic', $4, $5, $6, $7)`,
        [ctx.customerId, ctx.roles.join(','), `legacy_match_case:${id}`, outcome, reason, String(request.headers['user-agent'] ?? ''), t],
      );
      return { id, status: outcome, valueMoved: false };
    });
  });

  if (devOtpSink) {
    // Dev/test sink only. Codes never go to logs; this route doesn't exist unless DEV_OTP_SINK is on.
    app.get('/v1/dev/otp', async (request) => {
      const { phone } = z.object({ phone: z.string() }).parse(request.query);
      const normalized = normalizePhone(phone);
      const code = normalized ? devOtpSink.get(normalized) : undefined;
      if (!code) throw new HttpError(404, 'not_found', 'No code sent to that number.');
      return { code };
    });
  }

  return { startCode, checkCode, me, requireAuth };
}

export type AuthKit = ReturnType<typeof registerAuthRoutes>;
