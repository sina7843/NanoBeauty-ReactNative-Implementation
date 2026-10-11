import type { Catalog, Service } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { basket } from './basket';
import { clearPendingHandoff, loadPendingHandoff, RESUME_WINDOW_MS, savePendingHandoff } from './pendingHandoff';
import { summarize } from './summary';
import { careBeforeCount, careProgress, isLate, lateBannerText, outcomeText, passStatus, syncNote } from './visits';

const svc = (over: Partial<Service>): Service => ({
  id: 'x',
  categoryId: 'c',
  name: 'X',
  aliases: [],
  concerns: [],
  description: null,
  price: { kind: 'fixed', amount: 100 },
  durationLabel: null,
  durationMin: 60,
  perArea: false,
  areas: null,
  photo: null,
  status: 'live',
  professionals: [],
  faq: [],
  care: [],
  suitabilityArticle: null,
  sample: true,
  ...over,
});

const catalog: Catalog = {
  categories: [],
  concerns: [],
  professionals: [],
  services: [
    svc({ id: 'hifu', name: '12D HIFU', price: { kind: 'from', amount: 250 }, durationMin: 60 }),
    svc({ id: 'sqt', name: 'SQT', price: { kind: 'fixed', amount: 350 }, durationMin: 60 }),
    svc({ id: 'rf', name: 'RF', price: { kind: 'from', amount: 300 }, durationMin: 75 }),
    svc({ id: 'gone', status: 'unavailable' }),
    svc({
      id: 'laser',
      name: 'Laser',
      perArea: true,
      durationMin: 20,
      price: { kind: 'perUnit', amount: 50, unit: 'per area' },
      areas: {
        women: [
          { name: 'Upper lip', price: 50, kind: 'fixed' },
          { name: 'Underarms', price: 70, kind: 'from' },
        ],
        men: [{ name: 'Beard', price: 75, kind: 'fixed' }],
        maxAreasPerVisit: 4,
      },
    }),
  ],
};

describe('basket summary (BOOK 17)', () => {
  it('totals time and price, with "From" when any price is a starting price', () => {
    const s = summarize([{ serviceId: 'hifu' }, { serviceId: 'sqt' }], catalog, 20);
    expect(s.totalMinutes).toBe(120);
    expect(s.totalLabel).toBe('From $600.00');
    expect(s.tooLong).toBe(false);
    expect(summarize([{ serviceId: 'sqt' }], catalog, 20).totalLabel).toBe('$350.00');
  });

  it('warns when the visit is too long and drops treatments that are no longer bookable', () => {
    const s = summarize([{ serviceId: 'hifu' }, { serviceId: 'sqt' }, { serviceId: 'rf' }, { serviceId: 'gone' }], catalog, 20);
    expect(s.lines.map((l) => l.key)).toEqual(['hifu', 'sqt', 'rf']);
    expect(s.totalMinutes).toBe(195);
    expect(s.tooLong).toBe(true);
  });

  it('per-area treatments need areas first, then sum only areas from the chosen set', () => {
    expect(summarize([{ serviceId: 'laser' }], catalog, 20).needsAreas?.id).toBe('laser');
    const s = summarize([{ serviceId: 'laser', areas: { set: 'women', names: ['Upper lip', 'Beard'] } }], catalog, 20);
    expect(s.needsAreas).toBeNull();
    expect(s.lines[0]).toMatchObject({ detail: 'Upper lip', priceLabel: '$50.00' });
    expect(s.totalLabel).toBe('$50.00');
  });

  it('basket store keeps picks and replaces areas per service', () => {
    basket.clear();
    basket.toggle('hifu');
    basket.ensure('hifu');
    basket.setAreas('laser', { set: 'men', names: ['Beard'] });
    expect(basket.get()).toEqual([{ serviceId: 'hifu' }, { serviceId: 'laser', areas: { set: 'men', names: ['Beard'] } }]);
    basket.toggle('hifu');
    expect(basket.has('hifu')).toBe(false);
    basket.clear();
  });
});

