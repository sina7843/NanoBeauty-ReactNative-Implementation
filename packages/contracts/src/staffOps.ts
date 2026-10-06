import { z } from 'zod';
import { clinicHoursSchema, featuresSchema, settingsSchema } from './settings';
import { publishStateSchema } from './staff';

// NANO-08 staff selling, operations, settings and reports (STF-05–07, 11, 15–35, 37). Draftable items share the
// NANO-07 model: versioned drafts, publish-with-confirm, approvals (D35), archive rules (D36), audit.

const isoTime = z.iso.datetime({ offset: true });
const version = z.number().int().positive();
const link = z.object({ label: z.string().trim().min(1).max(60), href: z.string().startsWith('/').max(200) });

export const ENTITY_TYPES = ['package', 'campaign', 'promo', 'professional', 'policy'] as const;
export const entityTypeSchema = z.enum(ENTITY_TYPES);
export type EntityType = z.infer<typeof entityTypeSchema>;

export const packageDraftSchema = z.object({
  name: z.string().trim().min(2).max(80),
  serviceId: z.string().min(1).max(80).nullable(),
  sessions: z.number().int().min(1).max(50),
  priceCents: z.number().int().min(100).max(1_000_000),
  regularCents: z.number().int().min(0).max(1_000_000).nullable(),
  validityMonths: z.number().int().min(1).max(60).nullable(),
  terms: z.array(z.string().trim().min(2).max(300)).max(15),
  visibility: z.enum(['live', 'unavailable']),
});
export type PackageDraft = z.infer<typeof packageDraftSchema>;

export const campaignTemplateSchema = z.enum(['halloween', 'canada_day', 'black_friday', 'holidays', 'own']);
export const campaignDraftSchema = z.object({
  template: campaignTemplateSchema,
  eyebrow: z.string().trim().min(2).max(40),
  title: z.string().trim().min(2).max(80),
  summary: z.string().trim().max(200).nullable(),
  body: z.string().trim().max(1000).nullable(),
  photo: z.string().regex(/^(media:[0-9a-f-]{36}|[a-z0-9-]{3,40})$/).nullable(),
  startsAt: isoTime,
  endsAt: isoTime,
  audience: z.enum(['all', 'returning']),
  eligible: z.array(z.object({ title: z.string().trim().min(2).max(80), was: z.number().nonnegative(), now: z.number().nonnegative() })).max(10),
  terms: z.array(z.string().trim().min(2).max(300)).max(15),
  cta: link,
  fallback: link,
});
export type CampaignDraft = z.infer<typeof campaignDraftSchema>;

export const promoDraftSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9]{3,20}$/, 'Letters and numbers, no spaces'),
  description: z.string().trim().min(2).max(120),
  /** percent: whole percent 1–100; amount: integer cents (money is always cents). */
  discount: z.object({ type: z.enum(['percent', 'amount']), value: z.number().int().positive().max(1_000_000) }),
  /** `kind:value` as checkout matches it, e.g. `category:facials`, `package:any`, `visit:first`. */
  appliesTo: z.string().trim().regex(/^[a-z]+:[a-z0-9_-]+$/, 'Use kind:value, e.g. category:facials'),
  appliesLabel: z.string().trim().min(2).max(60),
  campaignId: z.string().max(80).nullable(),
  startsAt: isoTime.nullable(),
  endsAt: isoTime.nullable(),
  totalLimit: z.number().int().positive().max(100_000).nullable(),
  perPerson: z.number().int().positive().max(100),
});
export type PromoDraft = z.infer<typeof promoDraftSchema>;

export const professionalDraftSchema = z.object({
  name: z.string().trim().min(2).max(60),
  title: z.string().trim().max(80).nullable(),
  bio: z.string().trim().max(1000).nullable(),
  photo: z.string().regex(/^(media:[0-9a-f-]{36}|[a-z0-9-]{3,40})$/).nullable(),
  /** Signed photo/profile consent kept by the clinic (C5). Without it, only the name is shown. */
  consent: z.boolean(),
  visible: z.boolean(),
});
export type ProfessionalDraft = z.infer<typeof professionalDraftSchema>;

export const policyDraftSchema = z.object({
  title: z.string().trim().min(2).max(80),
  sections: z.array(z.object({ heading: z.string().trim().max(120), body: z.string().trim().min(2).max(5000) })).min(1).max(30),
  changeNote: z.string().trim().min(3).max(200),
});
export type PolicyDraft = z.infer<typeof policyDraftSchema>;

export const DRAFT_SCHEMAS = {
  package: packageDraftSchema,
  campaign: campaignDraftSchema,
  promo: promoDraftSchema,
  professional: professionalDraftSchema,
  policy: policyDraftSchema,
} as const;
export type DraftOf<T extends EntityType> = z.infer<(typeof DRAFT_SCHEMAS)[T]>;

