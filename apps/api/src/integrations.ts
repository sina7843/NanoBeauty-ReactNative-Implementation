import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// Integration boundaries (IMPLEMENTATION_DECISIONS §6). Vendors are not chosen (open-items E2–E5),
// so only deterministic development adapters exist. They never report success that a real
// system of record would have to confirm, and config refuses them in production.

/**
 * SMS OTP (E3). Phone number is the identity (A6). The provider owns the code; the API tracks attempts,
 * expiry and lockouts itself so limits don't depend on the vendor.
 */
export interface OtpProvider {
  send(phoneE164: string): Promise<{ providerRef: string }>;
  check(providerRef: string, code: string): Promise<'approved' | 'wrong' | 'expired'>;
}

/**
 * App Review sign-in (NANO-11). Store reviewers can't receive our texts, so one configured number signs in with one
 * configured code instead of an SMS. Off unless both values are set (environment only, never in the repo); every
 * other number goes to the real provider. Attempts, expiry and lockouts still apply (the API counts them).
 */
export function withReviewAccount(
  otp: OtpProvider,
  review: { phone: string; code: string; expiresAt: number } | null,
  now: () => number = Date.now,
): OtpProvider {
  if (!review) return otp;
  const expected = Buffer.from(review.code);
  return {
    async send(phoneE164) {
      // After REVIEW_EXPIRES the number is an ordinary number again (real SMS), so a forgotten setting can't linger.
      if (phoneE164 !== review.phone || now() >= review.expiresAt) return otp.send(phoneE164);
      return { providerRef: `review_${randomInt(0, 2 ** 31)}` };
    },
    async check(providerRef, code) {
      if (!providerRef.startsWith('review_')) return otp.check(providerRef, code);
      if (now() >= review.expiresAt) return 'expired';
      const given = Buffer.from(code);
      return given.length === expected.length && timingSafeEqual(given, expected) ? 'approved' : 'wrong';
    },
  };
}

export interface OutboundMessage {
  channel: 'email' | 'push' | 'sms';
  to: string;
  template: string;
  data: Record<string, string>;
}

export interface MessageSender {
  send(message: OutboundMessage): Promise<{ id: string }>;
}

export type PaymentContext = 'deposit' | 'package' | 'gift';
export type PaymentMethodId = 'card' | 'apple_pay' | 'google_pay' | 'klarna' | 'affirm';
export type PaymentStatus = 'requires_action' | 'processing' | 'succeeded' | 'declined' | 'cancelled';
export type FailureReason = 'declined' | 'cancelled' | 'expired_card' | 'insufficient_funds' | 'provider_error';
export interface ProviderPayment {
  status: PaymentStatus;
  card?: { brand: string; last4: string };
  failureReason?: FailureReason;
}
export interface ProviderEvent {
  eventId: string;
  providerRef: string;
  type: 'payment.updated' | 'refund.updated';
}

/**
 * Card / wallet / BNPL provider (R03, E4). The app never sees raw card data: card, Apple Pay and Google Pay are
 * confirmed with a token from the provider's client SDK; Klarna and Affirm run on the provider's hosted page.
 * Webhooks only say "something changed"; the API then asks the provider for the authoritative state.
 */
export interface PaymentProvider {
  /** Methods this provider can really take; ANDed with the staff switches in settings (PAY 14). */
  capabilities(): PaymentMethodId[];
  /** Whether financing can be offered for this amount at all. Never a promise of approval (PAY 04, PAY 12). */
  financingOffered(method: 'klarna' | 'affirm', amountCents: number): boolean;
  createIntent(input: {
    idempotencyKey: string;
    amountCents: number;
    context: PaymentContext;
    method: PaymentMethodId;
  }): Promise<{ providerRef: string; status: PaymentStatus; redirectUrl: string | null }>;
  confirm(providerRef: string, paymentToken: string): Promise<ProviderPayment>;
  getStatus(providerRef: string): Promise<ProviderPayment>;
  cancel(providerRef: string): Promise<void>;
  refund(input: { providerRef: string; amountCents: number; idempotencyKey: string }): Promise<{ refundRef: string; status: 'pending' | 'succeeded' | 'failed' }>;
  getRefundStatus(refundRef: string): Promise<'pending' | 'succeeded' | 'failed'>;
  /** Verified event, or null when the signature doesn't match (the request is then rejected). */
  parseWebhook(rawBody: string, signature: string | undefined): ProviderEvent | null;
}

