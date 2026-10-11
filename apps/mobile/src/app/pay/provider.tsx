import { attemptSchema } from '@nano/contracts';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Banner, Button, Card, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { clearPendingPayment, savePendingPayment } from '../../payments/pendingPayment';
import { openAndWaitForReturn } from '../../platform/browser';
import { cents, useOrder } from '../../payments/queries';

/** `/pay/provider` — PAY-03. Klarna / Affirm run on their own secure page; the result comes from the provider. */
export default function PayProvider() {
  const params = useLocalSearchParams<{ attempt: string; order: string; method: 'klarna' | 'affirm' }>();
  const name = params.method === 'affirm' ? 'Affirm' : 'Klarna';
  return (
    <>
      <Stack.Screen options={{ title: t('pay.provider.title', { provider: name }) }} />
      <SignInGate>
        <Leave {...params} name={name} />
      </SignInGate>
    </>
  );
}

function Leave({ attempt, order: orderId, name }: { attempt: string; order: string; name: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const order = useOrder(orderId).data;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const status = { pathname: '/pay/status', params: { attempt, order: orderId } } as const;

  async function go() {
    setBusy(true);
    setFailed(false);
    try {
      const a = attemptSchema.parse((await session.authed(`/v1/payments/attempts/${attempt}`)).body);
      // WP-1: opening the provider's page submits the payment, so a relaunch checks it from here on.
      await savePendingPayment({ attemptId: attempt, orderId, startedAt: Date.now() });
      if (a.redirectUrl) await openAndWaitForReturn(a.redirectUrl);
      router.replace(status);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function other() {
    await session.authed(`/v1/payments/attempts/${attempt}/cancel`, { method: 'POST', body: {} }).catch(() => undefined);
    await clearPendingPayment();
    router.back();
  }

  return (
    <Screen
      topInset={false}
      footer={
        <>
          <Button size="lg" fullWidth iconAfter="arrow-square-out" loading={busy} onPress={go}>
            {t('pay.provider.continue', { provider: name })}
          </Button>
          <Button variant="tertiary" fullWidth onPress={other}>
            {t('pay.provider.other')}
          </Button>
        </>
      }
    >
      {order ? (
        <Card>
          <Text variant="body" strong>
            {order.title}
          </Text>
          <Text variant="amount">{cents(order.amountCents)}</Text>
        </Card>
      ) : null}
      <Banner tone="info" title={t('pay.provider.nothing', { provider: name })}>
        {t('pay.provider.body', { provider: name })}
      </Banner>
      <Text variant="caption" tone="inkMuted">
        {t('pay.provider.closes')}
      </Text>
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
    </Screen>
  );
}