describe('late window (A2)', () => {
  const now = Date.parse('2026-10-14T20:00:00Z');
  it('is late only inside the free-change hours and before the visit', () => {
    expect(isLate({ startsAt: '2026-10-16T19:59:00Z' }, 48, now)).toBe(true);
    expect(isLate({ startsAt: '2026-10-16T20:00:00Z' }, 48, now)).toBe(false);
    expect(isLate({ startsAt: '2026-10-14T19:00:00Z' }, 48, now)).toBe(false);
  });
  it('states the deposit outcome from settings, with or without a known amount', () => {
    expect(outcomeText('credit', 50)).toBe('Your $50.00 deposit becomes clinic credit');
    expect(outcomeText('credit', null)).toBe('Your deposit becomes clinic credit');
    expect(outcomeText('keepDeposit', 50)).toBe('The deposit is kept');
    expect(outcomeText('credit', 0)).toBe('No charge');
    expect(lateBannerText({ lateCancelOutcome: 'credit' }, 50)).toContain('$50.00 deposit as clinic credit');
  });
});

describe('pending hand-off (relaunch)', () => {
  beforeEach(() => AsyncStorage.clear());
  it('resumes within the window only, and ignores malformed or future records', async () => {
    const openedAt = Date.parse('2026-10-06T17:00:00Z');
    await savePendingHandoff({ id: 'h1', openedAt });
    expect(await loadPendingHandoff(openedAt + 60_000)).toEqual({ id: 'h1', openedAt });
    expect(await loadPendingHandoff(openedAt + RESUME_WINDOW_MS + 1)).toBeNull();
    expect(await loadPendingHandoff(openedAt - 1)).toBeNull();
    await AsyncStorage.setItem('nano.private.handoff', '{"id":5}');
    expect(await loadPendingHandoff(openedAt)).toBeNull();
    await savePendingHandoff({ id: 'h1', openedAt });
    await clearPendingHandoff();
    expect(await loadPendingHandoff(openedAt)).toBeNull();
  });
});

describe('visit display rules (NANO-12)', () => {
  const zone = 'America/Toronto';
  const request = { id: 'r', reference: 'NB-R', visitId: 'v', type: 'change' as const, status: 'submitted' as const, message: 'm', declineReason: null, createdAt: '2026-10-10T12:00:00Z' };

  it('BV-2: an open request shows "Change requested" only while the visit is still on', () => {
    expect(passStatus({ status: 'confirmed', openRequest: request })).toBe('changed');
    expect(passStatus({ status: 'pending', openRequest: request })).toBe('changed');
    expect(passStatus({ status: 'confirmed', openRequest: null })).toBe('confirmed');
    expect(passStatus({ status: 'cancelled', openRequest: request })).toBe('cancelled');
  });

  it('BV-7: the sync note comes from the server time, never from a saved copy', () => {
    const serverTime = '2026-10-16T18:00:00Z';
    expect(syncNote({ syncedAt: '2026-10-16T17:55:00Z', serverTime }, false, zone)).toMatch(/^Synced from Fresha a few minutes ago/);
    expect(syncNote({ syncedAt: '2026-10-16T17:55:00Z', serverTime }, true, zone)).toBeNull();
    expect(syncNote({ syncedAt: null, serverTime }, false, zone)).toBeNull();
    expect(syncNote({ syncedAt: '2026-10-16T13:30:00Z', serverTime }, false, zone)).toMatch(/^Synced from Fresha at 9:30 am\./);
    expect(syncNote({ syncedAt: '2026-10-15T13:30:00Z', serverTime }, false, zone)).toMatch(/^Synced from Fresha at Thu 15 Oct, 9:30 am\./);
  });

  const steps = [{ when: '2 days before', title: 'Prepare' }, { when: 'Day of visit', title: 'Arrive early' }, { when: 'First 24 hours', title: 'Aftercare' }, { when: 'In 4 weeks', title: 'Check-in' }];
  const startsAt = '2026-10-16T18:30:00Z'; // Fri 16 Oct 2026, 2:30 pm Toronto

  it('BV-6: only steps before or on the day count as "before your visit"', () => {
    expect(careBeforeCount(steps)).toBe(2);
  });

  it('BV-17: done / now follow the clinic-zone day of the visit', () => {
    const states = (now: string) => careProgress(steps, startsAt, zone, Date.parse(now)).map((s) => s.state);
    expect(states('2026-10-14T15:00:00Z')).toEqual(['now', undefined, undefined, undefined]);
    expect(states('2026-10-16T13:00:00Z')).toEqual(['done', 'now', undefined, undefined]);
    // 16 Oct 11 pm in Toronto is 03:00Z on the 17th: still the visit day.
    expect(states('2026-10-17T03:00:00Z')).toEqual(['done', 'now', undefined, undefined]);
    expect(states('2026-10-18T15:00:00Z')).toEqual(['done', 'done', 'now', undefined]);
  });
});