/**
 * Fresha (D33, E2). There is no Fresha booking API. Hand-off is a link; read-back of visits depends on
 * a data connector that is not confirmed, so `not_connected` is the only honest answer today.
 */
export interface FreshaVisit {
  ref: string;
  serviceId: string | null;
  serviceName: string;
  detail: string | null;
  professional: string | null;
  startsAt: string;
  durationMin: number | null;
  status: 'confirmed' | 'pending' | 'changed' | 'cancelled' | 'completed' | 'noshow';
  depositCAD: number | null;
}

export interface FreshaGateway {
  handoffUrl(): string | null;
  /** True only when a real read-back (data connector) exists; until then the app shows "not synced" states. */
  isConnected(): boolean;
  readVisits(phoneE164: string): Promise<{ status: 'not_connected' } | { status: 'synced'; visits: FreshaVisit[] }>;
}

export interface LegacyRecord {
  ref: string;
  firstName: string;
  lastName: string;
  items: { kind: 'visit' | 'package' | 'giftCard' | 'credit'; title: string; value: string | null }[];
}

/** Old app (Lead360 white-label) data (C3). Read-only: matching never moves value. */
export interface LegacyDirectory {
  /** False until the old-app export/connection exists (C3); the app then skips the match step. */
  isConnected(): boolean;
  findByPhone(
    phoneE164: string,
  ): Promise<{ status: 'not_connected' } | { status: 'not_found' } | { status: 'found'; record: LegacyRecord; sample: boolean }>;
}

/**
 * D33 gate. In-app booking (BKG-02–07, BKG-11, VIS-03) needs a booking system with a supported API. None has been
 * selected (E2: Fresha has no booking API), so no adapter reports one and `bookingMode = inapp` can't take effect.
 */
export interface BookingProvider {
  /** Name of the formally selected provider, or null. Only a real adapter may return a value. */
  selected(): string | null;
}

/** Crash/error telemetry boundary (NFR 08). Vendor not chosen (E5); reports are redacted before they leave. */
export interface ErrorReporter {
  capture(report: { message: string; code: string; requestId?: string; where: string }): void;
}

export interface Integrations {
  otp: OtpProvider;
  messages: MessageSender;
  payments: PaymentProvider;
  fresha: FreshaGateway;
  legacy: LegacyDirectory;
  booking: BookingProvider;
  errors: ErrorReporter;
}

const DEV_OTP_TTL_MS = 10 * 60_000;

/**
 * Sample old-app records for development and review builds only (labelled sample, AUT-05 "Sample records").
 * +1 604 555 0123 matches the fixtures client; +1 604 555 0199 exists under another name (mismatch).
 */
const SAMPLE_LEGACY: Record<string, LegacyRecord> = {
  '+16045550123': {
    ref: 'legacy_sample_maria',
    firstName: 'Maria',
    lastName: 'Chen',
    items: [
      { kind: 'visit', title: '1 upcoming visit', value: '16 Oct' },
      { kind: 'package', title: 'Laser package', value: '3 left' },
      { kind: 'giftCard', title: 'Gift card', value: '$95' },
      { kind: 'credit', title: 'Clinic credit', value: '$40' },
    ],
  },
  '+16045550199': { ref: 'legacy_sample_jordan', firstName: 'Jordan', lastName: 'Lee', items: [] },
};

/** Sample bookings from the handover fixtures (appointments) for the sample client. */
const SAMPLE_FRESHA: Record<string, FreshaVisit[]> = {
  '+16045550123': [
    { ref: 'NB-20418', serviceId: 'svc_hifu', serviceName: '12D HIFU', detail: 'Full face', professional: 'Nazanin (Naz)', startsAt: '2026-10-16T14:30:00-07:00', durationMin: 90, status: 'confirmed', depositCAD: 50 },
    { ref: 'NB-20533', serviceId: 'svc_laser', serviceName: 'Laser Hair Removal', detail: null, professional: 'Anna', startsAt: '2026-11-13T11:00:00-08:00', durationMin: 20, status: 'pending', depositCAD: null },
    { ref: 'NB-19877', serviceId: 'svc_laser', serviceName: 'Laser Hair Removal', detail: 'Underarms', professional: 'Anna', startsAt: '2026-08-28T11:00:00-07:00', durationMin: 20, status: 'completed', depositCAD: null },
  ],
};

