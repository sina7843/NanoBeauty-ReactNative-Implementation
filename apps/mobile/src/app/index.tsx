import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { loadPendingHandoff } from '../booking/pendingHandoff';
import { attemptSchema } from '@nano/contracts';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { resumablePayment } from '../payments/pendingPayment';
import { Button, EmptyState, Logo } from '../components';
import { EntryLayout } from '../entry/GateScreens';
import { markPrimerSeen, useEntry } from '../entry/useEntry';
import { t } from '../i18n';
import { requestNotificationPermission } from '../platform/notifications';
import { useTheme } from '../theme/ThemeProvider';

/** `/` — ENT-01 splash and ENT-04 notification primer (ENT-02/03 are root-level gates). */
export default function Entry() {
  const screen = useEntry();
  // Update/maintenance are rendered by the root layout over everything; keep the splash underneath.
  if (screen === null || screen === 'update' || screen === 'maintenance') return <Splash />;
  if (screen === 'primer') return <NotificationPrimer />;
  return <Resume />;
}

/**
 * Home, or — if the app was closed mid-payment or while Fresha was open — Home with the payment status (PAY-04…08)
 * or the BKG-09 return check on top, so nothing interrupted is silently lost (PAY 07, BOOK 16).
 */
function Resume() {
  const router = useRouter();
  const { status, session } = useAuth();
  useEffect(() => {
    if (status === 'loading') return;
    let active = true;
    // WP-1: only an attempt the server still reports as processing comes back; anything else is dropped.
    const attemptStatus = async (id: string) => {
      try {
        return attemptSchema.parse((await session.authed(`/v1/payments/attempts/${encodeURIComponent(id)}`)).body).status;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'not_found') return null;
        throw e;
      }
    };
    Promise.all([loadPendingHandoff(), resumablePayment(attemptStatus)]).then(([handoff, payment]) => {
      if (!active) return;
      router.replace('/home');
      // An interrupted payment is checked with the provider first (PAY-03 promise), then an interrupted hand-off.
      if (payment) router.push({ pathname: '/pay/status', params: { attempt: payment.attemptId, order: payment.orderId } });
      else if (handoff) router.push({ pathname: '/book/fresha-return', params: { handoff: handoff.id } });
    });
    return () => {
      active = false;
    };
  }, [router, status, session]);
  return <Splash />;
}

/** ENT-01, continued in-app after the native splash so the hand-over is seamless. */
function Splash() {
  const { colors } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: colors.surfaceBrand }]} accessibilityLabel={t('app.name')}>
      <Logo variant="frame" height={300} />
    </View>
  );
}

/** ENT-04 — asks only for the OS permission; offers stay off (marketing consent is separate). */
function NotificationPrimer() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const finish = async (ask: boolean) => {
    setBusy(true);
    if (ask) await requestNotificationPermission();
    await markPrimerSeen();
    router.replace('/home');
  };
  return (
    <EntryLayout align="end">
      <EmptyState icon="bell" title={t('ent.primer.title')}>
        {t('ent.primer.body')}
      </EmptyState>
      <Button size="lg" fullWidth loading={busy} onPress={() => finish(true)}>
        {t('ent.primer.turnOn')}
      </Button>
      <Button variant="tertiary" fullWidth disabled={busy} onPress={() => finish(false)}>
        {t('ent.primer.notNow')}
      </Button>
    </EntryLayout>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
