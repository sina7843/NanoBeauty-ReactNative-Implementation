import { createHash } from 'node:crypto';

// Integration boundaries (IMPLEMENTATION_DECISIONS §6). Vendors are not chosen (open-items E2–E5),
// so only deterministic development adapters exist. They never report success that a real
// system of record would have to confirm, and config refuses them in production.

/** SMS OTP (E3). Phone number is the identity (A6). */
export interface OtpProvider {
  start(phoneE164: string): Promise<{ challengeId: string }>;
  check(challengeId: string, code: string): Promise<'approved' | 'wrong' | 'expired'>;
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

/** Old app (Lead360 white-label) data (C3). No export received yet. */
export interface LegacyDirectory {
  findByPhone(phoneE164: string): Promise<{ status: 'not_connected' } | { status: 'found' | 'not_found' }>;
}

export interface Integrations {
  otp: OtpProvider;
  messages: MessageSender;
  payments: PaymentProvider;
  fresha: FreshaGateway;
  legacy: LegacyDirectory;
}

const DEV_OTP_CODE = '000000';
const DEV_OTP_TTL_MS = 5 * 60_000;

const digest = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);

export function createDevIntegrations(options: { freshaBookingUrl?: string | undefined; now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  const challenges = new Map<string, number>();
  /** Captured instead of delivered; tests and local tooling read it. */
  const outbox: OutboundMessage[] = [];
  let sequence = 0;

  const integrations: Integrations = {
    otp: {
      async start(phoneE164) {
        const challengeId = `dev_otp_${digest(`${phoneE164}:${++sequence}`)}`;
        challenges.set(challengeId, now() + DEV_OTP_TTL_MS);
        return { challengeId };
      },
      async check(challengeId, code) {
        const expiresAt = challenges.get(challengeId);
        if (expiresAt === undefined || now() > expiresAt) return 'expired';
        if (code !== DEV_OTP_CODE) return 'wrong';
        challenges.delete(challengeId);
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
      findByPhone: async () => ({ status: 'not_connected' }),
    },
  };
  return { integrations, outbox, devOtpCode: DEV_OTP_CODE };
}
