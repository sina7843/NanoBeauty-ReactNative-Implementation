import type { Catalog, HandoffStatus, Visit, VisitsResponse } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';
import { basket } from '../booking/basket';
import { goToNext, setReturnTo } from '../auth/flow';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })) }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
jest.mock('../settings/useSettings', () => ({
  useSettings: () => ({
    data: {
      data: {
        settings: {
          bookingMode: 'handoff',
          freeChangeHours: 48,
          lateCancelOutcome: 'credit',
          noShowOutcome: 'keepDeposit',
          consultation: { priceCAD: 20, credited: true },
          clinicHours: null,
          ratingLine: { on: false, source: 'Fresha' },
          sample: true,
        },
        clinic: { timezone: 'America/Vancouver', phone: '604-555-0100', address: '555 6th St #130', supportReplyTime: '1 business day' },
      },
    },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(60_000);

const HANDOFF_ID = '0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d';
const FRESHA = 'https://booking.example.invalid/nano-beauty';
const base = { aliases: [], concerns: [], description: null, durationLabel: null, perArea: false, areas: null, photo: null, professionals: [], faq: [], suitabilityArticle: null, sample: true, status: 'live' as const };
const catalog: Catalog = {
  categories: [],
  concerns: [],
  professionals: [],
  services: [
    { ...base, id: 'svc_hifu', categoryId: 'c', name: '12D HIFU', price: { kind: 'from', amount: 250 }, durationLabel: '60 to 90 min', durationMin: 60, care: [{ when: 'Day of visit', title: 'Arrive 10 minutes early' }] },
    {
      ...base,
      id: 'svc_laser',
      categoryId: 'laser',
      name: 'Laser Hair Removal',
      price: { kind: 'perUnit', amount: 50, unit: 'per area' },
      durationMin: 20,
      perArea: true,
      areas: { women: [{ name: 'Upper lip', price: 50, kind: 'fixed' }, { name: 'Underarms', price: 70, kind: 'from' }], men: [{ name: 'Beard', price: 75, kind: 'fixed' }], maxAreasPerVisit: 4 },
      care: [],
    },
  ],
};

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const visit = (over: Partial<Visit>): Visit => ({
  id: 'a1111111-1111-4111-8111-111111111111',
  ref: 'NB-20418',
  source: 'fresha_sync',
  serviceId: 'svc_hifu',
  serviceName: '12D HIFU',
  detail: 'Full face',
  professional: 'Nazanin (Naz)',
  startsAt: inDays(10),
  durationMin: 60,
  status: 'confirmed',
  depositCAD: 50,
  openRequest: null,
  ...over,
});
const visits = (over: Partial<VisitsResponse> = {}): VisitsResponse => ({
  sync: 'synced',
  syncedAt: new Date().toISOString(),
  upcoming: [visit({})],
  past: [visit({ id: 'b2222222-2222-4222-8222-222222222222', ref: 'NB-19877', startsAt: inDays(-30), status: 'completed', depositCAD: null })],
  freshaUrl: FRESHA,
  serverTime: new Date().toISOString(),
  ...over,
});

type Reply = { status: number; body?: unknown };
type Route = (body: Record<string, unknown>) => Reply;
let routes: Record<string, Route>;
let calls: { key: string; body: Record<string, unknown> }[];
const envelope = (code: string) => ({ error: { code, message: code, requestId: 'req-1' } });

function scriptApi(extra: Record<string, Route>) {
  calls = [];
  routes = {
    'GET /v1/catalog': () => ({ status: 200, body: catalog }),
    'GET /v1/me': () => ({
      status: 200,
      body: {
        customer: { id: 'c1', phone: '+16045550123', firstName: 'Maria', lastName: 'Chen', email: null },
        consents: [],
        roles: [],
        permissions: [],
        next: 'done',
        sessionExpiresAt: '2099-01-01T00:00:00.000Z',
      },
    }),
    'GET /v1/content/home': () => ({ status: 404, body: envelope('not_found') }),
    ...extra,
  };
  global.fetch = jest.fn(async (url: string, init: { method?: string; body?: string }) => {
    const key = `${init.method ?? 'GET'} ${url.replace('http://api.test', '')}`;
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ key, body });
    const r = routes[key]?.(body) ?? { status: 404, body: envelope('not_found') };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

async function signIn() {
  await SecureStore.setItemAsync(
    'nano.session.v2',
    JSON.stringify({ accessToken: 'acc', refreshToken: 'ref', accessExpiresAt: '2099-01-01T00:00:00.000Z', sessionExpiresAt: '2099-01-01T00:00:00.000Z' }),
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await SecureStore.deleteItemAsync('nano.session.v2');
  basket.clear();
  setReturnTo(null);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});

describe('Fresha hand-off (BOOK 15, 16) on the real screens', () => {
  it('basket → how it works → Fresha → return check: checking, not yet, then confirmed only from evidence', async () => {
    await signIn();
    let state: HandoffStatus['state'] = 'checking';
    let posts = 0;
    scriptApi({
      'POST /v1/bookings/handoffs': () => (++posts === 1 ? { status: 500, body: envelope('internal_error') } : { status: 200, body: { id: HANDOFF_ID, url: FRESHA, expiresAt: inDays(1) } }),
      [`GET /v1/bookings/handoffs/${HANDOFF_ID}`]: () => ({
        status: 200,
        body: { state, visit: state === 'confirmed' ? visit({ ref: 'NB-30001' }) : null, checkAgainAt: null },
      }),
      'GET /v1/visits': () => ({ status: 200, body: visits() }),
    });

    const router = renderRouter(APP_DIR, { initialUrl: '/book/service?service=svc_hifu' });
    expect(await screen.findByText('1 treatment · 60 min')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue in Fresha' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/how-it-works'));
    expect(screen.getByText('Assumption: depends on Fresha sharing bookings')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/fresha'));

    // A failed hand-off opens nothing; the retry reuses the same idempotency key (no duplicate hand-off).
    fireEvent.press(await screen.findByRole('button', { name: 'Continue to Fresha' }));
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Continue to Fresha' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/fresha-return'));
    const handoffs = calls.filter((c) => c.key === 'POST /v1/bookings/handoffs');
    expect(handoffs).toHaveLength(2);
    expect(handoffs[0]!.body).toEqual({ items: [{ serviceId: 'svc_hifu' }], idempotencyKey: handoffs[1]!.body.idempotencyKey });
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(FRESHA, expect.anything());
    expect(JSON.parse((await AsyncStorage.getItem('nano.private.handoff'))!).id).toBe(HANDOFF_ID);

    // Back from the browser: no evidence yet → checking, never "booked".
    expect(await screen.findByText('Checking your booking…')).toBeTruthy();
    expect(screen.queryByText('You’re booked')).toBeNull();
    state = 'notyet';
    expect(await screen.findByText('We couldn’t confirm yet', {}, { timeout: 8000 })).toBeTruthy();
    state = 'confirmed';
    fireEvent.press(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('You’re booked')).toBeTruthy();
    expect(screen.getByText('Reference NB-30001', { exact: false })).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem('nano.private.handoff')).toBeNull());
    expect(basket.get()).toEqual([]);
  });

  it('laser goes through areas first and sends the chosen areas', async () => {
    await signIn();
    scriptApi({});
    const router = renderRouter(APP_DIR, { initialUrl: '/book/service?service=svc_laser' });
    fireEvent.press(await screen.findByRole('button', { name: 'Choose laser areas' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/areas'));
    expect(screen.getByRole('button', { name: 'Choose at least one area' })).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Upper lip, $50.00'));
    fireEvent.press(screen.getByRole('button', { name: 'Continue in Fresha' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/how-it-works'));
    expect(basket.get()).toEqual([{ serviceId: 'svc_laser', areas: { set: 'women', names: ['Upper lip'] } }]);
  });

  it('a guest is asked to sign in before any hand-off is created', async () => {
    scriptApi({});
    const router = renderRouter(APP_DIR, { initialUrl: '/book/fresha' });
    expect(await screen.findByText('Sign in first so we can show your booking in Visits once Fresha shares it.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.getPathname()).toBe('/auth/phone'));
    expect(calls.some((c) => c.key.startsWith('POST /v1/bookings'))).toBe(false);
  });

  it('after sign-in a guest comes back to the same return check, link parameters included', async () => {
    scriptApi({});
    const router = renderRouter(APP_DIR, { initialUrl: `/book/fresha-return?handoff=${HANDOFF_ID}` });
    fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.getPathname()).toBe('/auth/phone'));
    await act(async () => goToNext('done'));
    await waitFor(() => expect(router.getPathname()).toBe('/book/fresha-return'));
    expect(router.getSearchParams()).toMatchObject({ handoff: HANDOFF_ID });
  });

  it('relaunch while Fresha was open resumes the return check', async () => {
    await signIn();
    await AsyncStorage.setItem('nano.entry.primerSeen.v1', '1');
    await AsyncStorage.setItem('nano.private.handoff', JSON.stringify({ id: HANDOFF_ID, openedAt: Date.now() - 60_000 }));
    scriptApi({ [`GET /v1/bookings/handoffs/${HANDOFF_ID}`]: () => ({ status: 200, body: { state: 'notyet', visit: null, checkAgainAt: null } }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/' });
    await waitFor(() => expect(router.getPathname()).toBe('/book/fresha-return'), { timeout: 8000 });
    expect(await screen.findByText('We couldn’t confirm yet')).toBeTruthy();
  });

  it('a stale or unknown return link lands on Home and forgets the pending hand-off', async () => {
    await signIn();
    await AsyncStorage.setItem('nano.private.handoff', JSON.stringify({ id: HANDOFF_ID, openedAt: Date.now() }));
    scriptApi({}); // the server doesn't know this hand-off (expired DB, other account): 404
    const router = renderRouter(APP_DIR, { initialUrl: `/book/fresha-return?handoff=${HANDOFF_ID}` });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    await waitFor(async () => expect(await AsyncStorage.getItem('nano.private.handoff')).toBeNull());
  });

  it('a malformed return link never reaches the server', async () => {
    await signIn();
    scriptApi({});
    const router = renderRouter(APP_DIR, { initialUrl: '/book/fresha-return?handoff=not-a-uuid' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    expect(calls.some((c) => c.key.includes('/v1/bookings/handoffs'))).toBe(false);
  });
});

describe('Visits (BOOK 08, 18, 19) on the real screens', () => {
  it('guest state asks to sign in', async () => {
    scriptApi({});
    renderRouter(APP_DIR, { initialUrl: '/visits' });
    expect(await screen.findByText('Your visits live here')).toBeTruthy();
  });

  it('without a Fresha read-back it says so; Open Fresha goes through the hand-off screens (BV-5)', async () => {
    await signIn();
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits({ sync: 'not_connected', syncedAt: null, upcoming: [], past: [] }) }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/visits' });
    expect(await screen.findByText('Your bookings are in Fresha')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open Fresha' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/how-it-works'));
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('with no Fresha link configured, the hand-off screen says so up front (BKG-08 not configured)', async () => {
    await signIn();
    await AsyncStorage.setItem('nano.booking.howItWorksDismissed', '1');
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits({ sync: 'not_connected', syncedAt: null, upcoming: [], past: [], freshaUrl: null }) }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/visits' });
    fireEvent.press(await screen.findByRole('button', { name: 'Open Fresha' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/fresha'));
    expect(await screen.findByText('Online booking isn’t set up yet. Call the clinic to book.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue to Fresha' })).toBeDisabled();
  });

  it('offline from the saved copy: no "Synced from Fresha" note (BV-7)', async () => {
    await signIn();
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits() }) });
    const first = renderRouter(APP_DIR, { initialUrl: '/visits' });
    expect(await screen.findByText(/^Synced from Fresha a few minutes ago/)).toBeTruthy();
    first.unmount();
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    renderRouter(APP_DIR, { initialUrl: '/visits' });
    expect(await screen.findByText('You’re offline')).toBeTruthy();
    expect(screen.queryByText(/^Synced from Fresha/)).toBeNull();
  });

  it('synced visits: next visit pass with Fresha status, past list, and detail with Change in Fresha', async () => {
    await signIn();
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits() }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/visits' });
    expect(await screen.findByText('Next appointment')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Past' }));
    expect(await screen.findByText('Done')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Upcoming' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Manage' }));
    await waitFor(() => expect(router.getPathname()).toBe('/visits/a1111111-1111-4111-8111-111111111111'));
    expect(await screen.findByText('Changes happen in Fresha. Late changes still go to the clinic.')).toBeTruthy();
    expect(screen.getByText('Reference NB-20418')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Change in Fresha' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/how-it-works'));
    expect(basket.get()).toEqual([{ serviceId: 'svc_hifu' }]);
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('a visit with an open request reads "Change requested" on the pass, not the Fresha status (BV-2)', async () => {
    await signIn();
    const asked = visit({
      openRequest: { id: 'r1', reference: 'NB-R1', visitId: 'a1111111-1111-4111-8111-111111111111', type: 'change', status: 'submitted', message: 'Tuesday?', declineReason: null, createdAt: new Date().toISOString() },
    });
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits({ upcoming: [asked] }) }) });
    renderRouter(APP_DIR, { initialUrl: `/visits/${asked.id}` });
    expect(await screen.findByText('You asked to move this visit. The clinic will confirm by text; your current time stays booked until then.')).toBeTruthy();
    expect(screen.getAllByText('Change requested').length).toBe(2); // pass badge + banner title
    expect(screen.queryByText('Confirmed')).toBeNull();
  });

  it('inside 48 hours: late banner from settings, and a request lands in the clinic queue once', async () => {
    await signIn();
    const soon = visit({ startsAt: inDays(1) });
    let sent = 0;
    scriptApi({
      // After the send the refetched list carries the open request (BV-1: the confirmation must stay on screen).
      'GET /v1/visits': () => ({
        status: 200,
        body: visits({
          upcoming: [
            sent
              ? { ...soon, openRequest: { id: 'r1', reference: 'NB-R1A2B3C', visitId: soon.id, type: 'cancel', status: 'submitted', message: 'x', declineReason: null, createdAt: new Date().toISOString() } }
              : soon,
          ],
        }),
      }),
      [`POST /v1/visits/${soon.id}/requests`]: (body) => {
        sent++;
        return { status: 200, body: { id: 'r1', reference: 'NB-R1A2B3C', visitId: soon.id, type: body.type, status: 'submitted', message: body.message, declineReason: null, createdAt: new Date().toISOString() } };
      },
    });
    const router = renderRouter(APP_DIR, { initialUrl: `/visits/${soon.id}` });
    expect(await screen.findByText('Your visit is less than 48 hours away')).toBeTruthy();
    expect(screen.getByText('Changes now go through the clinic. Cancelling keeps your $50.00 deposit as clinic credit.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Contact the clinic' }));
    await waitFor(() => expect(router.getPathname()).toBe(`/visits/${soon.id}/late-change`));
    expect(await screen.findByText('Your $50.00 deposit becomes clinic credit')).toBeTruthy();
    expect(screen.getByText('The deposit is kept')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Send to the clinic' }));
    expect(await screen.findByText('Add a short message so the clinic can help')).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: 'Ask to cancel' }));
    fireEvent.changeText(screen.getByLabelText('Your message'), 'I can’t make it this week.');
    fireEvent.press(screen.getByRole('button', { name: 'Send to the clinic' }));
    expect(await screen.findByText('Sent to the clinic')).toBeTruthy();
    await waitFor(() => expect(calls.filter((c) => c.key === 'GET /v1/visits').length).toBeGreaterThan(1));
    expect(screen.getByText('Sent to the clinic')).toBeTruthy();
    expect(sent).toBe(1);
    const post = calls.find((c) => c.key.startsWith('POST /v1/visits/'))!;
    expect(post.body).toMatchObject({ type: 'cancel', message: 'I can’t make it this week.' });
    expect(String(post.body.idempotencyKey).length).toBeGreaterThanOrEqual(8);
  });

  it('VIS-05: a cancelled visit offers to book the same treatment again; a visit that isn’t cancelled shows its detail', async () => {
    await signIn();
    const gone = visit({ id: 'd4444444-4444-4444-8444-444444444444', status: 'cancelled' });
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits({ upcoming: [visit({}), gone] }) }) });
    const router = renderRouter(APP_DIR, { initialUrl: `/visits/${gone.id}/cancelled` });
    expect(await screen.findByText('Visit cancelled')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Book another time' }));
    await waitFor(() => expect(router.getPathname()).toBe('/book/service'));
    expect(router.getSearchParams()).toMatchObject({ service: 'svc_hifu' });
  });

  it('VIS-05 for a visit that is still on goes to the visit itself (truth first)', async () => {
    await signIn();
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits() }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/visits/a1111111-1111-4111-8111-111111111111/cancelled' });
    await waitFor(() => expect(router.getPathname()).toBe('/visits/a1111111-1111-4111-8111-111111111111'));
  });

  it('BOOK 12: a past visit can be booked again with the same treatment', async () => {
    await signIn();
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits() }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/visits/b2222222-2222-4222-8222-222222222222' });
    fireEvent.press(await screen.findByText('Book again'));
    await waitFor(() => expect(router.getPathname()).toBe('/book/service'));
    expect(router.getSearchParams()).toMatchObject({ service: 'svc_hifu' });
  });

  it('a visit that is not in the list (old link, other account) lands on Home', async () => {
    await signIn();
    scriptApi({ 'GET /v1/visits': () => ({ status: 200, body: visits() }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/visits/c3333333-3333-4333-8333-333333333333' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
  });
});

describe('Ask us after sign-in (BV-4)', () => {
  it('a guest’s typed question comes back on the Ask us screen after sign-in', async () => {
    scriptApi({ 'GET /v1/support': () => ({ status: 200, body: { articles: [], askTopics: ['Unwanted hair', 'Something else'] } }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/support/ask' });
    fireEvent.press(await screen.findByText('Something else'));
    fireEvent.changeText(screen.getByLabelText('Your question'), 'Is laser OK for tanned skin?');
    fireEvent.press(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(router.getPathname()).toBe('/auth/phone'));
    await act(async () => goToNext('done'));
    await waitFor(() => expect(router.getPathname()).toBe('/support/ask'));
    expect(await screen.findByDisplayValue('Is laser OK for tanned skin?')).toBeTruthy();
    expect(calls.some((c) => c.key.startsWith('POST /v1/support'))).toBe(false);
  });
});
