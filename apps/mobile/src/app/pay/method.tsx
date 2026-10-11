import { attemptSchema, type Attempt, type MethodOption } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Banner, Button, Icon, PaymentMethodRow, Screen, Skeleton, Text, WalletPayButton } from '../../components';
import { newIdempotencyKey } from '../../booking/visits';
import { t } from '../../i18n';
import { analytics } from '../../lib/analytics';
import { useIsOnline } from '../../lib/network';
import { savePendingPayment } from '../../payments/pendingPayment';
import { presentWalletPay } from '../../payments/provider';
import { cents, useMethods } from '../../payments/queries';
import { useSettings } from '../../settings/useSettings';
import { useTheme } from '../../theme/ThemeProvider';

/** `/pay/method?order=` — PAY-01 (package, gift; none). Methods come from settings AND the provider (PAY 12–14). */
export default function PayMethod() {
  const { order } = useLocalSearchParams<{ order?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('pay.title') }} />
      <SignInGate>
        <Choose orderId={order} />
      </SignInGate>
    </>
  );
}

function Choose({ orderId }: { orderId: string | undefined }) {
  const router = useRouter();
  const online = useIsOnline();
  const { session } = useAuth();
  const { colors } = useTheme();
  const phone = useSettings().data?.data.clinic.phone ?? null;
  const methods = useMethods(orderId);
  const [chosen, setChosen] = useState<MethodOption['method'] | null>(null);
  const [busy, setBusy] = useState<MethodOption['method'] | null>(null);
  const [failed, setFailed] = useState(false);
  // A fresh key per tap: `busy` stops double taps, and the server settles or cancels any earlier open attempt
  // before starting a new one, so a retry after a cancelled sheet or hosted page can never charge twice.

  if (!methods.data) {
    return (
      <Screen topInset={false}>
        {methods.isError ? (
          <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => methods.refetch()}>{t('error.retry')}</Button>}>
            {t('error.body')}
          </Banner>
        ) : (
          <Skeleton lines={4} media={false} />
        )}
      </Screen>
    );
  }
  const { order } = methods.data;
  // WP-18: Apple Pay only on iOS, Google Pay only on Android; both show as the wallet button, not a radio row.
  const list = methods.data.methods.filter((m) => !(m.method === 'apple_pay' && Platform.OS !== 'ios') && !(m.method === 'google_pay' && Platform.OS !== 'android'));
  const wallet = list.find((m) => m.method === 'apple_pay' || m.method === 'google_pay');
  const rows = list.filter((m) => m !== wallet);
  const available = list.filter((m) => m.available);
  const selected = chosen ?? rows.find((m) => m.available)?.method ?? null;

  if (order.status !== 'pending') {
    return (
      <Screen topInset={false}>
        <Banner tone="info" title={t('pay.alreadyPaid')} />
        <Button onPress={() => router.replace({ pathname: '/pay/receipt/[id]', params: { id: order.id } })}>{t('pay.paid.receipt')}</Button>
      </Screen>
    );
  }

  async function go(method: MethodOption['method'] | null) {
    if (!method) return;
    setBusy(method);
    setFailed(false);
    try {
      const res = await session.authed(`/v1/orders/${order.id}/attempts`, { method: 'POST', body: { method, idempotencyKey: newIdempotencyKey() } });
      const attempt: Attempt = attemptSchema.parse(res.body);
      analytics.track('payment_started', { context: order.kind, method });
      const params = { attempt: attempt.id, order: order.id };
      // WP-1: the relaunch marker is saved only once a payment is actually submitted (card confirm on PAY-02,
      // the provider page opened on PAY-03, or a wallet token below), never for a form or sheet left unpaid.
      const submitted = () => savePendingPayment({ attemptId: attempt.id, orderId: order.id, startedAt: Date.now() });
      if (attempt.status !== 'requires_action') {
        await submitted();
        router.replace({ pathname: '/pay/status', params });
      } else if (method === 'card') router.push({ pathname: '/pay/card', params });
      else if (method === 'klarna' || method === 'affirm') router.push({ pathname: '/pay/provider', params: { ...params, method } });
      else {
        const token = await presentWalletPay(method);
        if (!token) {
          await session.authed(`/v1/payments/attempts/${attempt.id}/cancel`, { method: 'POST', body: {} }).catch(() => undefined);
          return;
        }
        await submitted();
        await session.authed(`/v1/payments/attempts/${attempt.id}/confirm`, { method: 'POST', body: { paymentToken: token } });
        router.replace({ pathname: '/pay/status', params });
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') methods.refetch();
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const digits = phone?.replace(/[^\d+]/g, '');
  const offline = online === false;
  return (
    <Screen
      topInset={false}
      footer={
        rows.some((m) => m.available) ? (
          <Button size="lg" fullWidth loading={busy !== null && busy === selected} disabled={!selected || offline || busy !== null} onPress={() => go(selected)}>
            {t('pay.continue')}
          </Button>
        ) : undefined
      }
    >
      <View style={[styles.summary, { backgroundColor: colors.surfaceTint }]} accessible>
        <Text variant="overline" tone="onTint">
          {order.kind === 'package' ? t('pkg.title') : t('gc.title')}
        </Text>
        <Text variant="amount">{cents(order.amountCents)}</Text>
        <Text variant="body">{order.detail ? `${order.title} · ${order.detail}` : order.title}</Text>
      </View>
      {available.length === 0 ? (
        <>
          <Banner tone="warning" title={t('pay.noneTitle')}>
            {t('pay.noneBody')}
          </Banner>
          {digits ? (
            <Button variant="secondary" icon="phone" onPress={() => Linking.openURL(`tel:${digits}`).catch(() => undefined)}>
              {t('pay.callClinic')}
            </Button>
          ) : null}
          <Button variant="tertiary" icon="arrow-clockwise" onPress={() => methods.refetch()}>
            {t('pay.tryAgain')}
          </Button>
        </>
      ) : (
        <>
          {wallet ? (
            <WalletPayButton
              type={wallet.method === 'apple_pay' ? 'apple' : 'google'}
              state={wallet.available && !offline ? 'available' : 'unavailable'}
              loading={busy === wallet.method}
              onPress={busy === null ? () => go(wallet.method) : undefined}
            />
          ) : null}
          {rows.length ? (
            <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={wallet ? t('pay.orPayWith') : t('pay.payWith')}>
              <Text variant="label">{wallet ? t('pay.orPayWith') : t('pay.payWith')}</Text>
              {rows.map((m) => (
                <PaymentMethodRow
                  key={m.method}
                  method={m.method}
                  label={t(`pay.method.${m.method}`)}
                  detail={m.method === 'card' ? t('pay.method.cardSub') : m.note}
                  state={m.available ? 'available' : 'unavailable'}
                  selected={selected === m.method}
                  onPress={() => setChosen(m.method)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
      {offline ? (
        <Banner tone="offline" title={t('offline.title')}>
          {t('offline.banner')}
        </Banner>
      ) : null}
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
      <View style={styles.secure}>
        <Icon name="lock" size={16} tone="inkMuted" />
        <Text variant="caption" tone="inkMuted" style={styles.flex}>
          {t('pay.secure')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: space['1'], padding: space['4'], borderRadius: radius.lg },
  list: { gap: space['2'] },
  secure: { flexDirection: 'row', gap: space['2'], alignItems: 'flex-start' },
});
