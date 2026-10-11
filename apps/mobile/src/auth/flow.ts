import { otpStartResponseSchema, type NextStep, type OtpStartResponse } from '@nano/contracts';
import { router, type Href } from 'expo-router';
import { ApiError, apiRequest } from '../api/client';

/** Mirror of the server resend timer; only used to tell a resend wait from an AUT-08 pause. */
const RESEND_SECONDS = 30;

let returnTo: Href | null = null;
/** Where to resume after sign-in (AUTH 11), e.g. the Fresha hand-off a guest started. */
export function setReturnTo(href: Href | null) {
  returnTo = href;
}

export const STEP_HREF: Record<Exclude<NextStep, 'done'>, '/auth/consents' | '/auth/profile' | '/auth/match'> = {
  consents: '/auth/consents',
  profile: '/auth/profile',
  match: '/auth/match',
};

/**
 * FE-1: a signed-in person whose sign-up isn't finished belongs on the pending step. Returns where to send them from
 * `pathname`, or null to stay. The entry splash (`/`) and the terms page opened from AUT-03 are left alone.
 */
export function onboardingRedirect(next: NextStep | undefined, pathname: string): Href | null {
  if (!next || next === 'done') return null;
  const step = STEP_HREF[next];
  if (pathname === step || pathname === '/' || pathname.startsWith('/legal/')) return null;
  return step;
}

/** AUT-03 → AUT-04 → AUT-05…07 → back to where the person was (Home by default). */
export function goToNext(next: NextStep) {
  if (next === 'done') {
    router.dismissTo('/home');
    if (returnTo) router.push(returnTo);
    returnTo = null;
  } else router.replace(STEP_HREF[next]);
}

export type StartResult = { ok: true; challenge: OtpStartResponse } | { ok: false; kind: 'invalid' | 'network' | 'limited' | 'wait'; seconds?: number };

/** POST /v1/auth/otp/start with errors mapped to AUT-01/AUT-08 states. */
export async function startCode(phone: string): Promise<StartResult> {
  try {
    const res = await apiRequest('/v1/auth/otp/start', { method: 'POST', body: { phone } });
    return { ok: true, challenge: otpStartResponseSchema.parse(res.body) };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.code === 'validation_failed') return { ok: false, kind: 'invalid' };
    if (error.code === 'rate_limited') {
      // The 429 envelope carries `error.retryAfterSeconds` (API-9). A short wait is the resend timer; anything longer,
      // or an unknown wait, is the AUT-08 pause (never "try again in 0 seconds").
      const seconds = error.info.retryAfterSeconds;
      return seconds && seconds <= RESEND_SECONDS ? { ok: false, kind: 'wait', seconds } : { ok: false, kind: 'limited', seconds };
    }
    return { ok: false, kind: 'network' };
  }
}
