import type { DeletionPreview, InboxResponse } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
let mockPermission = 'granted';
jest.mock('../platform/notifications', () => ({
  getNotificationPermission: jest.fn(async () => mockPermission),
  requestNotificationPermission: jest.fn(async () => mockPermission),
}));
jest.mock('../settings/useSettings', () => ({
  useSettings: () => ({
    data: {
      data: {
        settings: { bookingMode: 'handoff', deletionGraceDays: 30, clinicHours: null, ratingLine: { on: false, source: 'Fresha' }, sample: true },
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

type Reply = { status: number; body?: unknown };
let routes: Record<string, (body: Record<string, unknown>) => Reply>;
let calls: { key: string; body: Record<string, unknown> }[];
const envelope = (code: string, extra: object = {}) => ({ error: { code, message: code, requestId: 'req-1', ...extra } });
const challenge = (sentTo: string) => ({
  challengeId: '7b0a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b',
  sentTo,
  expiresAt: '2099-01-01T00:05:00.000Z',
  resendAvailableAt: new Date(Date.now() + 30_000).toISOString(),
});
let phone = '+16045550123';
const me = () => ({
  customer: { id: 'c1', phone, firstName: 'Maria', lastName: 'Chen', email: 'maria@example.com', createdAt: '2025-03-01T17:00:00.000Z' },
  deletion: null,
  consents: [
    { purpose: 'terms', granted: true, version: 'v2.1', recordedAt: '2026-10-02T17:00:00.000Z' },
    { purpose: 'transactional', granted: true, version: 'sms-v1', recordedAt: '2026-10-02T17:00:00.000Z' },
    { purpose: 'marketing', granted: false, version: 'offers-v1', recordedAt: '2026-10-02T17:00:00.000Z' },
  ],
  roles: [],
  permissions: [],
  next: 'done',
  sessionExpiresAt: '2099-01-01T00:00:00.000Z',
});
const inbox: InboxResponse = {
  unread: 1,
  items: [
    { id: '7', title: 'Request sent to the clinic', body: 'Reference NB-R1A2B3C.', href: '/visits/a1', hrefLabel: 'See your visit', createdAt: '2026-10-06T17:00:00.000Z', read: false },
    { id: '3', title: 'We’re preparing your data', body: 'Reference DR-1042.', href: null, hrefLabel: null, createdAt: '2026-10-01T17:00:00.000Z', read: true },
  ],
};
const preview: DeletionPreview = {
  upcomingVisits: { count: 1, next: '2026-10-16T21:30:00.000Z' },
  balances: [],
  delete: ['Your profile, sign-in and devices'],
  deidentify: ['Your customer record: name, mobile number and email removed'],
  retain: ['Payment and tax records for the period required in BC'],
  graceDays: 30,
  sample: true,
};

function scriptApi(extra: Record<string, (body: Record<string, unknown>) => Reply> = {}) {
  calls = [];
  routes = {
    'GET /v1/me': () => ({ status: 200, body: me() }),
    'GET /v1/me/preferences': () => ({ status: 200, body: { bookingMessages: true, reminders: true, aftercare: true, marketing: false } }),
    'GET /v1/me/inbox': () => ({ status: 200, body: inbox }),
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

beforeEach(async () => {
  phone = '+16045550123';
  mockPermission = 'granted';
  await AsyncStorage.clear();
  await SecureStore.setItemAsync(
    'nano.session.v2',
    JSON.stringify({ accessToken: 'acc', refreshToken: 'ref', accessExpiresAt: '2099-01-01T00:00:00.000Z', sessionExpiresAt: '2099-01-01T00:00:00.000Z' }),
  );
});

describe('account (ACC-01…07) on the real screens', () => {
  it('ACC-01 shows who is signed in, reminders and unread messages', async () => {
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/account' });
    expect(await screen.findByText('Maria Chen')).toBeTruthy();
    expect(screen.getByText('(604) •••-••23 · client since 2025')).toBeTruthy();
    expect(await screen.findByText('Reminders on')).toBeTruthy();
    expect(await screen.findByText('1 new')).toBeTruthy();
    // WP-25: both policies are reachable from Account; the staff footer shows only to staff.
    expect(screen.getByText('Terms and policies')).toBeTruthy();
    expect(screen.getByText('Booking policy')).toBeTruthy();
    expect(screen.queryByText('Shown only to clinic staff.')).toBeNull();
  });

  it('ACC-02 starts from the loaded account: fields filled, nothing counted as changed (WP-26)', async () => {
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/account/profile' });
    expect(await screen.findByDisplayValue('Maria')).toBeTruthy();
    expect(screen.getByDisplayValue('Chen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('a cold-start notification tap opens once the signed-in account is loaded (WP-2)', async () => {
    scriptApi();
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValueOnce({
      notification: { request: { identifier: 'cold-1', content: { data: { href: '/account/inbox', recipient: 'c1' } } } },
    } as never);
    const router = renderRouter(APP_DIR, { initialUrl: '/home' });
    await waitFor(() => expect(router.getPathname()).toBe('/account/inbox'));
  });

  it('ACC-02 a new number is saved only after its code is verified; a taken number is explained', async () => {
    let verifyStatus = 409;
    scriptApi({
      'PUT /v1/me/profile': () => ({ status: 200, body: me() }),
      'POST /v1/me/phone/start': () => ({ status: 200, body: challenge('(778) •••-••99') }),
      'POST /v1/me/phone/verify': () => {
        if (verifyStatus === 409) return { status: 409, body: envelope('conflict') };
        phone = '+17785550199';
        return { status: 200, body: me() };
      },
    });
    const router = renderRouter(APP_DIR, { initialUrl: '/account/profile' });
    fireEvent.changeText(await screen.findByLabelText('Mobile number'), '(778) 555-0199');
    expect(screen.getByText('We’ll text a code to this new number before saving.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Send code to new number' }));
    expect(await screen.findByText('Confirm your new number')).toBeTruthy();
    expect(calls.find((c) => c.key === 'POST /v1/me/phone/start')!.body).toEqual({ phone: '(778) 555-0199' });
    const code = screen.getByLabelText('Verification code');
    fireEvent.changeText(code, '123456');
    expect(await screen.findByText('That number belongs to another account. Contact the clinic to merge them.')).toBeTruthy();
    expect(phone).toBe('+16045550123');
    verifyStatus = 200;
    fireEvent.changeText(code, '');
    fireEvent.changeText(code, '654321');
    await waitFor(() => expect(phone).toBe('+17785550199'));
    await waitFor(() => expect(router.getPathname()).not.toBe('/account/profile'));
  });

  it('ACC-03 booking messages are locked on; offers change only when the server saves them; OS-off is explained', async () => {
    mockPermission = 'denied';
    scriptApi({ 'PUT /v1/me/preferences': (b) => ({ status: 200, body: { bookingMessages: true, ...b } }) });
    renderRouter(APP_DIR, { initialUrl: '/account/notifications' });
    expect(await screen.findByText('Notifications are off for Nano Beauty')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
    fireEvent(screen.getByRole('switch', { name: /Offers and events/ }), 'valueChange', true);
    await waitFor(() => expect(calls.find((c) => c.key === 'PUT /v1/me/preferences')?.body).toEqual({ reminders: true, aftercare: true, marketing: true }));
    expect(screen.queryByRole('switch', { name: /Booking messages/ })).toBeNull(); // locked: no switch to move
  });

  it('ACC-04/05 lists new and earlier messages; opening one shows it and its link', async () => {
    scriptApi({ 'GET /v1/me/inbox/7': () => ({ status: 200, body: { ...inbox.items[0], read: true } }) });
    const router = renderRouter(APP_DIR, { initialUrl: '/account/inbox' });
    expect(await screen.findByText('New')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
    fireEvent.press(screen.getByText('Request sent to the clinic'));
    await waitFor(() => expect(router.getPathname()).toBe('/account/inbox/7'));
    expect(await screen.findByText('Reference NB-R1A2B3C.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'See your visit' })).toBeTruthy();
  });

  it('ACC-04 empty state', async () => {
    scriptApi({ 'GET /v1/me/inbox': () => ({ status: 200, body: { items: [], unread: 0 } }) });
    renderRouter(APP_DIR, { initialUrl: '/account/inbox' });
    expect(await screen.findByText('No messages yet')).toBeTruthy();
  });

  it('ACC-06 consent summary and history; ACC-07 a tracked data request with a reference', async () => {
    scriptApi({
      'GET /v1/me/consents': () => ({ status: 200, body: [{ purpose: 'marketing', granted: false, version: 'offers-v1', channel: 'app', recordedAt: '2026-10-02T17:00:00.000Z' }] }),
      'GET /v1/me/data-requests': () => ({ status: 200, body: { latest: null } }),
      'POST /v1/me/data-requests': (b) => ({
        status: 200,
        body: { reference: 'DR-1A2B3C', kind: 'export', status: 'received', createdAt: '2026-10-06T17:00:00.000Z', dueAt: '2026-11-05T17:00:00.000Z', completedAt: null, email: b.email },
      }),
    });
    const router = renderRouter(APP_DIR, { initialUrl: '/account/privacy' });
    expect(await screen.findByText(/Terms v2.1 accepted .* · offers off/)).toBeTruthy();
    fireEvent.press(screen.getByText('Consents'));
    expect(await screen.findByText(/Offers · Declined · offers-v1/)).toBeTruthy();
    fireEvent.press(screen.getByText('Request a copy of my data'));
    await waitFor(() => expect(router.getPathname()).toBe('/account/data-request'));
    expect(await screen.findByDisplayValue('maria@example.com')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Request my data' }));
    expect(await screen.findByText('Request sent')).toBeTruthy();
    expect(screen.getAllByText(/DR-1A2B3C/)).toHaveLength(1); // WP-15: the reference once
    expect(screen.getByText('Reference DR-1A2B3C. We’ll email you when it’s ready.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Requested' })).toBeDisabled();
  });
});

describe('account deletion (ACC-08…10)', () => {
  it('explains, confirms with a code, signs out and shows the server status', async () => {
    scriptApi({
      'GET /v1/me/deletion/preview': () => ({ status: 200, body: preview }),
      'POST /v1/me/deletion/start': () => ({ status: 200, body: challenge('(604) •••-••23') }),
      'POST /v1/me/deletion': () => ({
        status: 200,
        body: { token: '0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d', reference: 'DEL-1A2B3C', status: 'pending', dueAt: '2026-11-05T17:00:00.000Z', completedAt: null },
      }),
      'POST /v1/auth/logout': () => ({ status: 401, body: envelope('unauthorized') }),
      'GET /v1/privacy/deletion/0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d': () => ({
        status: 200,
        body: { token: '0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d', reference: 'DEL-1A2B3C', status: 'pending', dueAt: '2026-11-05T17:00:00.000Z', completedAt: null },
      }),
    });
    renderRouter(APP_DIR, { initialUrl: '/account/delete' });
    expect(await screen.findAllByText('Before you go')).toHaveLength(1); // WP-24: once, as the Banner title
    expect(screen.getByText(/You have 1 upcoming visit/)).toBeTruthy();
    expect(screen.getByText('Your profile, sign-in and devices')).toBeTruthy();
    expect(screen.getByText('Your customer record: name, mobile number and email removed')).toBeTruthy();
    expect(screen.getByText('Payment and tax records for the period required in BC')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue to delete' }));
    expect(await screen.findByText('We sent a code to (604) •••-••23. Deleting can’t be undone.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    // WP-23: the 6th digit doesn't delete; the destructive button does.
    expect(calls.find((c) => c.key === 'POST /v1/me/deletion')).toBeUndefined();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByText('Deletion requested')).toBeTruthy();
    expect(screen.getByText(/You’re signed out. Your account will be deleted within 30 days/)).toBeTruthy();
    expect(await SecureStore.getItemAsync('nano.session.v2')).toBeNull();
  });

  it('after sign-out the stored request shows "Account deleted" once the server completes it', async () => {
    await SecureStore.deleteItemAsync('nano.session.v2');
    await AsyncStorage.setItem('nano.deletion.request', '0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d');
    scriptApi({
      'GET /v1/privacy/deletion/0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d': () => ({
        status: 200,
        body: { token: '0b5c3e1a-4d2f-4a6b-9c8d-7e6f5a4b3c2d', reference: 'DEL-1A2B3C', status: 'completed', dueAt: '2026-11-05T17:00:00.000Z', completedAt: '2026-11-05T18:00:00.000Z' },
      }),
    });
    renderRouter(APP_DIR, { initialUrl: '/account/delete' });
    expect(await screen.findByText('Account deleted')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await waitFor(async () => expect(await AsyncStorage.getItem('nano.deletion.request')).toBeNull());
  });

  it('a guest without a request is asked to sign in first', async () => {
    await SecureStore.deleteItemAsync('nano.session.v2');
    scriptApi();
    renderRouter(APP_DIR, { initialUrl: '/account/delete' });
    expect(await screen.findByText('Sign in to continue')).toBeTruthy();
  });
});
