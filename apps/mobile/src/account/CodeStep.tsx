import { otpStartResponseSchema, type OtpStartResponse } from '@nano/contracts';
import { useEffect, useState } from 'react';
import { ApiError, type ApiResponse } from '../api/client';
import { OTPInput } from '../components';
import { t } from '../i18n';

/**
 * Code entry for an identity check inside the app (ACC-02 new number, ACC-09 deletion). Same rules as sign-in:
 * wrong → tries left, expired → new code, too many → wait. `confirm` throws ApiError; other codes go to
 * `describe` (e.g. 'that number has an account').
 */
export function CodeStep({
  initial,
  resend,
  confirm,
  describe,
}: {
  initial: OtpStartResponse;
  resend: () => Promise<ApiResponse>;
  confirm: (challengeId: string, code: string) => Promise<void>;
  describe?: (error: ApiError) => string | undefined;
}) {
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendIn = Math.max(
    0,
    Math.ceil((Date.parse(challenge.resendAvailableAt) - now) / 1000),
  );

  const message = (e: unknown) => {
    if (!(e instanceof ApiError)) return t('error.body');
    if (e.code === 'code_wrong') {
      const left = e.info.attemptsLeft ?? 0;
      return left === 1
        ? t('aut.code.wrongOne')
        : t('aut.code.wrongMany', { count: left });
    }
    if (e.code === 'rate_limited')
      return e.info.retryAfterSeconds && e.info.retryAfterSeconds > 30
        ? t('aut.limited.body')
        : t('aut.retryIn', { seconds: e.info.retryAfterSeconds ?? 30 });
    return describe?.(e) ?? t('error.body');
  };

  async function again(note?: string) {
    try {
      setChallenge(otpStartResponseSchema.parse((await resend()).body));
      setCode('');
      setError(note);
    } catch (e) {
      setError(message(e));
    }
  }

  async function submit(value: string) {
    if (busy) return;
    setBusy(true);
    try {
      await confirm(challenge.challengeId, value);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'code_expired')
        await again(t('aut.code.expired'));
      else setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <OTPInput
      value={code}
      onChange={(next) => {
        setCode(next);
        if (error) setError(undefined);
      }}
      onComplete={submit}
      error={error}
      sentTo={challenge.sentTo}
      resendIn={resendIn}
      onResend={() => again()}
      disabled={busy}
    />
  );
}
