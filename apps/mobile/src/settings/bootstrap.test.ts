import type { SettingsBootstrap } from '@nano/contracts';
import { ApiError, type ApiResponse } from '../api/client';
import { loadSettings, SETTINGS_CACHE_KEY, type KeyValueStore } from './bootstrap';

const sample: SettingsBootstrap = {
  version: 3,
  updatedAt: '2026-10-01T10:00:00.000Z',
  settings: {
    bookingMode: 'handoff',
    deposit: { amountCAD: 50, overCAD: 150 },
    freeChangeHours: 48,
    lateCancelOutcome: 'credit',
    lateChangeOutcome: 'credit',
    noShowOutcome: 'keepDeposit',
    slotHoldMinutes: 10,
    slotHoldWarningMinutes: 2,
    paymentMethods: { card: true, applePay: false, googlePay: false, klarna: false, affirm: false },
    financingLine: { on: false, minCAD: 500 },
    gift: { presetsCAD: [50, 100], customRangeCAD: [25, 500], expiry: null, designs: ['thanks'] },
    consultation: { priceCAD: 20, credited: true },
    secondApprover: { on: false, fields: ['price'] },
    clinicHours: null,
    ratingLine: { on: false, source: 'Fresha' },
    giftRefundDays: 14,
    reminderSender: 'fresha',
    reminderHours: [48, 3],
    quietHours: { start: '21:00', end: '08:00' },
    deletionGraceDays: 30,
    sample: true,
  },
  features: { legacyMembership: false },
  clinic: {
    name: 'Nano Beauty',
    address: '555 6th St #130, New Westminster, BC V3L 5H1',
    timezone: 'America/Vancouver',
    phone: null,
    parking: null,
    directionsUrl: null,
    supportReplyTime: null,
  },
  app: {
    minimumVersion: { ios: '1.0.0', android: '1.0.0' },
    storeUrl: { ios: null, android: null },
    maintenance: null,
  },
};

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => {
      data[k] = v;
    },
  };
}

const ok = (body: unknown, etag = '"settings-v3"'): ApiResponse => ({ status: 200, headers: new Headers({ etag }), body });

describe('loadSettings', () => {
  it('returns fresh settings and caches them with the ETag', async () => {
    const store = memoryStore();
    const result = await loadSettings(store, async () => ok(sample));
    expect(result).toEqual({ data: sample, source: 'network' });
    expect(JSON.parse(store.data[SETTINGS_CACHE_KEY]!)).toMatchObject({ etag: '"settings-v3"', data: sample });
  });

  it('revalidates with If-None-Match and reuses the cache on 304', async () => {
    const store = memoryStore({ [SETTINGS_CACHE_KEY]: JSON.stringify({ etag: '"settings-v3"', savedAt: '2026-10-06T10:00:00.000Z', data: sample }) });
    const request = jest.fn(async () => ({ status: 304, headers: new Headers(), body: null }));
    const result = await loadSettings(store, request);
    expect(request).toHaveBeenCalledWith('/v1/settings', { headers: { 'if-none-match': '"settings-v3"' } });
    expect(result).toEqual({ data: sample, source: 'network' });
  });

  it('falls back to the last server copy when offline', async () => {
    const store = memoryStore({ [SETTINGS_CACHE_KEY]: JSON.stringify({ etag: null, savedAt: '2026-10-06T10:00:00.000Z', data: sample }) });
    const result = await loadSettings(store, async () => {
      throw new ApiError('network', null, null);
    });
    expect(result).toEqual({ data: sample, source: 'cache' });
  });

  it('throws with no cache instead of inventing defaults', async () => {
    await expect(
      loadSettings(memoryStore(), async () => {
        throw new ApiError('network', null, null);
      }),
    ).rejects.toMatchObject({ code: 'network' });
  });

  it('rejects a payload that breaks the contract and does not cache it', async () => {
    const store = memoryStore();
    const bad = { ...sample, settings: { ...sample.settings, bookingMode: 'maybe' } };
    await expect(loadSettings(store, async () => ok(bad))).rejects.toMatchObject({ code: 'invalid_response' });
    expect(store.data[SETTINGS_CACHE_KEY]).toBeUndefined();
  });

  it('ignores a corrupt cache entry', async () => {
    const store = memoryStore({ [SETTINGS_CACHE_KEY]: '{not json' });
    await expect(loadSettings(store, async () => ok(sample))).resolves.toMatchObject({ source: 'network' });
  });
});
