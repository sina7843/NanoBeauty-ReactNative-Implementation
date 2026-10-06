import type { Entity, Instrument, RequestDetail, Reports, StaffGift } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
const SETTINGS = {
  version: 7,
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
    secondApprover: { on: false, fields: ['price', 'policy', 'offerTerms'] },
    clinicHours: null,
    ratingLine: { on: false, source: 'Fresha' },
    giftRefundDays: 14,
    deletionGraceDays: 30,
    sample: true,
  },
  features: { legacyMembership: false },
  clinic: { timezone: 'America/Vancouver', phone: null, address: '555 6th St', name: 'Nano Beauty', parking: null, directionsUrl: null, supportReplyTime: null },
};
jest.mock('../settings/useSettings', () => ({
  settingsQueryKey: ['settings'],
  useSettings: () => ({ data: { data: SETTINGS, source: 'network' }, isPending: false, isError: false, refetch: jest.fn(async () => undefined) }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(60_000);

const OWNER = ['today.view', 'requests.manage', 'inbox.manage', 'value.redeem', 'value.lookup', 'giftcard.actions', 'giftcard.void', 'payments.refund', 'customers.view', 'content.draft', 'content.publish', 'selling.draft', 'selling.publish', 'giftcard.settings', 'push.send', 'rules.manage', 'reports.view'];
const DESK = ['today.view', 'requests.manage', 'inbox.manage', 'value.redeem', 'value.lookup', 'giftcard.actions', 'customers.view', 'accountMatch.resolve'];
const EDITOR = ['content.draft', 'selling.draft', 'professionals.draft', 'policies.draft'];
let me: { roles: string[]; permissions: string[] };
type Reply = { status: number; body?: unknown };
let routes: Record<string, (body: Record<string, unknown>) => Reply>;
let calls: { key: string; body: Record<string, unknown> }[];
const envelope = (code: string, extra: object = {}) => ({ error: { code, message: code, requestId: 'r', ...extra } });

function scriptApi(extra: Record<string, (body: Record<string, unknown>) => Reply> = {}) {
  calls = [];
  routes = {
    'GET /v1/me': () => ({
      status: 200,
      body: { customer: { id: 'c1', phone: '+17785550111', firstName: 'Naz', lastName: 'Staff', email: null }, consents: [], roles: me.roles, permissions: me.permissions, next: 'done', sessionExpiresAt: '2099-01-01T00:00:00.000Z' },
    }),
    'GET /v1/content/home': () => ({ status: 404, body: envelope('not_found') }),
    'GET /v1/staff/summary': () => ({ status: 200, body: { myWaiting: 0, waitingApprovals: 0, secondApprover: false } }),
    'GET /v1/staff/media': () => ({ status: 200, body: [] }),
    'GET /v1/staff/services?filter=live': () => ({ status: 200, body: [] }),
    ...extra,
  };
  global.fetch = jest.fn(async (url: string, init: { method?: string; body?: string } = {}) => {
    const key = `${init.method ?? 'GET'} ${url.replace('http://api.test', '')}`;
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ key, body });
    const r = routes[key]?.(body) ?? { status: 404, body: envelope('not_found') };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(async () => {
  me = { roles: ['Owner'], permissions: OWNER };
  await AsyncStorage.clear();
  await SecureStore.setItemAsync(
    'nano.session.v2',
    JSON.stringify({ accessToken: 'acc', refreshToken: 'ref', accessExpiresAt: '2099-01-01T00:00:00.000Z', sessionExpiresAt: '2099-01-01T00:00:00.000Z' }),
  );
});

describe('STF-01 sections follow server permissions (D34)', () => {
  it('front desk sees Front desk tools, not Selling or Settings', async () => {
    me = { roles: ['Front desk'], permissions: DESK };
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/staff' });
    expect(await screen.findByText('Today')).toBeTruthy();
    expect(screen.getByText('Redeem')).toBeTruthy();
    expect(screen.getByText('Inbox')).toBeTruthy();
    expect(screen.queryByText('Campaigns')).toBeNull();
    expect(screen.queryByText('Rules')).toBeNull();
    expect(screen.queryByText('Reports')).toBeNull();
  });
});

describe('counter redemption (STF-25): confirm → ledger → receipt', () => {
  const pkg = (remaining: number): Instrument => ({
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'package',
    label: 'SQT · 4 sessions',
    source: 'purchase',
    status: 'active',
    balanceCents: null,
    sessions: { total: 4, used: 4 - remaining, remaining },
    expiresAt: null,
    last4: null,
    role: 'owner',
    gift: null,
  });

  it('nothing changes until confirmed; the receipt shows what the server returned', async () => {
    me = { roles: ['Front desk'], permissions: DESK };
    scriptApi({
      'GET /v1/staff/lookup?phone=6045550123': () => ({ status: 200, body: { customer: { id: 'c2', name: 'Maria L.', phoneMasked: '(604) •••-••23' }, instruments: [pkg(3)] } }),
      // The server is the authority: it says 1 left, not the 2 a phone-side subtraction would show.
      'POST /v1/staff/redemptions': () => ({ status: 200, body: pkg(1) }),
    });
    renderRouter(APP_DIR, { initialUrl: '/staff/redeem' });
    fireEvent.changeText(await screen.findByLabelText('Mobile number or gift code'), '6045550123');
    fireEvent.press(screen.getByRole('button', { name: 'Find' }));
    fireEvent.press(await screen.findByText('SQT · 4 sessions'));
    fireEvent.changeText(await screen.findByLabelText('Sessions to use'), '1');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Use 1 session from SQT · 4 sessions?')).toBeTruthy();
    expect(calls.some((c) => c.key === 'POST /v1/staff/redemptions')).toBe(false);
    const confirm = screen.getAllByRole('button', { name: 'Confirm' });
    fireEvent.press(confirm[confirm.length - 1]!);
    await waitFor(() => expect(calls.find((c) => c.key === 'POST /v1/staff/redemptions')?.body).toMatchObject({ instrumentId: pkg(3).id, sessions: 1 }));
    expect(calls.find((c) => c.key === 'POST /v1/staff/redemptions')!.body.idempotencyKey).toEqual(expect.any(String));
    expect(await screen.findByText('Receipt')).toBeTruthy();
    expect(screen.getByText('−1 session · 1/4 left')).toBeTruthy();
  });
});

describe('requests (STF-23/24)', () => {
  const detail: RequestDetail = {
    id: '22222222-2222-4222-8222-222222222222',
    reference: 'NB-R1',
    type: 'cancel',
    status: 'submitted',
    message: 'I’m sick',
    createdAt: '2026-10-06T17:00:00.000Z',
    customer: { id: 'c2', name: 'Maria L.', phone: '(604) •••-••23', pastVisits: 3 },
    visit: { ref: 'FR-1', service: 'HIFU', at: '2026-10-07T01:00:00.000Z', source: 'fresha_sync', professional: null },
    late: true,
    lateRule: 'Asked less than 48 hours before the visit: the deposit becomes clinic credit.',
    freshaUrl: null,
  };
  it('hand-off: tells staff to move it in Fresha, then mark done', async () => {
    scriptApi({
      [`GET /v1/staff/requests/${detail.id}`]: () => ({ status: 200, body: detail }),
      [`POST /v1/staff/requests/${detail.id}/transition`]: () => ({ status: 200, body: {} }),
    });
    renderRouter(APP_DIR, { initialUrl: `/staff/requests/${detail.id}` });
    expect(await screen.findByText('This visit was booked in Fresha. Move it in Fresha, then mark this request done.')).toBeTruthy();
    expect(screen.getByText(detail.lateRule)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Mark as done' }));
    await waitFor(() => expect(calls.find((c) => c.key.endsWith('/transition'))?.body).toEqual({ to: 'done' }));
  });
});

describe('selling editors (STF-15/16, D35)', () => {
  const draft = { name: 'Winter glow x3', serviceId: null, sessions: 3, priceCents: 90000, regularCents: null, validityMonths: 12, terms: ['Valid 12 months'], visibility: 'live' };
  const entity = (over: Partial<Entity> = {}): Entity => ({
    id: 'pkg_winter',
    type: 'package',
    state: 'live',
    version: 4,
    draft,
    live: draft,
    highRiskChanges: [],
    missing: [],
    waitingApproval: null,
    updatedAt: null,
    deletable: false,
    facts: [{ label: 'Owners', value: '2' }],
    ...over,
  });
  it('an Editor saves with the version and submits; never sees Publish; a price change is flagged', async () => {
    me = { roles: ['Editor'], permissions: EDITOR };
    scriptApi({
      'GET /v1/staff/packages/pkg_winter': () => ({ status: 200, body: entity() }),
      'PUT /v1/staff/packages/pkg_winter/draft': (b) => ({ status: 200, body: entity({ version: 5, draft: b.draft as typeof draft, highRiskChanges: ['price'] }) }),
      'POST /v1/staff/packages/pkg_winter/submit': () => ({ status: 200, body: entity({ version: 6, state: 'review' }) }),
    });
    renderRouter(APP_DIR, { initialUrl: '/staff/packages/pkg_winter' });
    fireEvent.changeText(await screen.findByLabelText('Price ($)'), '800');
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(calls.find((c) => c.key === 'PUT /v1/staff/packages/pkg_winter/draft')?.body).toMatchObject({ version: 4, draft: { priceCents: 80000 } }));
    expect(await screen.findByText('This change needs care')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(calls.find((c) => c.key === 'POST /v1/staff/packages/pkg_winter/submit')?.body).toEqual({ version: 5 }));
  });
});

describe('gift cards (STF-18)', () => {
  const gift: StaffGift = {
    id: '33333333-3333-4333-8333-333333333333',
    reference: 'GC-AB12',
    remainingCents: 10000,
    originalCents: 10000,
    recipientName: 'Sara',
    recipientPhoneMasked: '(604) •••-••77',
    buyerName: 'Maria L.',
    delivery: 'sent',
    sendAt: null,
    sentAt: '2026-10-06T17:00:00.000Z',
    claimed: false,
    voided: false,
    refundableCents: 10000,
  };
  it('void needs a reason and asks first; refund to the buyer is offered to the Owner', async () => {
    scriptApi({
      [`GET /v1/staff/gifts/${gift.id}`]: () => ({ status: 200, body: gift }),
      [`POST /v1/staff/gifts/${gift.id}/void`]: () => ({ status: 200, body: { ...gift, voided: true, remainingCents: 0, refundableCents: 0 } }),
    });
    renderRouter(APP_DIR, { initialUrl: `/staff/gift-cards/${gift.id}` });
    fireEvent.press(await screen.findByRole('button', { name: 'Void' }));
    expect(await screen.findByText('Void this gift card?')).toBeTruthy();
    const voidButtons = () => screen.getAllByRole('button', { name: 'Void' });
    fireEvent.press(voidButtons()[voidButtons().length - 1]!);
    expect(calls.some((c) => c.key.endsWith('/void'))).toBe(false);
    fireEvent.changeText(screen.getByLabelText('Reason'), 'Bought by mistake');
    expect(screen.getByText('Refund $100.00 to the buyer')).toBeTruthy();
    fireEvent.press(voidButtons()[voidButtons().length - 1]!);
    await waitFor(() => expect(calls.find((c) => c.key.endsWith('/void'))?.body).toMatchObject({ reason: 'Bought by mistake', refund: true }));
  });
});

describe('settings change behaviour without a rebuild (STF-32)', () => {
  it('rules save with the settings version; a stale copy shows the conflict state', async () => {
    scriptApi({ 'PUT /v1/staff/settings/rules': () => ({ status: 409, body: envelope('conflict') }) });
    renderRouter(APP_DIR, { initialUrl: '/staff/settings/rules' });
    expect(await screen.findByText('In-app booking needs a booking connection that doesn’t exist yet.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Free change window (hours)'), '24');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls.find((c) => c.key === 'PUT /v1/staff/settings/rules')?.body).toMatchObject({ version: 7, settings: { freeChangeHours: 24, bookingMode: 'handoff' } }));
    expect(await screen.findByText('Someone else changed this')).toBeTruthy();
  });
});

describe('push and reports (STF-35/37)', () => {
  it('push can’t be scheduled when nobody opted in', async () => {
    scriptApi({ 'GET /v1/staff/push': () => ({ status: 200, body: { audience: 0, messages: [] } }) });
    renderRouter(APP_DIR, { initialUrl: '/staff/push' });
    expect(await screen.findByText('Nobody has said yes to offers yet, so there’s no one to send to.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Message'), 'Winter glow is back.');
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled();
  });

  it('reports say which metrics aren’t available instead of showing a number', async () => {
    const reports: Reports = {
      period: 'month',
      from: '2026-09-06T17:00:00.000Z',
      bookingsStarted: { value: 12, unavailable: null },
      bookingsCompleted: { value: null, unavailable: 'Bookings are made in Fresha and there is no read-back yet.' },
      giftCards: { count: 2, cents: 25000 },
      packages: { count: 1, cents: 120000 },
      refundsCents: 0,
      promoCodes: [{ code: 'GLOW25', uses: 3 }],
      campaigns: [],
    };
    scriptApi({ 'GET /v1/staff/reports?period=month': () => ({ status: 200, body: reports }) });
    renderRouter(APP_DIR, { initialUrl: '/staff/reports' });
    expect(await screen.findByText('Bookings are made in Fresha and there is no read-back yet.')).toBeTruthy();
    expect(screen.getByText('Not available')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('2 · $250.00')).toBeTruthy();
  });
});
