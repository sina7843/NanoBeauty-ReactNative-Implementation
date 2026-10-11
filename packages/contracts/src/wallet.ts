import { z } from 'zod';

// NANO-06 payments (PAY 01–14) and wallet (WALT 01–15). Money is integer cents end to end; balances are computed
// by the server from an append-only ledger and the app shows only what the server confirmed.

const isoTime = z.iso.datetime({ offset: true });
const cents = z.number().int();
/** $10,000: well above any single purchase; keeps staff inputs inside the integer column. */
const MAX_CENTS = 1_000_000;

export const paymentMethodSchema = z.enum(['card', 'apple_pay', 'google_pay', 'klarna', 'affirm']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// ---------- Catalogue ----------

export const packageSchema = z.object({
  id: z.string(),
  name: z.string(),
  serviceId: z.string().nullable(),
  sessions: z.number().int().positive(),
  priceCents: cents,
  /** Regular value of the sessions bought singly, for "Saves $…" (null = no saving claimed). */
  regularCents: cents.nullable(),
  validityMonths: z.number().int().positive().nullable(),
  /** live = can be bought; unavailable = "Back soon"; archived = no longer sold (owners keep using theirs). */
  status: z.enum(['live', 'unavailable', 'archived']),
  terms: z.array(z.string()),
  sample: z.boolean(),
});
export type Package = z.infer<typeof packageSchema>;
export const packagesResponseSchema = z.array(packageSchema);

// ---------- Orders and payment ----------

export const giftOrderSchema = z.object({
  design: z.string().min(1).max(40),
  amountCents: cents.positive(),
  recipientName: z.string().trim().min(1).max(60),
  recipientPhone: z.string().min(7).max(32),
  message: z.string().trim().max(200).nullable(),
  /** null = send as soon as the payment is confirmed. */
  sendAt: isoTime.nullable(),
});
export type GiftOrder = z.infer<typeof giftOrderSchema>;

export const orderCreateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('package'), packageId: z.string().min(1).max(80), idempotencyKey: z.string().min(8).max(64) }),
  z.object({ kind: z.literal('gift'), gift: giftOrderSchema, idempotencyKey: z.string().min(8).max(64) }),
]);

export const orderStatusSchema = z.enum(['pending', 'paid', 'cancelled', 'refunded', 'partially_refunded']);
export const orderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  kind: z.enum(['package', 'gift']),
  title: z.string(),
  detail: z.string().nullable(),
  amountCents: cents,
  status: orderStatusSchema,
  createdAt: isoTime,
});
export type Order = z.infer<typeof orderSchema>;

/** PAY-01. Only methods both switched on in settings AND supported by the provider (and eligible) are listed. */
export const methodOptionSchema = z.object({
  method: paymentMethodSchema,
  /** Neutral wording when financing can't be offered for this amount; never implies approval (PAY 04, PAY 12). */
  available: z.boolean(),
  note: z.string().nullable(),
});
export const methodsResponseSchema = z.object({ order: orderSchema, methods: z.array(methodOptionSchema) });
export type MethodOption = z.infer<typeof methodOptionSchema>;

