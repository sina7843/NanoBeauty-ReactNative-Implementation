import type { Attempt, Instrument, MethodOption, Order } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';
import { giftDraft } from '../payments/giftDraft';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
let mockFeatures = { legacyMembership: false };
jest.mock('../settings/useSettings', () => ({
  useSettings: () => ({
    data: {
      data: {
        settings: {
          bookingMode: 'handoff',
          gift: { presetsCAD: [50, 100, 150, 200], customRangeCAD: [25, 500], expiry: null, designs: ['thanks', 'birthday', 'holiday', 'love'] },
          clinicHours: null,
          ratingLine: { on: false, source: 'Fresha' },
          sample: true,
        },
        features: mockFeatures,
        clinic: { name: 'Nano Beauty', timezone: 'America/Vancouver', phone: '604-555-0100', address: '555 6th St #130', supportReplyTime: '1 business day' },
      },
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(60_000);

const ORDER_ID = '1b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d';
const ATTEMPT_ID = '2b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d';
const order = (over: Partial<Order> = {}): Order => ({
  id: ORDER_ID,
  reference: 'NB-O-1A2B3C',
  kind: 'package',
  title: 'SQT Bio-Microneedling · 4 sessions',
  detail: null,
  amountCents: 120000,
  status: 'pending',
  createdAt: '2026-10-06T17:00:00.000Z',
  ...over,
});
const attempt = (status: Attempt['status'], over: Partial<Attempt> = {}): Attempt => ({
  id: ATTEMPT_ID,
  reference: 'PAY-88213',
  orderId: ORDER_ID,
  method: 'card',
  status,
  redirectUrl: null,
  methodLabel: status === 'succeeded' ? 'Visa •••• 4242' : null,
  failureReason: status === 'declined' ? 'declined' : null,
  ...over,
});
const pkg: Instrument = {
  id: '3b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d',
  kind: 'package',
  label: 'Laser · Underarms · 6 sessions',
  source: 'purchase',
  status: 'active',
  balanceCents: null,
  sessions: { total: 6, used: 3, remaining: 3 },
  expiresAt: '2027-02-28T08:00:00.000Z',
  last4: null,
  role: 'owner',
  gift: null,
};
const credit: Instrument = { ...pkg, id: '4b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d', kind: 'credit', label: 'Clinic credit', source: 'clinic', balanceCents: 4000, sessions: null, expiresAt: null };
const sentGift: Instrument = {
  ...pkg,
  id: '5b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d',
  kind: 'gift_card',
  label: 'Gift card',
  source: 'gift',
  balanceCents: 10000,
  sessions: null,
  expiresAt: null,
  role: 'sender',
  gift: { recipientName: 'Sara', recipientPhoneMasked: '(604) •••-••57', message: 'Happy birthday!', design: 'birthday', delivery: 'scheduled', sendAt: '2026-12-24T17:00:00.000Z', sentAt: null, claimedAt: null },
};

type Reply = { status: number; body?: unknown };
let routes: Record<string, (body: Record<string, unknown>) => Reply>;
let calls: { key: string; raw: string }[];
const envelope = (code: string) => ({ error: { code, message: code, requestId: 'req-1' } });

function scriptApi(extra: Record<string, (body: Record<string, unknown>) => Reply> = {}) {
  calls = [];
  routes = {
    'GET /v1/me': () => ({
      status: 200,
      body: { customer: { id: 'c1', phone: '+16045550123', firstName: 'Maria', lastName: 'Chen', email: null }, consents: [], roles: [], permissions: [], next: 'done', sessionExpiresAt: '2099-01-01T00:00:00.000Z' },
    }),
    'GET /v1/content/home': () => ({ status: 404, body: envelope('not_found') }),
    [`GET /v1/orders/${ORDER_ID}`]: () => ({ status: 200, body: order() }),
    ...extra,
  };
  global.fetch = jest.fn(async (url: string, init: { method?: string; body?: string }) => {
    const key = `${init.method ?? 'GET'} ${url.replace('http://api.test', '')}`;
    calls.push({ key, raw: init.body ?? '' });
    const r = routes[key]?.(init.body ? JSON.parse(init.body) : {}) ?? { status: 404, body: envelope('not_found') };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}
const methods = (list: MethodOption[] = [{ method: 'card', available: true, note: null }]) => ({ status: 200, body: { order: order(), methods: list } });

async function signIn() {
  await SecureStore.setItemAsync(
    'nano.session.v2',
    JSON.stringify({ accessToken: 'acc', refreshToken: 'ref', accessExpiresAt: '2099-01-01T00:00:00.000Z', sessionExpiresAt: '2099-01-01T00:00:00.000Z' }),
  );
}

beforeEach(async () => {
  mockFeatures = { legacyMembership: false };
  giftDraft.clear();
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync('nano.session.v2');
});

describe('Wallet (WAL-01…06)', () => {
  it('guest can still send a gift; signed-in shows server balances, sent gifts and history', async () => {
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/wallet' });
    expect(await screen.findByText('Sign in to see your credit, packages and gift cards. You can still send a gift card.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send a gift card' })).toBeTruthy();
  });

  it('shows packages, credit and sent gifts exactly as the server reports', async () => {
    await signIn();
    scriptApi({ 'GET /v1/wallet': () => ({ status: 200, body: { instruments: [pkg, credit, sentGift], asOf: '2026-10-06T17:00:00.000Z' } }) });
    renderRouter(APP_DIR, { initialUrl: '/wallet' });
    expect(await screen.findByText('3 of 6 left')).toBeTruthy();
    expect(screen.getByText('$40.00')).toBeTruthy();
    expect(screen.getByText('Gifts you sent')).toBeTruthy();
    expect(screen.getByText(/^Sends /)).toBeTruthy();
  });

  it('empty wallet', async () => {
    await signIn();
    scriptApi({ 'GET /v1/wallet': () => ({ status: 200, body: { instruments: [], asOf: '2026-10-06T17:00:00.000Z' } }) });
    renderRouter(APP_DIR, { initialUrl: '/wallet' });
    expect(await screen.findByText('Nothing here yet')).toBeTruthy();
  });

  it('membership stays unreachable while the flag is off (D38)', async () => {
    await signIn();
    scriptApi();
    const router = renderRouter(APP_DIR, { initialUrl: '/wallet/membership' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
  });
});

describe('payment (PAY-01…09)', () => {
  it('package → card → paid: only a provider token is sent, never the card number; receipt is itemised', async () => {
    await signIn();
    let confirmed = false;
    scriptApi({
      'GET /v1/packages': () => ({
        status: 200,
        body: [{ id: 'pkg_sqt_4', name: 'SQT Bio-Microneedling · 4 sessions', serviceId: 'svc_sqt', sessions: 4, priceCents: 120000, regularCents: 140000, validityMonths: 12, status: 'live', terms: ['Each visit uses one session.'], sample: true }],
      }),
      'POST /v1/orders': () => ({ status: 200, body: order() }),
      [`GET /v1/orders/${ORDER_ID}/methods`]: () => methods(),
      [`POST /v1/orders/${ORDER_ID}/attempts`]: () => ({ status: 200, body: attempt('requires_action') }),
      [`POST /v1/payments/attempts/${ATTEMPT_ID}/confirm`]: (b) => {
        confirmed = b.paymentToken === 'tok_visa';
        return { status: 200, body: attempt('succeeded') };
      },
      [`GET /v1/payments/attempts/${ATTEMPT_ID}`]: () => ({ status: 200, body: attempt(confirmed ? 'succeeded' : 'requires_action') }),
      [`GET /v1/receipts/${ORDER_ID}`]: () => ({
        status: 200,
        body: { orderId: ORDER_ID, reference: 'PAY-88213', status: 'paid', lines: [{ label: 'SQT Bio-Microneedling · 4 sessions', amountCents: 120000 }], taxIncludedCents: 5714, totalCents: 120000, methodLabel: 'Visa •••• 4242', paidAt: '2026-10-06T17:00:00.000Z', refunds: [], sample: true },
      }),
    });
    const router = renderRouter(APP_DIR, { initialUrl: '/wallet/buy-package' });
    expect(await screen.findByText('Saves $200.00 · use within 12 months')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(router.getPathname()).toBe('/pay/method'));
    expect(await screen.findByText('$1,200.00')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.getPathname()).toBe('/pay/card'));
    fireEvent.changeText(await screen.findByLabelText('Card number'), '4242 4242 4242 4242');
    fireEvent.changeText(screen.getByLabelText('Expiry'), '12/29');
    fireEvent.changeText(screen.getByLabelText('Security code'), '123');
    fireEvent.changeText(screen.getByLabelText('Postal code'), 'V3L 5H1');
    fireEvent.press(screen.getByRole('button', { name: 'Pay $1,200.00' }));
    expect(await screen.findByText('Payment received')).toBeTruthy();
    expect(screen.getByText('$1,200.00 paid with Visa •••• 4242. A receipt is in your Wallet.')).toBeTruthy();
    // PAY 01: the card number never left the device.
    expect(calls.some((c) => c.raw.includes('4242 4242') || c.raw.includes('4242424242424242') || c.raw.includes('123'))).toBe(false);
    expect(await AsyncStorage.getItem('nano.private.payment')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'View receipt' }));
    expect(await screen.findByText('GST included')).toBeTruthy();
    expect(screen.getByText('$57.14')).toBeTruthy();
    expect(screen.getByText('PAY-88213')).toBeTruthy();
  });

  it('declined: nothing charged, another method can be chosen', async () => {
    await signIn();
    scriptApi({
      [`GET /v1/orders/${ORDER_ID}/methods`]: () => methods(),
      [`POST /v1/orders/${ORDER_ID}/attempts`]: () => ({ status: 200, body: attempt('requires_action') }),
      [`POST /v1/payments/attempts/${ATTEMPT_ID}/confirm`]: () => ({ status: 200, body: attempt('declined') }),
      [`GET /v1/payments/attempts/${ATTEMPT_ID}`]: () => ({ status: 200, body: attempt('declined') }),
    });
    const router = renderRouter(APP_DIR, { initialUrl: `/pay/card?attempt=${ATTEMPT_ID}&order=${ORDER_ID}` });
    fireEvent.changeText(await screen.findByLabelText('Card number'), '4000 0000 0000 0002');
    fireEvent.changeText(screen.getByLabelText('Expiry'), '12/29');
    fireEvent.changeText(screen.getByLabelText('Security code'), '123');
    fireEvent.changeText(screen.getByLabelText('Postal code'), 'V3L 5H1');
    fireEvent.press(screen.getByRole('button', { name: 'Pay $1,200.00' }));
    expect(await screen.findByText('Your bank declined the payment')).toBeTruthy();
    expect(screen.getByText('Nothing was charged. Try another card or method.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try another method' }));
    await waitFor(() => expect(router.getPathname()).toBe('/pay/method'));
  });

  it('no method switched on: says so and offers the clinic instead', async () => {
    await signIn();
    scriptApi({ [`GET /v1/orders/${ORDER_ID}/methods`]: () => methods([]) });
    renderRouter(APP_DIR, { initialUrl: `/pay/method?order=${ORDER_ID}` });
    expect(await screen.findByText('Online payment isn’t available right now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Call the clinic' })).toBeTruthy();
  });

  it('financing that isn’t offered for the amount is shown but can’t be chosen, with a neutral note', async () => {
    await signIn();
    scriptApi({
      [`GET /v1/orders/${ORDER_ID}/methods`]: () =>
        methods([
          { method: 'card', available: true, note: null },
          { method: 'klarna', available: false, note: 'Not offered for this amount' },
        ]),
    });
    renderRouter(APP_DIR, { initialUrl: `/pay/method?order=${ORDER_ID}` });
    const klarna = await screen.findByRole('radio', { name: 'Klarna, Not offered for this amount' });
    expect(klarna.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('relaunch mid-payment checks with the provider instead of forgetting (PAY 07)', async () => {
    await signIn();
    await AsyncStorage.setItem('nano.entry.primerSeen.v1', '1');
    await AsyncStorage.setItem('nano.private.payment', JSON.stringify({ attemptId: ATTEMPT_ID, orderId: ORDER_ID, startedAt: Date.now() - 60_000 }));
    scriptApi({ [`GET /v1/payments/attempts/${ATTEMPT_ID}`]: () => ({ status: 200, body: attempt('processing') }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/' });
    await waitFor(() => expect(router.getPathname()).toBe('/pay/status'), { timeout: 8000 });
    expect(await screen.findByText('Waiting for your bank…')).toBeTruthy();
  });
});

describe('gift cards (WAL-13, 08–11)', () => {
  it('design → value → recipient → review: the order carries exactly what was chosen', async () => {
    await signIn();
    let sent: Record<string, unknown> = {};
    scriptApi({
      'POST /v1/orders': (b) => {
        sent = b;
        return { status: 200, body: order({ kind: 'gift', title: 'Gift card for Sara', amountCents: 15000 }) };
      },
      [`GET /v1/orders/${ORDER_ID}/methods`]: () => methods(),
    });
    const router = renderRouter(APP_DIR, { initialUrl: '/wallet/gift/design' });
    fireEvent.press(await screen.findByRole('radio', { name: 'Birthday' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.getPathname()).toBe('/wallet/gift/value'));
    fireEvent.press(screen.getByRole('togglebutton', { name: '$150' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.getPathname()).toBe('/wallet/gift/recipient'));
    fireEvent.changeText(screen.getByLabelText('Their name'), 'Sara');
    fireEvent.changeText(screen.getByLabelText('Their mobile number'), '(604) 555-0157');
    fireEvent.changeText(screen.getByLabelText('Message'), 'Happy birthday!');
    fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    await waitFor(() => expect(router.getPathname()).toBe('/wallet/gift/review'));
    expect(screen.getByText('Now, by text')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Pay $150.00' }));
    await waitFor(() => expect(router.getPathname()).toBe('/pay/method'));
    expect(sent).toMatchObject({
      kind: 'gift',
      gift: { design: 'birthday', amountCents: 15000, recipientName: 'Sara', recipientPhone: '(604) 555-0157', message: 'Happy birthday!', sendAt: null },
    });
  });

  it('custom value outside the range is explained', async () => {
    giftDraft.set({ design: 'love' });
    renderRouter(APP_DIR, { initialUrl: '/wallet/gift/value' });
    fireEvent.changeText(await screen.findByLabelText('Or choose an amount'), '900');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Choose an amount from $25 to $500')).toBeTruthy();
  });

  it('claim: valid code shows the gift, then it is added; an unknown code gives a reference for the clinic', async () => {
    await signIn();
    scriptApi({
      'POST /v1/gifts/lookup': (b) => ({
        status: 200,
        body:
          b.code === 'ABCDEFGH4821'
            ? { state: 'valid', amountCents: 10000, recipientName: 'Sara', fromName: 'Leila', message: 'Treat yourself.', design: 'birthday', reference: 'GC-4821' }
            : { state: 'notfound', amountCents: null, recipientName: null, fromName: null, message: null, design: null, reference: 'GC-4829' },
      }),
      'POST /v1/gifts/claim': () => ({ status: 200, body: {} }),
    });
    renderRouter(APP_DIR, { initialUrl: '/wallet/claim?code=ABCDEFGH4821' });
    fireEvent.press(await screen.findByRole('button', { name: 'Check code' }));
    expect(await screen.findByText('“Treat yourself.”')).toBeTruthy();
    expect(screen.getByText('From Leila')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add to my Wallet' }));
    expect(await screen.findByText('Added to your Wallet')).toBeTruthy();
  });

  it('claim: not found shows support with a reference', async () => {
    await signIn();
    scriptApi({ 'POST /v1/gifts/lookup': () => ({ status: 200, body: { state: 'notfound', amountCents: null, recipientName: null, fromName: null, message: null, design: null, reference: 'GC-4829' } }) });
    renderRouter(APP_DIR, { initialUrl: '/wallet/claim' });
    fireEvent.changeText(await screen.findByLabelText('Gift code'), 'ABCDEFGH4829');
    fireEvent.press(screen.getByRole('button', { name: 'Check code' }));
    expect(await screen.findByText('We couldn’t find this gift card')).toBeTruthy();
    expect(screen.getByText(/GC-4829/)).toBeTruthy();
  });
});

describe('balance help (WAL-12)', () => {
  it('sends the question with the chosen balance and gets a reference', async () => {
    await signIn();
    let body: Record<string, unknown> = {};
    scriptApi({
      'GET /v1/wallet': () => ({ status: 200, body: { instruments: [pkg], asOf: '2026-10-06T17:00:00.000Z' } }),
      'POST /v1/wallet/help': (b) => {
        body = b;
        return { status: 200, body: { reference: 'BH-1A2B3C' } };
      },
    });
    renderRouter(APP_DIR, { initialUrl: '/wallet/help' });
    expect(await screen.findByText('Shows 3 of 6 left')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('What did you expect?'), 'I thought I had 4 left');
    fireEvent.press(screen.getByRole('button', { name: 'Send to the clinic' }));
    expect(await screen.findByText('Sent to the clinic')).toBeTruthy();
    expect(body).toMatchObject({ instrumentId: pkg.id, expected: 'I thought I had 4 left' });
  });
});
