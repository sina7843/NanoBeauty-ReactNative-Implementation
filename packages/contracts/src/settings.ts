import { z } from 'zod';

// Spec 1 (phase-7 developer handoff, D37) + decisions-and-flags.md.
// Rules A1–A8 are server settings, never constants in screens.

const cad = z.number().nonnegative();
const days = z.number().int().nonnegative();

export const bookingModeSchema = z.enum(['handoff', 'inapp']);
export type BookingMode = z.infer<typeof bookingModeSchema>;

export const lateOutcomeSchema = z.enum(['keepDeposit', 'credit', 'none']);
export type LateOutcome = z.infer<typeof lateOutcomeSchema>;

export const paymentMethodsSchema = z.object({
  card: z.boolean(),
  applePay: z.boolean(),
  googlePay: z.boolean(),
  klarna: z.boolean(),
  affirm: z.boolean(),
});
export type PaymentMethods = z.infer<typeof paymentMethodsSchema>;

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const clinicHoursSchema = z.object({
  /** 0 = Sunday … 6 = Saturday. A day missing from the list is closed. */
  weekly: z.array(z.object({ day: z.number().int().min(0).max(6), opens: timeOfDay, closes: timeOfDay })),
  closures: z.array(isoDate),
});

export const settingsSchema = z.object({
  /** D33. `inapp` routes stay unreachable while this is `handoff`. */
  bookingMode: bookingModeSchema,
  /** A4. `null` = no deposit. */
  deposit: z.object({ amountCAD: cad, overCAD: cad }).nullable(),
  freeChangeHours: z.number().int().nonnegative(),
  lateCancelOutcome: lateOutcomeSchema,
  /** Late-change rule: same outcome family as late cancel (spec 1). */
  lateChangeOutcome: lateOutcomeSchema,
  noShowOutcome: lateOutcomeSchema,
  slotHoldMinutes: z.number().int().positive(),
  slotHoldWarningMinutes: z.number().int().nonnegative(),
  /** Visibility also requires real provider capability (IMPLEMENTATION_DECISIONS §6). */
  paymentMethods: paymentMethodsSchema,
  financingLine: z.object({ on: z.boolean(), minCAD: cad }),
  gift: z.object({
    presetsCAD: z.array(cad).min(1),
    customRangeCAD: z.tuple([cad, cad]).refine(([min, max]) => min <= max, 'min must be <= max'),
    /** Locked off: BC gift-card law forbids expiry. */
    expiry: z.null(),
    designs: z.array(z.string().min(1)).min(1),
  }),
  consultation: z.object({ priceCAD: cad, credited: z.boolean() }),
  /** D35. Off by default; publish-with-confirm is the normal path. */
  secondApprover: z.object({
    on: z.boolean(),
    fields: z.array(z.enum(['price', 'policy', 'offerTerms'])),
  }),
  /** `null` = "[clinic to confirm]". */
  clinicHours: clinicHoursSchema.nullable(),
  ratingLine: z.object({ on: z.boolean(), source: z.string().min(1) }),
  giftRefundDays: days,
  /** NOTIF 07 / E6: exactly one sender of appointment reminders. Fresha already sends them, so it is the default. */
  reminderSender: z.enum(['fresha', 'app']),
  /** NTF-02 timing (hours before the visit), used only when the app sends reminders. */
  reminderHours: z.array(z.number().int().min(1).max(168)).min(1).max(3),
  /** Clinic-local quiet hours (spec 3: 9 pm–8 am sample). Texts and non-urgent pushes wait until it ends. */
  quietHours: z.object({ start: timeOfDay, end: timeOfDay }),
  deletionGraceDays: days,
  /** True while values are samples awaiting clinic confirmation (A1–A8) — screens keep Sample badges. */
  sample: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const featuresSchema = z.object({
  /** D38. Hidden by default until the client confirms. */
  legacyMembership: z.boolean(),
});
export type Features = z.infer<typeof featuresSchema>;

export const clinicInfoSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  timezone: z.string().min(1),
  /** `null` = placeholder until the clinic confirms (open-items C7). */
  phone: z.string().nullable(),
  parking: z.string().nullable(),
  directionsUrl: z.url().nullable(),
  supportReplyTime: z.string().nullable(),
});
export type ClinicInfo = z.infer<typeof clinicInfoSchema>;

const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'MAJOR.MINOR.PATCH');

/** Remote entry gates (phase-7 route map: ENT-02 update required, ENT-03 maintenance). */
export const appGateSchema = z.object({
  minimumVersion: z.object({ ios: semver, android: semver }),
  /** Store listing to open from "Update now". `null` until the listing exists. */
  storeUrl: z.object({ ios: z.url().nullable(), android: z.url().nullable() }),
  /** `null` = no maintenance. `until` is shown as clinic-local time. */
  maintenance: z.object({ until: z.iso.datetime({ offset: true }) }).nullable(),
});
export type AppGate = z.infer<typeof appGateSchema>;

/** `GET /v1/settings` body. `version` increments on every staff change. */
export const settingsBootstrapSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime({ offset: true }),
  settings: settingsSchema,
  features: featuresSchema,
  clinic: clinicInfoSchema,
  app: appGateSchema,
});
export type SettingsBootstrap = z.infer<typeof settingsBootstrapSchema>;
