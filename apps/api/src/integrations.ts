import { createHash, randomInt } from 'node:crypto';

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
export type PaymentStatus = 'requires_action' | 'pending' | 'paid' | 'declined' | 'cancelled';

/** Card / wallet / BNPL provider (E4). The app never sees raw card data. */
export interface PaymentProvider {
  createIntent(input: {
    idempotencyKey: string;
    amountCents: number;
    context: PaymentContext;
  }): Promise<{ providerRef: string; status: PaymentStatus }>;
  getStatus(providerRef: string): Promise<PaymentStatus>;
}

/**
 * Fresha (D33, E2). There is no Fresha booking API. Hand-off is a link; read-back of visits depends on
 * a data connector that is not confirmed, so `not_connected` is the only honest answer today.
 */
export interface FreshaGateway {
  handoffUrl(): string | null;
  readVisits(customerRef: string): Promise<{ status: 'not_connected' } | { status: 'synced'; visits: unknown[] }>;
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

export interface Integrations {
  otp: OtpProvider;
  messages: MessageSender;
  payments: PaymentProvider;
  fresha: FreshaGateway;
  legacy: LegacyDirectory;
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

const digest = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);

export function createDevIntegrations(
  options: {
    freshaBookingUrl?: string | undefined;
    now?: () => number;
    /** Deterministic codes for tests. */
    generateCode?: () => string;
    /** Serve SAMPLE_LEGACY instead of reporting the old app as not connected. */
    sampleLegacy?: boolean;
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
  /** Captured instead of delivered; tests and local tooling read it. */
  const outbox: OutboundMessage[] = [];
  let sequence = 0;

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
    payments: {
      // Same idempotency key → same provider ref. Never auto-completes: a dev payment stays pending.
      async createIntent({ idempotencyKey }) {
        return { providerRef: `dev_pay_${digest(idempotencyKey)}`, status: 'requires_action' };
      },
      async getStatus() {
        return 'pending';
      },
    },
    fresha: {
      handoffUrl: () => options.freshaBookingUrl ?? null,
      readVisits: async () => ({ status: 'not_connected' }),
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
  return { integrations, outbox, otpSink };
}
