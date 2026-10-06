import { otpVerifyResponseSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, apiRequest } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { goToNext, startCode } from '../../auth/flow';
import { Banner, Button, EmptyState, OTPInput, Text } from '../../components';
import { useClinicCall } from '../../entry/GateScreens';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

type Params = { challengeId?: string; sentTo?: string; resendAt?: string; phone?: string; reason?: 'expired' | 'limited' };

/** `/auth/code` — AUT-02 (entering, wrong, expired) and AUT-08 (session expired, limited). */
export default function CodeScreen() {
  const params = useLocalSearchParams<Params>();
  const [limited, setLimited] = useState(params.reason === 'limited');
  if (params.reason === 'expired') return <SessionExpired />;
  if (limited || !params.challengeId) return <Limited />;
  return <EnterCode params={params as Required<Params>} onLimited={() => setLimited(true)} />;
}

function EnterCode({ params, onLimited }: { params: Required<Params>; onLimited: () => void }) {
  const router = useRouter();
  const { completeSignIn } = useAuth();
  const [challenge, setChallenge] = useState({ id: params.challengeId, sentTo: params.sentTo, resendAt: Date.parse(params.resendAt) });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [network, setNetwork] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendIn = Math.max(0, Math.ceil((challenge.resendAt - now) / 1000));

  async function resend(message?: string) {
    const result = await startCode(params.phone);
    if (result.ok) {
      setChallenge({ id: result.challenge.challengeId, sentTo: result.challenge.sentTo, resendAt: Date.parse(result.challenge.resendAvailableAt) });
      setCode('');
      setError(message);
    } else if (result.kind === 'limited') onLimited();
    else if (result.kind === 'network') setNetwork(true);
    else if (result.kind === 'wait') setError(t('aut.retryIn', { seconds: result.seconds ?? 0 }));
  }

  async function verify(value: string) {
    if (busy) return;
    setBusy(true);
    setNetwork(false);
    try {
      const res = await apiRequest('/v1/auth/otp/verify', { method: 'POST', body: { challengeId: challenge.id, code: value } });
      const session = otpVerifyResponseSchema.parse(res.body);
      await completeSignIn(session);
      goToNext(session.next);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.code === 'code_wrong') {
        const left = e.info.attemptsLeft ?? 0;
        setError(left === 1 ? t('aut.code.wrongOne') : t('aut.code.wrongMany', { count: left })); // digits kept
      } else if (e.code === 'code_expired') await resend(t('aut.code.expired'));
      else if (e.code === 'rate_limited') onLimited();
      else setNetwork(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.heading}>
        <Text variant="displayMd" accessibilityRole="header">
          {t('aut.code.title')}
        </Text>
        <Text variant="body" tone="inkMuted">
          {t('aut.code.body')}
        </Text>
      </View>
      <OTPInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError(undefined);
        }}
        onComplete={verify}
        error={error}
        sentTo={challenge.sentTo}
        resendIn={resendIn}
        onResend={() => resend()}
        disabled={busy}
      />
      {network ? (
        <Banner tone="danger" title={t('aut.phone.networkTitle')}>
          {t('error.body')}
        </Banner>
      ) : null}
      <Button variant="tertiary" size="sm" onPress={() => router.replace('/auth/phone')}>
        {t('aut.code.otherNumber')}
      </Button>
    </ScrollView>
  );
}

/** AUT-08 expired. */
function SessionExpired() {
  const router = useRouter();
  return (
    <CenteredState>
      <EmptyState icon="lock" title={t('aut.expired.title')}>
        {t('aut.expired.body')}
      </EmptyState>
      <Button size="lg" fullWidth onPress={() => router.replace('/auth/phone')}>
        {t('aut.expired.action')}
      </Button>
    </CenteredState>
  );
}

/** AUT-08 limited — the call action appears once the clinic phone exists (docs/deviations.md). */
function Limited() {
  const call = useClinicCall();
  return (
    <CenteredState>
      <EmptyState icon="hourglass-medium" title={t('aut.limited.title')}>
        {t('aut.limited.body')}
      </EmptyState>
      {call ? (
        <Button variant="secondary" icon="phone" size="lg" fullWidth onPress={call}>
          {t('ent.callClinic')}
        </Button>
      ) : null}
    </CenteredState>
  );
}

function CenteredState({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.centered}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: space['5'], paddingHorizontal: space['5'], paddingTop: space['2'], paddingBottom: space['6'] },
  heading: { gap: space['2'] },
  centered: { flex: 1, justifyContent: 'center', gap: space['4'], paddingHorizontal: space['5'] },
});
