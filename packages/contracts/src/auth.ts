import { z } from 'zod';

// AUTH 01–11 / AUT-01–08 HTTP contracts. Phone number is the identity (A6); sign-in is code-only.

export const OTP_LENGTH = 6;

/** AUT-01: a 10-digit North American number, typed in any common format. */
export const otpStartRequestSchema = z.object({ phone: z.string().min(7).max(32) });
export const otpStartResponseSchema = z.object({
  challengeId: z.string(),
  /** Masked for display, e.g. "(604) •••-••23". */
  sentTo: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
  resendAvailableAt: z.iso.datetime({ offset: true }),
});
export type OtpStartResponse = z.infer<typeof otpStartResponseSchema>;

export const otpVerifyRequestSchema = z.object({
  challengeId: z.string().min(1).max(100),
  code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`)),
});

/** What the signed-in person still has to do before using the app (AUT-03 → AUT-04 → AUT-05…07). */
export const nextStepSchema = z.enum(['consents', 'profile', 'match', 'done']);
export type NextStep = z.infer<typeof nextStepSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessExpiresAt: z.iso.datetime({ offset: true }),
  /** Absolute end of the session (30 days customers; shorter for staff). */
  sessionExpiresAt: z.iso.datetime({ offset: true }),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export const otpVerifyResponseSchema = tokenPairSchema.extend({ next: nextStepSchema });
export type OtpVerifyResponse = z.infer<typeof otpVerifyResponseSchema>;

export const refreshRequestSchema = z.object({ refreshToken: z.string().min(1).max(200) });

/** Server-side permission map (D34). The app asks "can I do X?", never "am I an Editor?". */
export const PERMISSIONS = [
  'today.view',
  'requests.manage',
  'inbox.manage',
  'value.redeem',
  'value.lookup',
  'giftcard.actions',
  'giftcard.void',
  /** NANO-06: credit issue/adjustment and payment refunds (Owner only, audited). */
  'value.adjust',
  'payments.refund',
  'customers.view',
  'accountMatch.resolve',
  'content.draft',
  'content.publish',
  'selling.draft',
  'selling.publish',
  'giftcard.settings',
  'push.send',
  'professionals.draft',
  'professionals.publish',
  'policies.draft',
  'policies.publish',
  'clinic.manage',
  'rules.manage',
  'reports.view',
  'team.manage',
  'audit.view',
] as const;
export const permissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof permissionSchema>;

export const consentPurposeSchema = z.enum(['terms', 'transactional', 'marketing']);
export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;

export const consentStateSchema = z.object({
  purpose: consentPurposeSchema,
  granted: z.boolean(),
  version: z.string(),
  recordedAt: z.iso.datetime({ offset: true }),
});

export const meSchema = z.object({
  customer: z.object({
    id: z.string(),
    phone: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    /** ACC-01 "client since". */
    createdAt: z.iso.datetime({ offset: true }).optional(),
  }),
  /** A deletion waiting out its grace period (ACC-10); signing in again lets the person cancel it. */
  deletion: z.object({ reference: z.string(), dueAt: z.iso.datetime({ offset: true }) }).nullable().optional(),
  /** Latest record per purpose (history is append-only on the server). */
  consents: z.array(consentStateSchema),
  /** Display only; authorization uses `permissions`. */
  roles: z.array(z.string()),
  permissions: z.array(permissionSchema),
  next: nextStepSchema,
  sessionExpiresAt: z.iso.datetime({ offset: true }),
});
export type Me = z.infer<typeof meSchema>;

/** AUT-03: three separate choices (AUTH 09). Versions are stamped by the server, never the client. */
export const consentsRequestSchema = z.object({
  terms: z.boolean(),
  transactional: z.boolean(),
  marketing: z.boolean(),
});

/** AUT-04. Email optional; no other personal data (NFR 06). */
export const profileRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.email().max(254).nullable(),
});

export const matchItemSchema = z.object({
  kind: z.enum(['visit', 'package', 'giftCard', 'credit']),
  title: z.string(),
  value: z.string().nullable(),
});

/**
 * AUT-05 matched · AUT-06 mismatch · AUT-07 notfound. `unavailable` = the old-app records aren't connected
 * yet, so no search happened (never reported as "not found").
 */
export const matchResultSchema = z.object({
  state: z.enum(['matched', 'mismatch', 'notfound', 'unavailable']),
  items: z.array(matchItemSchema),
  /** Records shown come from sample/migration data until the real export is connected. */
  sample: z.boolean(),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

/** The customer's answer on AUT-05…07. None of these moves value: staff confirm first (AUTH 11). */
export const matchDecisionSchema = z.enum(['looks_right', 'something_missing', 'ask_clinic', 'new_client', 'had_account']);
export const matchDecisionRequestSchema = z.object({ decision: matchDecisionSchema });
export const matchDecisionResponseSchema = z.object({
  /** A reference the customer can quote to support (SUP 04); null when no case was needed. */
  reference: z.string().nullable(),
  status: z.enum(['awaiting_clinic', 'closed']),
});

export const staffMatchCaseSchema = z.object({
  id: z.string(),
  reference: z.string(),
  customerId: z.string(),
  state: z.enum(['matched', 'mismatch', 'notfound', 'unavailable']),
  decision: matchDecisionSchema,
  status: z.enum(['awaiting_clinic', 'confirmed', 'rejected', 'closed']),
  createdAt: z.iso.datetime({ offset: true }),
});

/** Staff resolution records the decision and audits it. Moving value is a separate, later ledger action. */
export const staffMatchResolutionSchema = z.object({
  outcome: z.enum(['confirmed', 'rejected']),
  reason: z.string().trim().min(3).max(500),
});