export const entityRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  subtitle: z.string().nullable(),
  state: publishStateSchema,
  /** Campaign/promo lifecycle shown to staff: scheduled, live, paused, ended, used up. */
  phase: z.string().nullable(),
  hasDraft: z.boolean(),
  deletable: z.boolean(),
  archivedAt: isoTime.nullable(),
  version,
});
export type EntityRow = z.infer<typeof entityRowSchema>;

export const entitySchema = z.object({
  id: z.string(),
  type: entityTypeSchema,
  state: publishStateSchema,
  version,
  draft: z.record(z.string(), z.unknown()),
  live: z.record(z.string(), z.unknown()).nullable(),
  highRiskChanges: z.array(z.string()),
  missing: z.array(z.string()),
  waitingApproval: z.object({ id: z.string(), submittedByMe: z.boolean() }).nullable(),
  updatedAt: isoTime.nullable(),
  deletable: z.boolean(),
  /** Extra read-only facts (owners of an archived package, uses of a code, policy history). */
  facts: z.array(z.object({ label: z.string(), value: z.string() })),
});
export type Entity = z.infer<typeof entitySchema>;
export const entitySaveSchema = z.object({ version, draft: z.record(z.string(), z.unknown()) });
export const entityCreateSchema = z.object({ draft: z.record(z.string(), z.unknown()) });
export const entityPublishResultSchema = z.object({ outcome: z.enum(['published', 'waiting']), entity: entitySchema });

// ---------- Settings (STF-17, 31, 32, 34) ----------

export const clinicUpdateSchema = z.object({
  version,
  address: z.string().trim().min(3).max(200),
  phone: z.string().trim().max(32).nullable(),
  parking: z.string().trim().max(300).nullable(),
  supportReplyTime: z.string().trim().max(60).nullable(),
  clinicHours: clinicHoursSchema.nullable(),
});
export const rulesUpdateSchema = z.object({
  version,
  settings: settingsSchema.pick({
    bookingMode: true,
    deposit: true,
    freeChangeHours: true,
    lateCancelOutcome: true,
    lateChangeOutcome: true,
    noShowOutcome: true,
    slotHoldMinutes: true,
    slotHoldWarningMinutes: true,
    paymentMethods: true,
    financingLine: true,
    consultation: true,
    secondApprover: true,
    ratingLine: true,
    deletionGraceDays: true,
    reminderSender: true,
    reminderHours: true,
    quietHours: true,
  }),
  features: featuresSchema,
});
export const giftSettingsUpdateSchema = z.object({ version, gift: settingsSchema.shape.gift, giftRefundDays: z.number().int().min(0).max(365) });
export const homeLayoutSchema = z.object({
  /** Up to two live campaigns, in order (PROMO 11). */
  offers: z.array(z.string().max(80)).max(2),
  ratingLine: z.boolean(),
});
export const homeLayoutUpdateSchema = homeLayoutSchema.extend({ version });
/** STF-34: what Home shows now, and the campaigns that could go there (live or scheduled, not ended or archived). */
export const homeLayoutViewSchema = homeLayoutSchema.extend({
  version,
  candidates: z.array(z.object({ id: z.string(), title: z.string(), phase: z.string(), endsAt: isoTime })),
});
export type HomeLayoutView = z.infer<typeof homeLayoutViewSchema>;
export const settingsResultSchema = z.object({ version, notice: z.string().nullable() });

// ---------- Operations (STF-23–30) ----------

export const todaySchema = z.object({
  bookingMode: z.enum(['handoff', 'inapp']),
  synced: z.boolean(),
  visits: z.array(z.object({ id: z.string(), at: isoTime, customer: z.string(), service: z.string(), professional: z.string().nullable(), status: z.string() })),
  requests: z.array(
    z.object({ id: z.string(), reference: z.string(), customer: z.string(), type: z.enum(['change', 'cancel']), status: z.string(), message: z.string(), visitAt: isoTime, late: z.boolean(), createdAt: isoTime }),
  ),
});
export type Today = z.infer<typeof todaySchema>;

export const requestDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  type: z.enum(['change', 'cancel']),
  status: z.enum(['submitted', 'in_progress', 'approved', 'declined', 'call_needed', 'done']),
  message: z.string(),
  createdAt: isoTime,
  customer: z.object({ id: z.string(), name: z.string(), phone: z.string(), pastVisits: z.number().int() }),
  visit: z.object({ ref: z.string(), service: z.string(), at: isoTime, source: z.string(), professional: z.string().nullable() }),
  late: z.boolean(),
  lateRule: z.string(),
  freshaUrl: z.string().nullable(),
});
export type RequestDetail = z.infer<typeof requestDetailSchema>;

