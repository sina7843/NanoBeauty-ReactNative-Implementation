import { attemptSchema, type Attempt, type MethodOption } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Badge, Banner, Button, Icon, Screen, Skeleton, Text } from '../../components';
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
  const [busy, setBusy] = useState(false);
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
  const { order, methods: list } = methods.data;
  const available = list.filter((m) => m.available);
  const selected = chosen ?? available[0]?.method ?? null;

  if (order.status !== 'pending') {
    return (
      <Screen topInset={false}>
        <Banner tone="info" title={t('pay.alreadyPaid')} />
        <Button onPress={() => router.replace({ pathname: '/pay/receipt/[id]', params: { id: order.id } })}>{t('pay.paid.receipt')}</Button>
      </Screen>
    );
  }

  async function go() {
    if (!selected) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed(`/v1/orders/${order.id}/attempts`, { method: 'POST', body: { method: selected, idempotencyKey: newIdempotencyKey() } });
      const attempt: Attempt = attemptSchema.parse(res.body);
      await savePendingPayment({ attemptId: attempt.id, orderId: order.id, startedAt: Date.now() });
      analytics.track('payment_started', { context: order.kind, method: selected });
      const params = { attempt: attempt.id, order: order.id };
      if (attempt.status !== 'requires_action') router.replace({ pathname: '/pay/status', params });
      else if (selected === 'card') router.push({ pathname: '/pay/card', params });
      else if (selected === 'klarna' || selected === 'affirm') router.push({ pathname: '/pay/provider', params: { ...params, method: selected } });
      else {
        const token = await presentWalletPay(selected);
        if (!token) {
          await session.authed(`/v1/payments/attempts/${attempt.id}/cancel`, { method: 'POST', body: {} }).catch(() => undefined);
          return;
        }
        await session.authed(`/v1/payments/attempts/${attempt.id}/confirm`, { method: 'POST', body: { paymentToken: token } });
        router.replace({ pathname: '/pay/status', params });
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') methods.refetch();
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const digits = phone?.replace(/[^\d+]/g, '');
  return (
    <Screen
      topInset={false}
      footer={
        available.length ? (
          <Button size="lg" fullWidth loading={busy} disabled={!selected || online === false} onPress={go}>
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
          <Button variant="tertiary" onPress={() => methods.refetch()}>
            {t('pay.tryAgain')}
          </Button>
        </>
      ) : (
        <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t('pay.payWith')}>
          <Text variant="label">{t('pay.payWith')}</Text>
          {list.map((m) => {
            const on = selected === m.method;
            return (
              <Pressable
                key={m.method}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled: !m.available }}
                accessibilityLabel={[t(`pay.method.${m.method}`), m.note].filter(Boolean).join(', ')}
                disabled={!m.available}
                onPress={() => setChosen(m.method)}
                style={[styles.row, { borderColor: on ? colors.primary : colors.lineStrong, borderWidth: on ? 2 : 1, opacity: m.available ? 1 : 0.5 }]}
              >
                <Icon name={on ? 'check-circle' : 'credit-card'} size={22} tone={on ? 'primary' : 'inkMuted'} fill={on} />
                <View style={styles.flex}>
                  <Text variant="body" strong>
                    {t(`pay.method.${m.method}`)}
                  </Text>
                  {m.method === 'card' ? (
                    <Text variant="caption" tone="inkMuted">
                      {t('pay.method.cardSub')}
                    </Text>
                  ) : m.note ? (
                    <Text variant="caption" tone="inkMuted">
                      {m.note}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {online === false ? (
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
      <Badge tone="sample">{t('badge.sample')}</Badge>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: space['1'], padding: space['4'], borderRadius: radius.lg },
  list: { gap: space['2'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 64, paddingHorizontal: space['4'], paddingVertical: space['3'], borderRadius: radius.md },
  secure: { flexDirection: 'row', gap: space['2'], alignItems: 'flex-start' },
});
