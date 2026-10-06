import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'bad_request',
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  /** AUT-02: wrong code; `attemptsLeft` says how many tries remain. */
  'code_wrong',
  /** AUT-02: code expired or already used; request a new one. */
  'code_expired',
  /** Access token expired: refresh and retry. */
  'token_expired',
  /** Session ended (30-day limit, sign-out elsewhere, or replayed refresh token): sign in again (AUT-08). */
  'session_expired',
  'internal_error',
  'service_unavailable',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Every non-2xx API response uses this envelope. `message` is safe to log; never a stack trace. */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    requestId: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    /** With `rate_limited`: when the person may try again. Read as time, not blame. */
    retryAfterSeconds: z.number().int().nonnegative().optional(),
    /** With `code_wrong`. */
    attemptsLeft: z.number().int().nonnegative().optional(),
    /** With `forbidden`: the permission the caller lacks. */
    missingPermission: z.string().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const REQUEST_ID_HEADER = 'x-request-id';

export const livenessSchema = z.object({ status: z.literal('ok') });

export const readinessSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.object({ database: z.enum(['ok', 'fail']) }),
});
export type Readiness = z.infer<typeof readinessSchema>;
