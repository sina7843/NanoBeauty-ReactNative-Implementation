import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { join } from 'node:path';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.nanobeauty.app.dev' }));
jest.mock('../config/env', () => ({ getEnv: () => ({ appVariant: 'development', apiUrl: 'http://api.test' }) }));
jest.mock('../settings/useSettings', () => ({
  useSettings: () => ({ data: undefined, isPending: false, isError: true, refetch: jest.fn() }),
}));

const APP_DIR = join(__dirname, '../app');
jest.setTimeout(30_000);

type Handler = (body: Record<string, unknown>, auth: string | null) => { status: number; body?: unknown };

/** A scripted API: each route answers like the real server (see apps/api/src/auth/auth.test.ts). */
function scriptApi(routes: Record<string, Handler>) {
  const calls: string[] = [];
  global.fetch = jest.fn(async (url: string, init: { method?: string; body?: string; headers?: Record<string, string> }) => {
    const path = url.replace('http://api.test', '');
    const key = `${init.method ?? 'GET'} ${path}`;
    calls.push(key);
    const handler = routes[key];
    const result = handler ? handler(init.body ? JSON.parse(init.body) : {}, init.headers?.authorization ?? null) : { status: 404, body: envelope('not_found') };
    return new Response(result.body === undefined ? null : JSON.stringify(result.body), {
      status: result.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return calls;
}
const envelope = (code: string, extra: object = {}) => ({ error: { code, message: code, requestId: 'req-1', ...extra } });
const tokens = { accessToken: 'acc', refreshToken: 'ref', accessExpiresAt: '2026-10-06T17:15:00.000Z', sessionExpiresAt: '2026-11-05T17:00:00.000Z' };
const me = (next: string) => ({
  customer: { id: 'c1', phone: '+16045550123', firstName: 'Maria', lastName: 'Chen', email: null },
  consents: [],
  roles: [],
  permissions: [],
  next,
  sessionExpiresAt: tokens.sessionExpiresAt,
});

describe('sign-in flow on the real screens (AUT-01 → AUT-05)', () => {
  it('a test user completes OTP sign-in, consents, profile and the account match', async () => {
    let step = 'consents';
    let tries = 0;
    const calls = scriptApi({
      'POST /v1/auth/otp/start': () => ({
        status: 200,
        body: { challengeId: '7b0a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b', sentTo: '(604) •••-••23', expiresAt: '2026-10-06T17:05:00.000Z', resendAvailableAt: '2026-10-06T17:00:30.000Z' },
      }),
      'POST /v1/auth/otp/verify': (body) =>
        body.code === '123456'
          ? { status: 200, body: { ...tokens, next: 'consents' } }
          : { status: 401, body: envelope('code_wrong', { attemptsLeft: 2 - tries++ }) },
      'GET /v1/me': (_b, auth) => (auth === 'Bearer acc' ? { status: 200, body: me(step) } : { status: 401, body: envelope('unauthorized') }),
      'POST /v1/me/consents': (body) => {
        expect(body).toEqual({ terms: true, transactional: true, marketing: false });
        step = 'profile';
        return { status: 200, body: me(step) };
      },
      'PUT /v1/me/profile': (body) => {
        expect(body).toEqual({ firstName: 'Maria', lastName: 'Chen', email: null });
        step = 'match';
        return { status: 200, body: me(step) };
      },
      'POST /v1/me/legacy-match': () => ({
        status: 200,
        body: { state: 'matched', sample: true, items: [{ kind: 'credit', title: 'Clinic credit', value: '$40' }] },
      }),
      'POST /v1/me/legacy-match/decision': (body) => {
        expect(body).toEqual({ decision: 'looks_right' });
        step = 'done';
        return { status: 200, body: { reference: 'NB-M1234ABCD', status: 'awaiting_clinic' } };
      },
    });

    const router = renderRouter(APP_DIR, { initialUrl: '/auth/phone' });

    // AUT-01: invalid number is caught locally; a valid one sends the code.
    fireEvent.changeText(await screen.findByLabelText('Mobile number'), '(604) 555-01');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Enter a 10-digit Canadian mobile number')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '(604) 555-0123');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    // AUT-02: wrong code keeps tries visible, right code signs in.
    const otp = await screen.findByLabelText('Verification code');
    expect(screen.getByText('Sent to (604) •••-••23')).toBeTruthy();
    fireEvent.changeText(otp, '000000');
    expect(await screen.findByText("That code didn't match. You have 2 tries left.")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');

    // AUT-03: Continue needs the two required choices; offers stays unticked.
    expect(await screen.findByText('Welcome to Nano Beauty')).toBeTruthy();
    const cont = screen.getByRole('button', { name: 'Continue' });
    expect(cont.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByRole('checkbox', { name: 'I agree to the Terms of Service and Privacy Policy, Required' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Text me codes and appointment updates, Required' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    // AUT-04
    expect(await screen.findByText('About you')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('First name'), 'Maria');
    fireEvent.changeText(screen.getByLabelText('Last name'), 'Chen');
    fireEvent.press(screen.getByRole('button', { name: 'Finish' }));

    // AUT-05: sample records are labelled; "Looks right" goes Home.
    expect(await screen.findByText('We found your account')).toBeTruthy();
    expect(screen.getByText('Sample')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Looks right' }));
    await waitFor(() => expect(router.getPathname()).toBe('/home'));
    expect(await screen.findByRole('button', { name: 'Account' })).toBeTruthy();

    expect(calls).toEqual(
      expect.arrayContaining(['POST /v1/auth/otp/start', 'POST /v1/auth/otp/verify', 'POST /v1/me/consents', 'PUT /v1/me/profile', 'POST /v1/me/legacy-match/decision']),
    );
  });

  it('too many attempts shows the 10-minute pause (AUT-08 limited)', async () => {
    scriptApi({
      'POST /v1/auth/otp/start': () => ({ status: 429, body: envelope('rate_limited', { retryAfterSeconds: 600 }) }),
    });
    renderRouter(APP_DIR, { initialUrl: '/auth/phone' });
    fireEvent.changeText(await screen.findByLabelText('Mobile number'), '6045550123');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Too many code attempts')).toBeTruthy();
  });

  it('offline: no code was sent, and the person can try again', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    renderRouter(APP_DIR, { initialUrl: '/auth/phone' });
    fireEvent.changeText(await screen.findByLabelText('Mobile number'), '6045550123');
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('We couldn’t reach Nano Beauty. Check your connection and try again; no code was sent.')).toBeTruthy();
  });

  it('an ended session lands on "Please sign in again" (AUT-08 expired)', async () => {
    renderRouter(APP_DIR, { initialUrl: '/auth/code?reason=expired' });
    expect(await screen.findByText('Please sign in again')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