const digest = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);

export function createDevIntegrations(
  options: {
    freshaBookingUrl?: string | undefined;
    now?: () => number;
    /** Deterministic codes for tests. */
    generateCode?: () => string;
    /** Serve SAMPLE_LEGACY instead of reporting the old app as not connected. */
    sampleLegacy?: boolean;
    /** Simulate a connected Fresha read-back with SAMPLE_FRESHA bookings (local development and tests only). */
    sampleFresha?: boolean;
    /** Methods the dev payment provider supports (default: all five). */
    paymentCapabilities?: PaymentMethodId[];
  } = {},
) {
  const now = options.now ?? Date.now;
  const generateCode = options.generateCode ?? (() => String(randomInt(0, 1_000_000)).padStart(6, '0'));
  const codes = new Map<string, { code: string; expiresAt: number }>();
  /**
   * The ONLY place development OTP codes are visible (dev/test sink). Never logged. Reachable over HTTP only
   * through the dev-only route, and only when DEV_OTP_SINK is enabled outside production.
   */
  const otpSink = new Map<string, string>();
  /** Simulated Fresha bookings by phone; tests add one to stand for "the customer booked in Fresha". */
  const freshaBookings = new Map<string, FreshaVisit[]>(Object.entries(SAMPLE_FRESHA).map(([k, v]) => [k, [...v]]));
  /** Captured instead of delivered; tests and local tooling read it. */
  const outbox: OutboundMessage[] = [];
  /** Captured error reports (already redacted); tests read it. */
  const errorReports: Parameters<ErrorReporter['capture']>[0][] = [];
  let sequence = 0;

  const { provider: devPayments, control: paymentControl } = createDevPayments(options.paymentCapabilities);

  const integrations: Integrations = {
    otp: {
      async send(phoneE164) {
        const providerRef = `dev_otp_${digest(`${phoneE164}:${++sequence}`)}`;
        const code = generateCode();
        codes.set(providerRef, { code, expiresAt: now() + DEV_OTP_TTL_MS });
        otpSink.set(phoneE164, code);
        return { providerRef };
      },
      async check(providerRef, code) {
        const entry = codes.get(providerRef);
        if (!entry || now() > entry.expiresAt) return 'expired';
        if (code !== entry.code) return 'wrong';
        codes.delete(providerRef);
        return 'approved';
      },
    },
    messages: {
      async send(message) {
        outbox.push(message);
        return { id: `dev_msg_${outbox.length}` };
      },
    },
    payments: devPayments,
    booking: { selected: () => null },
    errors: { capture: (report) => void errorReports.push(report) },
    fresha: {
      handoffUrl: () => options.freshaBookingUrl ?? null,
      isConnected: () => !!options.sampleFresha,
      async readVisits(phoneE164) {
        if (!options.sampleFresha) return { status: 'not_connected' };
        return { status: 'synced', visits: [...(freshaBookings.get(phoneE164) ?? [])] };
      },
    },
    legacy: {
      isConnected: () => !!options.sampleLegacy,
      async findByPhone(phoneE164) {
        if (!options.sampleLegacy) return { status: 'not_connected' };
        const record = SAMPLE_LEGACY[phoneE164];
        return record ? { status: 'found', record, sample: true } : { status: 'not_found' };
      },
    },
  };
  return { integrations, outbox, otpSink, freshaBookings, paymentControl, errorReports };
}

/** Development-only webhook secret: the dev provider signs, the API verifies, exactly like a real provider would. */
const DEV_WEBHOOK_SECRET = 'dev-only-webhook-secret';
export const signDevWebhook = (body: string) => createHmac('sha256', DEV_WEBHOOK_SECRET).update(body).digest('hex');

/**
 * Deterministic payment provider for development and tests (no money moves). Test tokens decide card outcomes:
 * `tok_visa` succeeds, `tok_decline` / `tok_insufficient` are declined, `tok_3ds` needs a bank check,
 * `tok_timeout` stays processing. Klarna/Affirm wait on their hosted page until `control.settle`.
 */
