import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: null }) }));
// No API in tests: by default settings are unavailable, so the documented hand-off default applies.
// Tests can swap in a settings payload through mockSettings.
let mockSettings: unknown;
jest.mock('../settings/useSettings', () => ({
  useSettings: () =>
    mockSettings
      ? { data: { data: mockSettings, source: 'network' }, isPending: false, isError: false, refetch: jest.fn() }
      : { data: undefined, isPending: false, isError: true, refetch: jest.fn() },
}));
afterEach(() => {
  mockSettings = undefined;
});

const withGate = (app: object) => ({
  settings: { bookingMode: 'handoff' },
  clinic: { timezone: 'America/Vancouver', phone: null },
  app: { minimumVersion: { ios: '1.0.0', android: '1.0.0' }, storeUrl: { ios: null, android: null }, maintenance: null, ...app },
});

const APP_DIR = join(__dirname, '../app');
// The first render transforms the whole route tree; allow for a cold cache on CI.
jest.setTimeout(30_000);

describe('navigation (real route tree)', () => {
  it('unknown deep links land on Home with the "Link not found" note', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/this/link/is/old' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    expect(await screen.findByText('Link not found')).toBeTruthy();
  });

  it('in-app booking routes are unreachable in hand-off mode (D33)', async () => {
    const router = renderRouter(APP_DIR, { initialUrl: '/book/time' });
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
  });

  it('Home shows the Option B tab bar, guest Sign in and Book action', async () => {
    renderRouter(APP_DIR, { initialUrl: '/home' });
    for (const tab of ['Home', 'Treatments', 'Visits', 'Wallet']) {
      expect(await screen.findByRole('tab', { name: tab })).toBeTruthy();
    }
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Book appointment' })).toBeTruthy();
  });

  it('maintenance blocks deep links too (ENT-03 at the root, not only on /)', async () => {
    mockSettings = withGate({ maintenance: { until: new Date(Date.now() + 3_600_000).toISOString() } });
    renderRouter(APP_DIR, { initialUrl: '/home' });
    expect(await screen.findByText('Back shortly')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Home' })).toBeNull();
  });

  it('an unsupported version is blocked on any route (ENT-02)', async () => {
    mockSettings = withGate({ minimumVersion: { ios: '2.0.0', android: '2.0.0' } });
    renderRouter(APP_DIR, { initialUrl: '/book/service' });
    expect(await screen.findByText('Time for an update')).toBeTruthy();
  });

  it('an ended maintenance window does not block', async () => {
    mockSettings = withGate({ maintenance: { until: new Date(Date.now() - 60_000).toISOString() } });
    renderRouter(APP_DIR, { initialUrl: '/home' });
    expect(await screen.findByRole('tab', { name: 'Home' })).toBeTruthy();
    expect(screen.queryByText('Back shortly')).toBeNull();
  });
});
