import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Deployment tier; independent of NODE_ENV so staging runs production builds. */
    APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Postgres URL. Unset = in-process PGlite (development/test only). */
    DATABASE_URL: z.url().optional(),
    /** Only deterministic development adapters exist until vendors are approved (open-items E3–E5). */
    INTEGRATIONS_MODE: z.enum(['dev']).default('dev'),
    /** Fresha hand-off target (D33). No Fresha booking API exists; this is a link only. */
    FRESHA_BOOKING_URL: z.url().optional(),
    /**
     * Number of reverse-proxy hops to trust for the client address (per-IP throttling). 0 = connect directly.
     * Set it to the real hop count behind a load balancer; never "trust all", or X-Forwarded-For is spoofable.
     */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** Local development only: expose sent OTP codes at GET /v1/dev/otp. */
    DEV_OTP_SINK: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    /** Local development only: serve sample old-app records for the account match (AUT-05…07). */
    DEV_SAMPLE_LEGACY: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  })
  .superRefine((env, ctx) => {
    // A production build must state its tier; never fall back to the development default.
    if (env.NODE_ENV === 'production' && env.APP_ENV === 'development') {
      ctx.addIssue({ code: 'custom', path: ['APP_ENV'], message: 'must be staging or production when NODE_ENV=production' });
    }
    if (env.APP_ENV !== 'development' && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: `required when APP_ENV=${env.APP_ENV}` });
    }
    // The OTP sink is a sign-in bypass by design; it must never be reachable on shared environments.
    for (const flag of ['DEV_OTP_SINK', 'DEV_SAMPLE_LEGACY'] as const) {
      if (env.APP_ENV !== 'development' && env[flag]) {
        ctx.addIssue({ code: 'custom', path: [flag], message: 'is a local development switch and is refused outside APP_ENV=development' });
      }
    }
    if (env.APP_ENV === 'production' && env.INTEGRATIONS_MODE === 'dev') {
      ctx.addIssue({
        code: 'custom',
        path: ['INTEGRATIONS_MODE'],
        message: 'development adapters must never run in production; approve and wire live providers first',
      });
    }
  });

export type Config = z.infer<typeof schema>;

/** Validates env at startup. Messages name the variable, never its value. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API configuration — ${problems}`);
  }
  return result.data;
}