export const attemptStatusSchema = z.enum(['requires_action', 'processing', 'succeeded', 'declined', 'cancelled']);
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;
export const attemptSchema = z.object({
  id: z.string(),
  reference: z.string(),
  orderId: z.string(),
  method: paymentMethodSchema,
  status: attemptStatusSchema,
  /** Klarna / Affirm: provider-hosted page to open in the system browser. */
  redirectUrl: z.url().nullable(),
  /** e.g. "Visa •••• 4242" once the provider reports it; never more than brand and last four. */
  methodLabel: z.string().nullable(),
  failureReason: z.enum(['declined', 'cancelled', 'expired_card', 'insufficient_funds', 'provider_error']).nullable(),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const attemptCreateSchema = z.object({ method: paymentMethodSchema, idempotencyKey: z.string().min(8).max(64) });
/** Card / Apple Pay / Google Pay: a provider token from the client SDK. Raw card data never reaches the API. */
export const attemptConfirmSchema = z.object({ paymentToken: z.string().min(3).max(200) });

export const receiptSchema = z.object({
  orderId: z.string(),
  /** Payment reference (PAY-…). */
  reference: z.string(),
  /** Order reference (NB-O-…), the one purchase history shows. */
  orderReference: z.string(),
  status: z.enum(['paid', 'refunded', 'partially_refunded']),
  lines: z.array(z.object({ label: z.string(), amountCents: cents })),
  /** GST included in the total (Sample until the clinic's accountant confirms). */
  taxIncludedCents: cents,
  totalCents: cents,
  methodLabel: z.string().nullable(),
  paidAt: isoTime,
  refunds: z.array(z.object({ reference: z.string(), amountCents: cents, status: z.enum(['pending', 'succeeded', 'failed']), createdAt: isoTime })),
  sample: z.boolean(),
});
export type Receipt = z.infer<typeof receiptSchema>;

// ---------- Wallet ----------

export const instrumentKindSchema = z.enum(['credit', 'package', 'gift_card', 'membership']);
export const ledgerLineSchema = z.object({
  kind: z.enum(['purchase', 'issue', 'redeem', 'refund', 'adjust', 'expire', 'reverse', 'import']),
  label: z.string(),
  amountCents: cents.nullable(),
  sessions: z.number().int().nullable(),
  reference: z.string().nullable(),
  createdAt: isoTime,
});
export type LedgerLine = z.infer<typeof ledgerLineSchema>;

export const instrumentSchema = z.object({
  id: z.string(),
  kind: instrumentKindSchema,
  label: z.string(),
  source: z.enum(['purchase', 'gift', 'clinic', 'legacy']),
  /** active = usable; reconciling = values hidden until the ledger is confirmed (WAL-01); ended = expired or used up; voided. */
  status: z.enum(['active', 'reconciling', 'ended', 'voided']),
  /** Money balance (credit, gift card); null for packages, and while reconciling. */
  balanceCents: cents.nullable(),
  sessions: z.object({ total: z.number().int(), used: z.number().int(), remaining: z.number().int() }).nullable(),
  expiresAt: isoTime.nullable(),
  /** Packages: the treatment the sessions are for, so "Book and use it" opens that booking (BOOK 14). */
  serviceId: z.string().nullable().optional(),
  /** Gift cards: last four characters of the code. */
  last4: z.string().nullable(),
  /** owner = in your Wallet; sender = a gift you bought for someone else (WAL-04 "sent"). */
  role: z.enum(['owner', 'sender']),
  gift: z
    .object({
      recipientName: z.string(),
      recipientPhoneMasked: z.string(),
      message: z.string().nullable(),
      design: z.string(),
      delivery: z.enum(['scheduled', 'sent', 'failed', 'cancelled']),
      sendAt: isoTime.nullable(),
      sentAt: isoTime.nullable(),
      claimedAt: isoTime.nullable(),
      /** The buyer's order (WAL-04 sent → PAY-09 receipt); sent to the buyer only. */
      orderId: z.string().nullable().optional(),
    })
    .nullable(),
});
export type Instrument = z.infer<typeof instrumentSchema>;

export const walletSchema = z.object({
  instruments: z.array(instrumentSchema),
  /** Server time the balances were computed (WAL-01 "Balances as of …" when shown offline). */
  asOf: isoTime,
});
export type Wallet = z.infer<typeof walletSchema>;

export const instrumentDetailSchema = z.object({ instrument: instrumentSchema, lines: z.array(ledgerLineSchema), terms: z.array(z.string()) });
export type InstrumentDetail = z.infer<typeof instrumentDetailSchema>;

/** WAL-06: receipts (orders) and ledger movements, newest first. */
export const historyItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  amountCents: cents.nullable(),
  sessions: z.number().int().nullable(),
  reference: z.string().nullable(),
  /** Opens PAY-09 for purchases. */
  orderId: z.string().nullable(),
  createdAt: isoTime,
});
export const historyResponseSchema = z.array(historyItemSchema);
export type HistoryItem = z.infer<typeof historyItemSchema>;

// ---------- Gifts ----------

/** WAL-11 / WEB-01. */
export const giftCodeSchema = z.object({ code: z.string().trim().min(6).max(40) });
export const giftLookupSchema = z.object({
  state: z.enum(['valid', 'claimed', 'notfound']),
  amountCents: cents.nullable(),
  recipientName: z.string().nullable(),
  fromName: z.string().nullable(),
  message: z.string().nullable(),
  design: z.string().nullable(),
  /** For the clinic to look it up (claimed / notfound support path). */
  reference: z.string(),
});
export type GiftLookup = z.infer<typeof giftLookupSchema>;
export const giftSendTimeSchema = z.object({ sendAt: isoTime.nullable() });
/** WEB-01: claim on the web after a code to the recipient's number. */
export const webGiftClaimStartSchema = z.object({ code: z.string().trim().min(6).max(40), phone: z.string().min(7).max(32) });
export const webGiftClaimConfirmSchema = z.object({ code: z.string().trim().min(6).max(40), challengeId: z.string().min(1).max(100), otp: z.string().regex(/^\d{6}$/) });

// ---------- Balance help ----------

export const balanceHelpSchema = z.object({ instrumentId: z.uuid(), expected: z.string().trim().min(3).max(500), idempotencyKey: z.string().min(8).max(64) });
export const balanceHelpResponseSchema = z.object({ reference: z.string() });

// ---------- Staff (counter redemption, lookup, adjustments, refunds) ----------

export const staffRedeemSchema = z
  .object({
    instrumentId: z.uuid(),
    amountCents: cents.positive().max(MAX_CENTS).optional(),
    sessions: z.number().int().positive().max(100).optional(),
    /** Visit or booking reference this was used at. */
    reference: z.string().trim().max(40).optional(),
    idempotencyKey: z.string().min(8).max(64),
  })
  .refine((v) => (v.amountCents === undefined) !== (v.sessions === undefined), { message: 'Give an amount or sessions, not both' });
export const staffAdjustSchema = z.object({
  /** Existing instrument, or a customer to issue clinic credit to. */
  instrumentId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  amountCents: cents.min(-MAX_CENTS).max(MAX_CENTS).refine((v) => v !== 0, 'Not zero'),
  /** What the customer sees on the line (e.g. "Late cancellation credit"); the reason is for the audit trail. */
  label: z.string().trim().min(3).max(60).optional(),
  reason: z.string().trim().min(3).max(200),
  idempotencyKey: z.string().min(8).max(64),
});
export const staffRefundSchema = z.object({
  amountCents: cents.positive().max(MAX_CENTS),
  reason: z.string().trim().min(3).max(200),
  idempotencyKey: z.string().min(8).max(64),
});
export const lookupResponseSchema = z.object({
  customer: z.object({ id: z.string(), name: z.string().nullable(), phoneMasked: z.string() }).nullable(),
  instruments: z.array(instrumentSchema),
});
