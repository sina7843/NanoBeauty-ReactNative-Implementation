// Analytics boundary (spec 4; vendor not chosen — open-items E5). Only events in EVENT_MAP are sent and only with
// their listed properties; anything else is dropped. "Usage" events need the person's analytics opt-in (ACC-06);
// "Essential" events run the service and carry no marketing data. Never names, phones, emails, free text or health
// details: values are short ids, enums, counts or bands.
export type AnalyticsProps = Record<string, string | number | boolean>;

type Kind = 'usage' | 'essential';
type PropType = 'id' | 'ids' | 'enum' | 'count' | 'bool' | 'seconds';

/** Spec 4 event map: event → consent class and allowed properties. */
export const EVENT_MAP: Record<string, { kind: Kind; props: Record<string, PropType> }> = {
  treatment_viewed: { kind: 'usage', props: { service_id: 'id', category: 'id', price_kind: 'enum', source: 'enum' } },
  booking_started: { kind: 'usage', props: { entry_point: 'enum', service_count: 'count', mode: 'enum' } },
  booking_step_completed: { kind: 'usage', props: { step: 'enum', mode: 'enum' } },
  handoff_opened: { kind: 'usage', props: { service_ids: 'ids', first_time: 'bool' } },
  handoff_returned: { kind: 'essential', props: { result: 'enum', seconds_away: 'seconds' } },
  booking_confirmed: { kind: 'essential', props: { ref: 'id', service_count: 'count', deposit: 'bool', mode: 'enum' } },
  payment_started: { kind: 'usage', props: { context: 'enum', method: 'enum' } },
  payment_succeeded: { kind: 'essential', props: { context: 'enum', method: 'enum', amount_band: 'enum' } },
  payment_failed: { kind: 'essential', props: { context: 'enum', method: 'enum', reason: 'enum' } },
  offer_viewed: { kind: 'usage', props: { offer_id: 'id', placement: 'enum' } },
  offer_tapped: { kind: 'usage', props: { offer_id: 'id', cta: 'enum' } },
  // No code_id: what someone typed can be personal or a single-use secret.
  promo_code_result: { kind: 'usage', props: { result: 'enum' } },
  gift_purchased: { kind: 'essential', props: { amount_band: 'enum', design: 'id', scheduled: 'bool' } },
  package_purchased: { kind: 'essential', props: { package_id: 'id', method: 'enum' } },
  gift_claimed: { kind: 'essential', props: { channel: 'enum', kept_code: 'bool' } },
  support_contact: { kind: 'usage', props: { topic: 'enum', channel: 'enum' } },
  account_deletion_requested: { kind: 'essential', props: { route: 'enum' } },
  push_sent: { kind: 'essential', props: { audience_size_band: 'enum', offer_id: 'id' } },
};

const SHAPE: Record<PropType, (v: unknown) => boolean> = {
  // Record ids and enum values: short, no spaces, no '@' (never a person's details or free text).
  id: (v) => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(v),
  ids: (v) => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,64}(,[A-Za-z0-9_.:-]{1,64}){0,19}$/.test(v),
  enum: (v) => typeof v === 'string' && /^[a-z0-9_]{1,32}$/.test(v),
  count: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1000,
  seconds: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 86_400 * 30,
  bool: (v) => typeof v === 'boolean',
};

/** Keeps only the event's allowed properties in their allowed shape; null drops the event (unknown name). */
export function sanitize(event: string, props: AnalyticsProps): AnalyticsProps | null {
  const spec = EVENT_MAP[event];
  if (!spec) return null;
  const out: AnalyticsProps = {};
  for (const [key, type] of Object.entries(spec.props)) {
    const v = type === 'seconds' && typeof props[key] === 'number' ? Math.round(props[key] as number) : props[key];
    if (v !== undefined && SHAPE[type](v)) out[key] = v;
  }
  return out;
}

/** Amounts are reported as bands, never exact figures (cents in, band out). */
export function amountBand(cents: number): string {
  const dollars = cents / 100;
  if (dollars < 50) return 'under_50';
  if (dollars < 150) return '50_149';
  if (dollars < 500) return '150_499';
  if (dollars < 1000) return '500_999';
  return '1000_plus';
}
export function sizeBand(n: number): string {
  return n < 10 ? 'under_10' : n < 100 ? '10_99' : n < 1000 ? '100_999' : '1000_plus';
}

export interface AnalyticsSink {
  track(event: string, props: AnalyticsProps): void;
}

/** Development sink: logs in dev builds, sends nothing anywhere. */
const devSink: AnalyticsSink = {
  track(event, props) {
    if (__DEV__) console.info('[analytics]', event, props);
  },
};

let sink: AnalyticsSink = devSink;
let consented = false;

export const analytics = {
  /** From the person's analytics consent (`/v1/me` consents); off for guests and until they opt in. */
  setConsent(value: boolean) {
    consented = value;
  },
  setSink(next: AnalyticsSink) {
    sink = next;
  },
  track(event: string, props: AnalyticsProps = {}) {
    const clean = sanitize(event, props);
    if (!clean) return;
    if (EVENT_MAP[event]!.kind === 'usage' && !consented) return;
    sink.track(event, clean);
  },
};
