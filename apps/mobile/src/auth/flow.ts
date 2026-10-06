import { otpStartResponseSchema, type NextStep, type OtpStartResponse } from '@nano/contracts';
import { router, type Href } from 'expo-router';
import { ApiError, apiRequest } from '../api/client';

/** Mirror of the server resend timer; only used to tell a resend wait from an AUT-08 pause. */
const RESEND_SECONDS = 30;

/** AUT-03 → AUT-04 → AUT-05…07 → back to where the person was (Home by default). */
export function goToNext(next: NextStep) {
  const step: Record<Exclude<NextStep, 'done'>, Href> = {
    consents: '/auth/consents',
    profile: '/auth/profile',
    match: '/auth/match',
  };
  if (next === 'done') router.dismissTo('/home');
  else router.replace(step[next]);
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
      const seconds = error.info.retryAfterSeconds ?? 0;
      // A short wait is the resend timer; anything longer is the AUT-08 pause.
      return { ok: false, kind: seconds > RESEND_SECONDS ? 'limited' : 'wait', seconds };
    }
    return { ok: false, kind: 'network' };
  }
}