export const customerRowSchema = z.object({ id: z.string(), name: z.string().nullable(), phone: z.string(), lastVisit: isoTime.nullable() });
export const customerProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string(),
  email: z.string().nullable(),
  since: isoTime,
  offers: z.boolean(),
  visits: z.array(z.object({ ref: z.string(), service: z.string(), at: isoTime, status: z.string(), professional: z.string().nullable() })),
  value: z.array(z.object({ id: z.string(), label: z.string(), value: z.string() })),
  openMatchCase: z.object({ id: z.string(), reference: z.string(), state: z.string(), decision: z.string() }).nullable(),
  lastMessage: z.string().nullable(),
});
export type CustomerProfile = z.infer<typeof customerProfileSchema>;

export const matchCaseDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  decision: z.string(),
  newRecord: z.object({ name: z.string().nullable(), phone: z.string() }),
  oldRecord: z.object({ name: z.string(), phone: z.string(), items: z.array(z.object({ kind: z.string(), title: z.string(), value: z.string().nullable() })) }).nullable(),
  sameName: z.boolean(),
});

export const inboxRowSchema = z.object({ id: z.string(), reference: z.string(), customer: z.string(), topic: z.string(), status: z.enum(['new', 'in_progress', 'waiting', 'done']), preview: z.string(), createdAt: isoTime });
export const inboxThreadSchema = inboxRowSchema.extend({
  customerId: z.string(),
  channel: z.enum(['text', 'email', 'app']),
  message: z.string(),
  replies: z.array(z.object({ id: z.string(), message: z.string(), channel: z.enum(['text', 'email', 'app']), delivery: z.enum(['pending', 'sent', 'failed']), createdAt: isoTime, by: z.string() })),
});
export type InboxThread = z.infer<typeof inboxThreadSchema>;
export const replySchema = z.object({ message: z.string().trim().min(2).max(2000), channel: z.enum(['text', 'email', 'app']), idempotencyKey: z.string().min(8).max(64) });
export const inboxStatusSchema = z.object({ status: z.enum(['new', 'in_progress', 'waiting', 'done']) });

export const giftActionSchema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  recipientName: z.string().trim().min(1).max(60).optional(),
  recipientPhone: z.string().min(7).max(32).optional(),
  reason: z.string().trim().min(3).max(200).optional(),
  /** Void only: also refund the unused value to the buyer's payment (needs payments.refund). */
  refund: z.boolean().optional(),
});
/** STF-17 gift card as staff see it. The full code is never stored or shown, only its last four. */
export const staffGiftSchema = z.object({
  id: z.string(),
  reference: z.string(),
  remainingCents: z.number().int(),
  originalCents: z.number().int(),
  recipientName: z.string().nullable(),
  recipientPhoneMasked: z.string().nullable(),
  buyerName: z.string().nullable(),
  delivery: z.enum(['scheduled', 'sent', 'failed', 'cancelled']).nullable(),
  sendAt: isoTime.nullable(),
  sentAt: isoTime.nullable(),
  claimed: z.boolean(),
  voided: z.boolean(),
  refundableCents: z.number().int(),
});
export type StaffGift = z.infer<typeof staffGiftSchema>;

// ---------- Push (STF-35) and reports (STF-37) ----------

export const pushCreateSchema = z.object({
  text: z.string().trim().min(5).max(110),
  opens: z.string().startsWith('/').max(200),
  sendAt: isoTime.nullable(),
  idempotencyKey: z.string().min(8).max(64),
});
export const pushMessageSchema = z.object({ id: z.string(), text: z.string(), opens: z.string(), sendAt: isoTime, audienceCount: z.number().int(), status: z.enum(['scheduled', 'cancelled', 'sent']), version });
export const pushListSchema = z.object({ audience: z.number().int(), messages: z.array(pushMessageSchema) });

/** A metric is a number, or `null` with the reason it isn't available (never a made-up figure). */
const metric = z.object({ value: z.number().nullable(), unavailable: z.string().nullable() });
export const reportsSchema = z.object({
  period: z.enum(['week', 'month', 'all']),
  from: isoTime.nullable(),
  bookingsStarted: metric,
  bookingsCompleted: metric,
  giftCards: z.object({ count: z.number().int(), cents: z.number().int() }),
  packages: z.object({ count: z.number().int(), cents: z.number().int() }),
  refundsCents: z.number().int(),
  promoCodes: z.array(z.object({ code: z.string(), uses: z.number().int() })),
  campaigns: z.array(z.object({ id: z.string(), title: z.string(), views: metric, taps: metric, bookings: metric })),
});
export type Reports = z.infer<typeof reportsSchema>;