export function createDevPayments(capabilities: PaymentMethodId[] = ['card', 'apple_pay', 'google_pay', 'klarna', 'affirm']) {
  type Intent = ProviderPayment & { amountCents: number; refunded: number; method: PaymentMethodId };
  const intents = new Map<string, Intent>();
  const refunds = new Map<string, 'pending' | 'succeeded' | 'failed'>();
  let events = 0;
  const intentFor = (ref: string) => {
    const intent = intents.get(ref);
    if (!intent) throw new Error('unknown provider ref');
    return intent;
  };
  const view = ({ status, card, failureReason }: Intent): ProviderPayment => ({ status, ...(card ? { card } : {}), ...(failureReason ? { failureReason } : {}) });

  const provider: PaymentProvider = {
    capabilities: () => capabilities,
    // Sample rule standing in for the provider's own eligibility (E4): financing from $50 to $10,000.
    financingOffered: (_method, amountCents) => amountCents >= 5000 && amountCents <= 1_000_000,
    async createIntent({ idempotencyKey, amountCents, method }) {
      const providerRef = `dev_pay_${digest(idempotencyKey)}`;
      if (!intents.has(providerRef)) intents.set(providerRef, { status: 'requires_action', amountCents, refunded: 0, method });
      const redirect = method === 'klarna' || method === 'affirm';
      return { providerRef, status: intentFor(providerRef).status, redirectUrl: redirect ? `https://pay.example.invalid/${method}/${providerRef}` : null };
    },
    async confirm(providerRef, token) {
      const intent = intentFor(providerRef);
      // A confirmed intent never changes again (a second confirm is a no-op, like a real provider).
      if (intent.status !== 'requires_action') return view(intent);
      const card = { brand: 'Visa', last4: '4242' };
      if (token === 'tok_visa') Object.assign(intent, { status: 'succeeded', card });
      else if (token === 'tok_decline') Object.assign(intent, { status: 'declined', failureReason: 'declined' });
      else if (token === 'tok_insufficient') Object.assign(intent, { status: 'declined', failureReason: 'insufficient_funds' });
      else if (token === 'tok_timeout' || token === 'tok_3ds') Object.assign(intent, { status: token === 'tok_3ds' ? 'requires_action' : 'processing', card });
      else Object.assign(intent, { status: 'declined', failureReason: 'provider_error' });
      return view(intent);
    },
    async getStatus(providerRef) {
      return view(intentFor(providerRef));
    },
    async cancel(providerRef) {
      const intent = intentFor(providerRef);
      if (intent.status === 'requires_action' || intent.status === 'processing') Object.assign(intent, { status: 'cancelled', failureReason: 'cancelled' });
    },
    async refund({ providerRef, amountCents, idempotencyKey }) {
      const refundRef = `dev_re_${digest(idempotencyKey)}`;
      if (!refunds.has(refundRef)) {
        const intent = intentFor(providerRef);
        const ok = intent.status === 'succeeded' && intent.refunded + amountCents <= intent.amountCents;
        if (ok) intent.refunded += amountCents;
        refunds.set(refundRef, ok ? 'succeeded' : 'failed');
      }
      return { refundRef, status: refunds.get(refundRef)! };
    },
    async getRefundStatus(refundRef) {
      return refunds.get(refundRef) ?? 'failed';
    },
    parseWebhook(rawBody, signature) {
      if (!signature) return null;
      const expected = Buffer.from(signDevWebhook(rawBody));
      const given = Buffer.from(signature);
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
      try {
        const event = JSON.parse(rawBody) as ProviderEvent;
        return typeof event.eventId === 'string' && typeof event.providerRef === 'string' ? event : null;
      } catch {
        return null;
      }
    },
  };

  const control = {
    /** The customer finished (or abandoned) the bank check / hosted page, or the bank answered late. */
    settle(providerRef: string, outcome: 'succeeded' | 'declined' | 'cancelled') {
      const intent = intentFor(providerRef);
      if (intent.status === 'requires_action' || intent.status === 'processing') {
        Object.assign(intent, outcome === 'succeeded' ? { status: outcome, card: intent.card ?? { brand: 'Visa', last4: '4242' } } : { status: outcome, failureReason: outcome });
      }
    },
    /** A signed webhook delivery for a payment, as the provider would send it. */
    webhook(providerRef: string, eventId = `evt_${++events}`) {
      const body = JSON.stringify({ eventId, providerRef, type: 'payment.updated' } satisfies ProviderEvent);
      return { body, signature: signDevWebhook(body) };
    },
    setRefund(refundRef: string, status: 'pending' | 'succeeded' | 'failed') {
      refunds.set(refundRef, status);
    },
  };
  return { provider, control };
}
