import { z } from 'zod';

// Public discovery content (NANO-03). Everything a screen shows comes from these payloads; nothing is
// hard-coded in the app. `sample: true` keeps Sample badges until the clinic publishes real content.

const isoTime = z.iso.datetime({ offset: true });

export const priceSchema = z.object({
  kind: z.enum(['fixed', 'from', 'range', 'perUnit', 'consultation']),
  amount: z.number().nonnegative().optional(),
  min: z.number().nonnegative().optional(),
  max: z.number().nonnegative().optional(),
  unit: z.string().optional(),
});
export type Price = z.infer<typeof priceSchema>;

export const categorySchema = z.object({ id: z.string(), name: z.string(), photo: z.string().nullable() });
export const concernSchema = z.object({ id: z.string(), name: z.string(), homeRank: z.number().int().nullable() });

export const professionalSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Title, bio and photo only when written consent is on file (C5); otherwise null and no profile page. */
  profile: z.object({ title: z.string().nullable(), bio: z.string().nullable(), photo: z.string().nullable() }).nullable(),
  sample: z.boolean(),
});
export type Professional = z.infer<typeof professionalSchema>;

export const careStepSchema = z.object({ when: z.string(), title: z.string(), text: z.string().optional() });
export const faqItemSchema = z.object({ q: z.string(), a: z.string() });

export const serviceSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  concerns: z.array(z.string()),
  description: z.string().nullable(),
  price: priceSchema,
  durationLabel: z.string().nullable(),
  durationMin: z.number().int().nullable(),
  perArea: z.boolean(),
  photo: z.string().nullable(),
  /** live = bookable; unavailable = shown, not bookable (TRT-07); archived = reachable from old links only. */
  status: z.enum(['live', 'unavailable', 'archived']),
  professionals: z.array(z.string()),
  faq: z.array(faqItemSchema),
  care: z.array(careStepSchema),
  suitabilityArticle: z.string().nullable(),
  sample: z.boolean(),
});
export type Service = z.infer<typeof serviceSchema>;

/** `GET /v1/catalog` — one cacheable payload; search and filters run on it, offline too. */
export const catalogSchema = z.object({
  categories: z.array(categorySchema),
  concerns: z.array(concernSchema),
  services: z.array(serviceSchema),
  professionals: z.array(professionalSchema),
});
export type Catalog = z.infer<typeof catalogSchema>;

export const linkSchema = z.object({ label: z.string(), href: z.string().startsWith('/') });

export const offerSchema = z.object({
  id: z.string(),
  eyebrow: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  body: z.string().nullable(),
  photo: z.string().nullable(),
  startsAt: isoTime,
  endsAt: isoTime,
  /** Computed by the server from its own clock (PROMO 09). */
  state: z.enum(['live', 'upcoming', 'paused', 'expired']),
  audience: z.enum(['all', 'returning']),
  eligible: z.array(z.object({ title: z.string(), was: z.number(), now: z.number() })),
  terms: z.array(z.string()),
  /** Exact destination while live; `fallback` is the safe destination once ended or paused (PROMO 05). */
  cta: linkSchema,
  fallback: linkSchema,
  sample: z.boolean(),
});
export type Offer = z.infer<typeof offerSchema>;

export const homeContentSchema = z.object({
  hero: z.object({ title: z.string(), subtitle: z.string(), photo: z.string().nullable(), alt: z.string() }),
  /** At most two, in the staff-chosen order (DISC 11, PROMO 11). */
  offers: z.array(offerSchema).max(2),
  rating: z.object({ value: z.number(), count: z.number().int(), source: z.string() }).nullable(),
  sample: z.boolean(),
  serverTime: isoTime,
});
export type HomeContent = z.infer<typeof homeContentSchema>;

export const offerResponseSchema = z.object({
  offer: offerSchema,
  /** Live offers to suggest when this one has ended (OFR-04). */
  alternatives: z.array(offerSchema),
  serverTime: isoTime,
});
export type OfferResponse = z.infer<typeof offerResponseSchema>;

export const promoValidateRequestSchema = z.object({
  code: z.string().trim().min(1).max(40),
  /** What the person is buying, when known (e.g. "package:laser"), for the "doesn't apply" state. */
  appliesTo: z.string().max(60).optional(),
});
/** OFR-03 states (PROMO 06), plus `notyet` for a code whose start is in the future. */
export const promoStateSchema = z.enum(['valid', 'invalid', 'ended', 'notyet', 'usedup', 'noteligible', 'alreadyused']);
export const promoValidateResponseSchema = z.object({
  state: promoStateSchema,
  code: z.string(),
  description: z.string().nullable(),
  appliesLabel: z.string().nullable(),
  /** ISO times for the ended / not-yet / already-used messages. */
  endedAt: isoTime.nullable(),
  startsAt: isoTime.nullable(),
  usedAt: isoTime.nullable(),
  campaignId: z.string().nullable(),
});
export type PromoValidation = z.infer<typeof promoValidateResponseSchema>;

export const articleSchema = z.object({ id: z.string(), title: z.string(), body: z.array(z.string()), sample: z.boolean() });
export type Article = z.infer<typeof articleSchema>;
export const supportHubSchema = z.object({
  articles: z.array(z.object({ id: z.string(), title: z.string() })),
  askTopics: z.array(z.string()),
});
export type SupportHub = z.infer<typeof supportHubSchema>;

export const policySchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.string(),
  updatedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  sample: z.boolean(),
});
export type Policy = z.infer<typeof policySchema>;

/** SUP-04 Ask us (SUP 05). */
export const supportQuestionRequestSchema = z.object({
  topic: z.string().trim().min(1).max(60),
  channel: z.enum(['text', 'email', 'app']),
  message: z.string().trim().min(3).max(1000),
  /** Same key on a retry → same reference, no duplicate question. */
  idempotencyKey: z.string().min(8).max(64),
});
export const supportQuestionResponseSchema = z.object({ reference: z.string() });
