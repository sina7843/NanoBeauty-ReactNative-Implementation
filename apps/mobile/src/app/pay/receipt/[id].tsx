import { space } from '@nano/design-tokens';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { SignInGate } from '../../../auth/SignInGate';
import { Badge, Banner, Button, Card, ListGroup, ListRow, Logo, Screen, Skeleton, Text } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
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
    `${t('rcpt.order')} ${r.orderReference}`,
  ].join('\n');
  const row = (label: string, value: string, strong?: boolean) => (
    <View key={label} style={styles.line} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text variant={strong ? 'headline' : 'body'} tone={strong ? 'ink' : 'inkMuted'} style={styles.flex}>
        {label}
      </Text>
      <Text variant={strong ? 'amount' : 'body'}>{value}</Text>
    </View>
  );
  return (
    <>
      <Card>
        <View style={styles.head}>
          <Logo height={26} />
          <Badge tone={r.status === 'paid' ? 'success' : 'info'} icon={r.status === 'paid' ? 'check' : undefined}>
            {statusLabel}
          </Badge>
        </View>
        {clinic ? (
          <Text variant="caption" tone="inkMuted">
            {`${clinic.name} · ${clinic.address}`}
          </Text>
        ) : null}
        <Divider />
        {r.lines.map((l) => row(l.label, cents(l.amountCents)))}
        {row(t('rcpt.gst'), cents(r.taxIncludedCents))}
        <Divider />
        {row(t('rcpt.total'), cents(r.totalCents), true)}
        <Divider />
        {r.methodLabel ? row(t('rcpt.method'), r.methodLabel) : null}
        {row(t('rcpt.date'), clinicDateTime(r.paidAt, zone, true))}
        {row(t('rcpt.reference'), r.reference)}
        {/* WP-21: the order reference is the one Receipts and history shows, so both screens match. */}
        {row(t('rcpt.order'), r.orderReference)}
      </Card>
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
      <Button variant="secondary" icon="arrow-square-out" fullWidth onPress={() => Share.share({ message: text }).catch(() => undefined)}>
        {t('rcpt.share')}
      </Button>
      <Button variant="tertiary" fullWidth onPress={() => router.push({ pathname: '/support/contact', params: { reference: r.reference, topic: t('pay.topic') } })}>
        {t('rcpt.wrong')}
      </Button>
    </>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.line }]} />;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: space['3'], paddingVertical: space['1'] },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: space['1'] },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
});
