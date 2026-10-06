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
    /** Local development only: simulate a connected Fresha read-back with sample bookings (NANO-04). */
    DEV_SAMPLE_FRESHA: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    /** App Review demo sign-in (NANO-11): a reviewer-only number and its fixed code. Set only while a review is open. */
    REVIEW_PHONE: z.string().regex(/^\+1\d{10}$/, 'E.164, e.g. +16045550100').optional(),
    REVIEW_CODE: z.string().regex(/^\d{6}$/, '6 digits').optional(),
    /** When the review sign-in stops working (ISO date-time); required with REVIEW_PHONE, at most 60 days ahead. */
    REVIEW_EXPIRES: z.iso.datetime({ offset: true }).optional(),
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
    for (const flag of ['DEV_OTP_SINK', 'DEV_SAMPLE_LEGACY', 'DEV_SAMPLE_FRESHA'] as const) {
      if (env.APP_ENV !== 'development' && env[flag]) {
        ctx.addIssue({ code: 'custom', path: [flag], message: 'is a local development switch and is refused outside APP_ENV=development' });
      }
    }
    if (!!env.REVIEW_PHONE !== !!env.REVIEW_CODE || !!env.REVIEW_PHONE !== !!env.REVIEW_EXPIRES) {
      ctx.addIssue({ code: 'custom', path: ['REVIEW_CODE'], message: 'REVIEW_PHONE, REVIEW_CODE and REVIEW_EXPIRES are set together or not at all' });
    }
    // A forgotten review login must not live on: it ends by itself, and can't be set far ahead.
    if (env.REVIEW_EXPIRES && Date.parse(env.REVIEW_EXPIRES) > Date.now() + 60 * 24 * 3600_000) {
      ctx.addIssue({ code: 'custom', path: ['REVIEW_EXPIRES'], message: 'must be within 60 days' });
    }
    if (env.REVIEW_CODE && /^(\d)\1{5}$|^123456$|^654321$/.test(env.REVIEW_CODE)) {
      ctx.addIssue({ code: 'custom', path: ['REVIEW_CODE'], message: 'is too easy to guess' });
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
