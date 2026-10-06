import { space } from '@nano/design-tokens';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { SignInGate } from '../../../auth/SignInGate';
import { Badge, Banner, Button, ListGroup, ListRow, Screen, Skeleton, Text } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { OLD_LINK_HREF } from '../../../navigation/routes';
import { cents, useReceipt } from '../../../payments/queries';
import { useSettings } from '../../../settings/useSettings';

/** `/pay/receipt/[id]` — PAY-09 (PAY 08, PAY 09): itemised, method, reference, and every refund with its status. */
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('rcpt.title') }} />
      <Screen topInset={false}>
        <SignInGate>
          <Receipt orderId={id} />
        </SignInGate>
      </Screen>
    </>
  );
}

function Receipt({ orderId }: { orderId: string | undefined }) {
  const router = useRouter();
  const receipt = useReceipt(orderId);
  const clinic = useSettings().data?.data.clinic;
  const zone = clinic?.timezone ?? 'America/Vancouver';
  if (receipt.error instanceof ApiError && receipt.error.code === 'not_found') return <Redirect href={OLD_LINK_HREF} />;
  if (!receipt.data) {
    return receipt.isError ? (
      <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => receipt.refetch()}>{t('error.retry')}</Button>}>
        {t('error.body')}
      </Banner>
    ) : (
      <Skeleton lines={5} media={false} />
    );
  }
  const r = receipt.data;
  const statusLabel = r.status === 'paid' ? t('rcpt.paid') : r.status === 'refunded' ? t('rcpt.refunded') : t('rcpt.partial');
  const refundLabel = (s: string) => (s === 'succeeded' ? t('rcpt.refundDone') : s === 'failed' ? t('rcpt.refundFailed') : t('rcpt.refundPending'));
  const text = [
    clinic?.name ?? 'Nano Beauty',
    ...r.lines.map((l) => `${l.label}  ${cents(l.amountCents)}`),
    `${t('rcpt.gst')} ${cents(r.taxIncludedCents)}`,
    `${t('rcpt.total')} ${cents(r.totalCents)}`,
    `${t('rcpt.reference')} ${r.reference}`,
  ].join('\n');
  return (
    <>
      <Badge tone={r.status === 'paid' ? 'success' : 'info'}>{statusLabel}</Badge>
      <Text variant="caption" tone="inkMuted">
        {clinic ? `${clinic.name} · ${clinic.address}` : ''}
      </Text>
      <ListGroup>
        {r.lines.map((l) => (
          <ListRow key={l.label} title={l.label} value={cents(l.amountCents)} chevron={false} />
        ))}
        <ListRow title={t('rcpt.gst')} value={cents(r.taxIncludedCents)} chevron={false} />
        <ListRow title={t('rcpt.total')} value={cents(r.totalCents)} chevron={false} />
        {r.methodLabel ? <ListRow title={t('rcpt.method')} value={r.methodLabel} chevron={false} /> : null}
        <ListRow title={t('rcpt.date')} value={clinicDateTime(r.paidAt, zone)} chevron={false} />
        <ListRow title={t('rcpt.reference')} value={r.reference} chevron={false} />
      </ListGroup>
      {r.refunds.length ? (
        <ListGroup>
          {r.refunds.map((f) => (
            <ListRow key={f.reference} title={t('rcpt.refund', { reference: f.reference })} subtitle={refundLabel(f.status)} value={cents(f.amountCents)} chevron={false} />
          ))}
        </ListGroup>
      ) : null}
      {r.sample ? (
        <View style={styles.inline}>
          <Badge tone="sample">{t('badge.sample')}</Badge>
          <Text variant="caption" tone="inkMuted" style={styles.flex}>
            {t('rcpt.taxSample')}
          </Text>
        </View>
      ) : null}
      <Button variant="secondary" icon="receipt" onPress={() => Share.share({ message: text }).catch(() => undefined)}>
        {t('rcpt.share')}
      </Button>
      <Button variant="tertiary" onPress={() => router.push({ pathname: '/support/contact', params: { reference: r.reference, topic: t('pay.topic') } })}>
        {t('rcpt.wrong')}
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
});
