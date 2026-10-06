import { z } from 'zod';
import { otpVerifyRequestSchema } from './auth';

// NANO-05 account, notifications, inbox and privacy (ACC-01–10, WEB-03/04; AUTH 06, NOTIF 04–05, PRIV 01–09).

const isoTime = z.iso.datetime({ offset: true });

/** ACC-03. Booking messages are transactional and can't be turned off; offers follow the marketing consent. */
export const preferencesSchema = z.object({
  bookingMessages: z.literal(true),
  reminders: z.boolean(),
  aftercare: z.boolean(),
  /** Mirrors the latest marketing consent record (AUTH 09); off unless the person turned it on. */
  marketing: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const preferencesUpdateSchema = z.object({ reminders: z.boolean(), aftercare: z.boolean(), marketing: z.boolean() });

/** ACC-02 phone change: a code goes to the new number; the number changes only after it is verified. */
export const phoneChangeStartSchema = z.object({ phone: z.string().min(7).max(32) });
export const phoneChangeVerifySchema = otpVerifyRequestSchema;

/** ACC-04/05. Important transactional messages stay readable after a push is dismissed (NOTIF 05). */
export const inboxItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  /** In-app destination ("Need to change it?"), e.g. `/visits/…`. */
  href: z.string().startsWith('/').nullable(),
  hrefLabel: z.string().nullable(),
  createdAt: isoTime,
  read: z.boolean(),
});
export type InboxItem = z.infer<typeof inboxItemSchema>;
export const inboxResponseSchema = z.object({ items: z.array(inboxItemSchema), unread: z.number().int().nonnegative() });
export type InboxResponse = z.infer<typeof inboxResponseSchema>;

/** ACC-06 consent history (PRIV 02): every decision, newest first. */
export const consentRecordSchema = z.object({
  purpose: z.enum(['terms', 'transactional', 'marketing']),
  granted: z.boolean(),
  version: z.string(),
  channel: z.string(),
  recordedAt: isoTime,
});
export const consentHistorySchema = z.array(consentRecordSchema);
export type ConsentRecord = z.infer<typeof consentRecordSchema>;

/** Export (ACC-07, PRIV 08) and deletion (ACC-08–10, AUTH 06, PRIV 04) are tracked server-side requests. */
export const privacyRequestSchema = z.object({
  reference: z.string(),
  kind: z.enum(['export', 'delete']),
  /** received → (export) completed; pending (deletion grace period) → completed, or cancelled. */
  status: z.enum(['received', 'pending', 'completed', 'cancelled']),
  createdAt: isoTime,
  dueAt: isoTime,
  completedAt: isoTime.nullable(),
});
export type PrivacyRequest = z.infer<typeof privacyRequestSchema>;

export const dataRequestCreateSchema = z.object({ email: z.email().max(254), idempotencyKey: z.string().min(8).max(64) });
export const dataRequestsResponseSchema = z.object({ latest: privacyRequestSchema.nullable() });

/** ACC-08: the consequences, from the server's own deletion plan and the person's real data. */
export const deletionPreviewSchema = z.object({
  upcomingVisits: z.object({ count: z.number().int().nonnegative(), next: isoTime.nullable() }),
  /** Value the person would lose access to in the app (wallet, NANO-06). */
  balances: z.array(z.object({ label: z.string(), amountCAD: z.number() })),
  delete: z.array(z.string()),
  deidentify: z.array(z.string()),
  retain: z.array(z.string()),
  graceDays: z.number().int().nonnegative(),
  /** Retention wording awaits the clinic's legal review. */
  sample: z.boolean(),
});
export type DeletionPreview = z.infer<typeof deletionPreviewSchema>;

/** ACC-09 / WEB-03: the code proves it's the account holder. */
export const deletionConfirmSchema = otpVerifyRequestSchema;
export const webDeletionStartSchema = z.object({ phone: z.string().min(7).max(32) });

/**
 * ACC-10 / WEB-04. `token` is an unguessable id for checking progress after sign-out (it reveals only the
 * request's status, nothing personal).
 */
export const deletionStatusSchema = z.object({
  token: z.string(),
  reference: z.string(),
  status: z.enum(['pending', 'completed', 'cancelled']),
  dueAt: isoTime,
  completedAt: isoTime.nullable(),
});
export type DeletionStatus = z.infer<typeof deletionStatusSchema>;
