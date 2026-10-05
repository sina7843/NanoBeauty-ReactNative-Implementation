// Analytics boundary (spec 4; vendor not chosen — open-items E5). Events are dropped unless the user
// consented to analytics. Properties are restricted to primitives; never names, phones, emails,
// free text or health details.
export type AnalyticsProps = Record<string, string | number | boolean>;

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
  setConsent(value: boolean) {
    consented = value;
  },
  setSink(next: AnalyticsSink) {
    sink = next;
  },
  track(event: string, props: AnalyticsProps = {}) {
    if (!consented) return;
    sink.track(event, props);
  },
};
