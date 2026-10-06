import { z } from 'zod';

// NANO-04 hand-off booking, visits and visit requests (BOOK 08–11, 15–19). Booking itself happens in Fresha;
// nothing here ever creates or confirms an appointment on the app's say-so.

const isoTime = z.iso.datetime({ offset: true });

export const visitStatusSchema = z.enum(['confirmed', 'pending', 'changed', 'cancelled', 'completed', 'noshow']);
export type VisitStatus = z.infer<typeof visitStatusSchema>;

export const visitRequestStatusSchema = z.enum(['submitted', 'in_progress', 'approved', 'declined', 'call_needed', 'done']);
export const visitRequestTypeSchema = z.enum(['change', 'cancel']);

export const visitRequestSchema = z.object({
  id: z.string(),
  reference: z.string(),
  visitId: z.string(),
  type: visitRequestTypeSchema,
  status: visitRequestStatusSchema,
  message: z.string(),
  declineReason: z.string().nullable(),
  createdAt: isoTime,
});
export type VisitRequest = z.infer<typeof visitRequestSchema>;

export const visitSchema = z.object({
  id: z.string(),
  /** Booking source reference the customer can quote (SUP 04). */
  ref: z.string(),
  source: z.enum(['fresha_sync', 'inapp']),
  serviceId: z.string().nullable(),
  serviceName: z.string(),
  detail: z.string().nullable(),
  professional: z.string().nullable(),
  startsAt: isoTime,
  durationMin: z.number().int().nullable(),
  /** As reported by the booking source (Fresha); never upgraded by the app. */
  status: visitStatusSchema,
  depositCAD: z.number().nullable(),
  /** Open request to the clinic, if any (VIS-02 "requested"). */
  openRequest: visitRequestSchema.nullable(),
});
export type Visit = z.infer<typeof visitSchema>;

export const visitsResponseSchema = z.object({
  /** `not_connected` = Fresha bookings can't be read back yet (E2): show "Your bookings are in Fresha". */
  sync: z.enum(['synced', 'not_connected']),
  syncedAt: isoTime.nullable(),
  upcoming: z.array(visitSchema),
  past: z.array(visitSchema),
  /** Clinic Fresha page for changes ("Change in Fresha", "Open Fresha"); `null` until configured. */
  freshaUrl: z.url().nullable(),
  serverTime: isoTime,
});
export type VisitsResponse = z.infer<typeof visitsResponseSchema>;

export const handoffItemSchema = z.object({
  serviceId: z.string().min(1).max(80),
  areas: z.object({ set: z.enum(['women', 'men']), names: z.array(z.string().min(1).max(60)).min(1).max(10) }).optional(),
});

export const handoffRequestSchema = z.object({
  /** Empty = a general "Open Fresha" (Home, Visits) with nothing picked in the app. */
  items: z.array(handoffItemSchema).max(6),
  /** One key per "Continue to Fresha" intent: retries return the same hand-off. */
  idempotencyKey: z.string().min(8).max(64),
});
export const handoffResponseSchema = z.object({
  id: z.string(),
  /** Fresha booking link; `null` when the clinic hasn't configured it (then only "Call the clinic" is offered). */
  url: z.url().nullable(),
  expiresAt: isoTime,
});
export type HandoffResponse = z.infer<typeof handoffResponseSchema>;

/**
 * BKG-09 return check — only from Fresha evidence (BOOK 16): `checking` while a read-back is in progress,
 * `confirmed` when a new Fresha booking is seen, `notyet` when there is no evidence (including when Fresha can't
 * be read at all), `notvisible` when Fresha confirmed but the booking isn't readable yet.
 */
export const handoffStatusSchema = z.object({
  state: z.enum(['checking', 'confirmed', 'notyet', 'notvisible']),
  visit: visitSchema.nullable(),
  /** When the server will look again (notvisible). */
  checkAgainAt: isoTime.nullable(),
});
export type HandoffStatus = z.infer<typeof handoffStatusSchema>;

/** VIS-06: a late change or cancel request to the clinic queue (BOOK 18). */
export const visitRequestCreateSchema = z.object({
  type: visitRequestTypeSchema,
  message: z.string().trim().min(3).max(1000),
  idempotencyKey: z.string().min(8).max(64),
});

/** Staff action on a request (STF-24). Decline needs a reason the customer is told. */
export const visitRequestTransitionSchema = z
  .object({
    to: z.enum(['in_progress', 'approved', 'declined', 'call_needed', 'done']),
    reason: z.string().trim().min(3).max(500).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.to !== 'declined' || !!v.reason, { message: 'A reason is required to decline', path: ['reason'] });
