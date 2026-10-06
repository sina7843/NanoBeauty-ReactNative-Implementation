import { EVENT_MAP, amountBand, analytics, sanitize, sizeBand } from './analytics';
import { routePattern, telemetry } from './telemetry';

describe('analytics event map (spec 4)', () => {
  const sent: [string, object][] = [];
  beforeAll(() => analytics.setSink({ track: (e, p) => void sent.push([e, p]) }));
  beforeEach(() => {
    sent.length = 0;
    analytics.setConsent(false);
  });

  it('drops unknown events and any property not in the map or not in its shape', () => {
    expect(sanitize('made_up', { a: 1 })).toBeNull();
    expect(sanitize('support_contact', { topic: 'Unwanted hair', channel: 'text', email: 'maria@example.com' })).toEqual({ channel: 'text' });
    expect(sanitize('treatment_viewed', { service_id: 'svc_hifu', category: 'skin-tightening', price_kind: 'from', source: 'detail', name: 'Maria' })).toEqual({
      service_id: 'svc_hifu',
      category: 'skin-tightening',
      price_kind: 'from',
      source: 'detail',
    });
    // A phone number or free text never passes as an id.
    expect(sanitize('promo_code_result', { result: 'applied', code_id: 'MARIA2024' })).toEqual({ result: 'applied' });
  });

  it('usage events wait for the opt-in; essential events always go', () => {
    analytics.track('offer_viewed', { offer_id: 'cmp_halloween', placement: 'offer_page' });
    analytics.track('payment_failed', { context: 'gift', method: 'card', reason: 'declined' });
    expect(sent.map(([e]) => e)).toEqual(['payment_failed']);
    analytics.setConsent(true);
    analytics.track('offer_viewed', { offer_id: 'cmp_halloween', placement: 'offer_page' });
    expect(sent.map(([e]) => e)).toEqual(['payment_failed', 'offer_viewed']);
  });

  it('every event is classed usage or essential, and amounts and audiences are bands', () => {
    for (const spec of Object.values(EVENT_MAP)) expect(['usage', 'essential']).toContain(spec.kind);
    expect([amountBand(2500), amountBand(10000), amountBand(120000)]).toEqual(['under_50', '50_149', '1000_plus']);
    expect(sizeBand(42)).toBe('10_99');
  });
});

describe('error telemetry (NFR 08)', () => {
  it('redacts the message and reports the route pattern, not the filled-in path', () => {
    const reports: object[] = [];
    telemetry.setSink({ capture: (r) => void reports.push(r) });
    telemetry.capture(new Error('Claim failed for ABCDEFGHJK23 sent to +1 604 555 0123'), '/wallet/gift-cards/3f2c1b8e-1a2b-4c3d-8e9f-0123456789ab?code=ABCDEFGHJK23');
    expect(reports).toEqual([{ message: 'Claim failed for [code] sent to [phone]', name: 'Error', where: '/wallet/gift-cards/:id', fatal: false }]);
    expect(routePattern('/visits/v1/cancelled')).toBe('/visits/:id/cancelled');
  });
});
