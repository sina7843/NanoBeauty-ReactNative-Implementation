import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { act, renderRouter, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
jest.mock('../settings/useSettings', () => ({
  settingsQueryKey: ['settings'],
  useSettings: () => ({
    data: { data: { settings: { bookingMode: 'handoff', clinicHours: null, ratingLine: { on: false, source: 'Fresha' }, sample: true }, features: { legacyMembership: false }, clinic: { timezone: 'America/Vancouver', phone: null, address: '555 6th St' } } },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(60_000);
const listening = () => waitFor(() => expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled());
const tap = (href: string, recipient?: string) => (Notifications as unknown as { __tap(h: string, r?: string): void }).__tap(href, recipient);

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn(async () => new Response(JSON.stringify({ error: { code: 'not_found', message: 'x', requestId: 'r' } }), { status: 404, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
});

describe('notification taps (NANO-09)', () => {
  it('opens the destination the notification carries', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/home' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    await listening();
    await act(async () => tap('/support'));
    await waitFor(() => expect(router.getPathname()).toBe('/support'));
  });

  it('a notification meant for someone else (signed out, shared phone) opens nothing', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/support' });
    await waitFor(() => expect(router.getPathname()).toBe('/support'));
    await listening();
    await act(async () => tap('/visits/v1', 'another-customer'));
    expect(router.getPathname()).toBe('/support');
  });

  it('an unknown or in-app-booking destination lands on Home with "Link not found"', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/support' });
    await waitFor(() => expect(router.getPathname()).toBe('/support'));
    await listening();
    await act(async () => tap('/book/time'));
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    expect(router.getSearchParams()).toMatchObject({ notice: 'oldlink' });
  });
});
