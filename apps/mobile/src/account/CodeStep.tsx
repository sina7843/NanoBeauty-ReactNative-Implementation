import { OTP_LENGTH, otpStartResponseSchema, type OtpStartResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, type ApiResponse } from '../api/client';
import { Button, OTPInput } from '../components';
import type { ButtonProps } from '../components/Button';
import { t } from '../i18n';

/**
 * Code entry for an identity check inside the app (ACC-02 new number, ACC-09 deletion). Same rules as sign-in:
 * wrong → tries left, expired → new code, too many → wait. `confirm` throws ApiError; other codes go to
 * `describe` (e.g. 'that number has an account').
 * With `submit`, the 6th digit does not send: the person presses the button (ACC-09, WP-23).
 */
export function CodeStep({
  initial,
  resend,
  confirm,
  describe,
  submit,
}: {
  initial: OtpStartResponse;
  resend: () => Promise<ApiResponse>;
  confirm: (challengeId: string, code: string) => Promise<void>;
  describe?: (error: ApiError) => string | undefined;
  /** Explicit confirm button instead of auto-submit on the last digit. */
  submit?: { label: string; variant?: ButtonProps['variant'] };
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

  async function send(value: string) {
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

  const input = (
    <OTPInput
      value={code}
      onChange={(next) => {
        setCode(next);
        if (error) setError(undefined);
      }}
      onComplete={submit ? undefined : send}
      error={error}
      sentTo={challenge.sentTo}
      resendIn={resendIn}
      onResend={() => again()}
      disabled={busy}
    />
  );
  if (!submit) return input;
  return (
    <View style={styles.stack}>
      {input}
      <Button
        variant={submit.variant ?? 'primary'}
        size="lg"
        fullWidth
        loading={busy}
        disabled={code.length !== OTP_LENGTH}
        onPress={() => send(code)}
      >
        {submit.label}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: space['4'] } });
