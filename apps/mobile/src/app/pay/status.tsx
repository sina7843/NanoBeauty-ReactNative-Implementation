import { attemptSchema, type Attempt } from '@nano/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Button, Screen } from '../../components';
import { t } from '../../i18n';
import { amountBand, analytics } from '../../lib/analytics';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { giftDraft } from '../../payments/giftDraft';
import { clearPendingPayment } from '../../payments/pendingPayment';
import { cents, useOrder } from '../../payments/queries';

const POLL_MS = 2000;
/** After this the screen says "still checking" (PAY-08) — never "failed" or "paid" on a guess. */
const CHECKING_AFTER_MS = 30_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `/pay/status` — PAY-04 waiting, PAY-05 paid, PAY-06 declined, PAY-07 cancelled, PAY-08 still checking. */
export default function PayStatus() {
  const { attempt, order } = useLocalSearchParams<{ attempt?: string; order?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('pay.title'), headerBackVisible: false, gestureEnabled: false }} />
      <Screen topInset={false}>
        <SignInGate>{attempt && order && UUID.test(attempt) && UUID.test(order) ? <Status attemptId={attempt} orderId={order} /> : <Redirect href={OLD_LINK_HREF} />}</SignInGate>
      </Screen>
    </>
  );
}

function Status({ attemptId, orderId }: { attemptId: string; orderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const order = useOrder(orderId).data;
  const [since] = useState(() => Date.now());
  const [now, setNow] = useState(since);
  const reported = useRef(false);
  const status = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async (): Promise<Attempt> => attemptSchema.parse((await session.authed(`/v1/payments/attempts/${attemptId}`)).body),
    refetchInterval: (q) => (['requires_action', 'processing'].includes((q.state.data as Attempt | undefined)?.status ?? 'processing') ? POLL_MS : false),
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 3,
    gcTime: 0,
  });
  const a = status.data;
  const open = !a || a.status === 'requires_action' || a.status === 'processing';
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!a || open || reported.current) return;
    reported.current = true;
    clearPendingPayment();
    if (a.status === 'succeeded') {
      if (order?.kind === 'gift') giftDraft.clear();
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      const band = order ? amountBand(order.amountCents) : undefined;
      analytics.track('payment_succeeded', { context: order?.kind ?? 'unknown', method: a.method, ...(band ? { amount_band: band } : {}) });
      if (order?.kind === 'gift') analytics.track('gift_purchased', { ...(band ? { amount_band: band } : {}), scheduled: order.detail?.includes('chosen time') ?? false });
      if (order?.kind === 'package') analytics.track('package_purchased', { method: a.method });
    } else {
      analytics.track('payment_failed', { context: order?.kind ?? 'unknown', method: a.method, reason: a.status === 'cancelled' ? 'cancelled' : 'declined' });
    }
  }, [a, open, order, queryClient]);

  if (status.error instanceof ApiError && status.error.code === 'not_found') {
    clearPendingPayment();
    return <Redirect href={OLD_LINK_HREF} />;
  }
  const help = (
    <Button variant="tertiary" fullWidth onPress={() => router.push({ pathname: '/support/contact', params: { reference: a?.reference, topic: t('pay.topic') } })}>
      {t('pay.help')}
    </Button>
  );
  const chooseMethod = () => router.replace({ pathname: '/pay/method', params: { order: orderId } });

  if (a?.status === 'succeeded') {
    return (
      <AsyncStatus
        state="success"
        title={t('pay.paid.title')}
        reference={a.reference}
        actions={
          <>
            <Button size="lg" fullWidth onPress={() => router.dismissTo('/wallet')}>
              {t('pay.continue')}
            </Button>
            <Button variant="secondary" fullWidth onPress={() => router.replace({ pathname: '/pay/receipt/[id]', params: { id: orderId } })}>
              {t('pay.paid.receipt')}
            </Button>
          </>
        }
      >
        {order ? t('pay.paid.body', { amount: cents(order.amountCents), method: a.methodLabel ?? t(`pay.method.${a.method}`) }) : undefined}
      </AsyncStatus>
    );
  }
  if (a?.status === 'declined') {
    return (
      <AsyncStatus
        state="failed"
        title={t('pay.declined.title')}
        reference={a.reference}
        actions={
          <>
            <Button size="lg" fullWidth onPress={chooseMethod}>
              {t('pay.declined.other')}
            </Button>
            {help}
          </>
        }
      >
        {t('pay.declined.body')}
      </AsyncStatus>
    );
  }
  if (a?.status === 'cancelled') {
    return (
      <AsyncStatus state="timeout" title={t('pay.cancelled.title')} actions={<Button size="lg" fullWidth onPress={chooseMethod}>{t('pay.cancelled.choose')}</Button>}>
        {t('pay.cancelled.body')}
      </AsyncStatus>
    );
  }
  if (now - since >= CHECKING_AFTER_MS || status.isError) {
    return (
      <AsyncStatus
        state="timeout"
        title={t('pay.checking.title')}
        reference={a?.reference}
        actions={
          <>
            <Button size="lg" fullWidth loading={status.isFetching} onPress={() => status.refetch()}>
              {t('pay.checkAgain')}
            </Button>
            {help}
          </>
        }
      >
        {t('pay.checking.body')}
      </AsyncStatus>
    );
  }
  // A card that needs the bank's check (3-D Secure) waits here while the person finishes it (PAY-02 verify).
  const verifying = a?.status === 'requires_action' && a.method === 'card';
  return (
    <AsyncStatus state="pending" title={verifying ? t('pay.verify.title') : t('pay.waiting.title')}>
      {verifying ? t('pay.verify.body') : t('pay.waiting.body')}
    </AsyncStatus>
  );
}
