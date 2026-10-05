import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'bad_request',
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
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
