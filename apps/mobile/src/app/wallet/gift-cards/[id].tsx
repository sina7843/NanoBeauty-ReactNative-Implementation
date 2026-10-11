import type { Instrument } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { Banner, Button, GiftCard as GiftFace, ListGroup, ListRow, Screen, Text, useToast } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { HelpLink, InstrumentGate, LedgerLines, sentGiftStatus } from '../../../payments/InstrumentView';
import { cents, useReceipt } from '../../../payments/queries';
import { SendTimePicker } from '../../../payments/SendTimePicker';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/gift-cards/[id]` — WAL-04 (mine, sent). The sender sees delivery, never how a claimed card is spent. */
export default function GiftCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  return (
    <>
      <Stack.Screen options={{ title: t('gc.title') }} />
      <InstrumentGate id={id}>
        {({ instrument, lines }) =>
          instrument.role === 'sender' ? <Sent instrument={instrument} zone={zone} /> : <Mine instrument={instrument} lines={lines} zone={zone} />
        }
      </InstrumentGate>
    </>
  );
}

function Mine({ instrument: i, lines, zone }: { instrument: Instrument; lines: Parameters<typeof LedgerLines>[0]['lines']; zone: string }) {
  const router = useRouter();
  const reconciling = i.status === 'reconciling' || i.balanceCents === null;
  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
          {t('wal.book')}
        </Button>
      }
    >
      {/* WP-9: your own gift card on its GiftCard face. */}
      <GiftFace balance={reconciling ? undefined : (i.balanceCents ?? 0) / 100} code={i.last4 ? `•••• ${i.last4}` : ''} design={i.gift?.design || undefined} />
      {reconciling ? (
        <Banner tone="info" title={t('wal.reconciling')}>
          {t('wal.reconcilingNote')}
        </Banner>
      ) : null}
      <LedgerLines lines={lines} zone={zone} />
      <Text variant="caption" tone="inkMuted">
        {t('gc.terms')}
      </Text>
      <HelpLink onPress={() => router.push({ pathname: '/wallet/help', params: { id: i.id } })}>{t('gc.problem')}</HelpLink>
    </Screen>
  );
}

function Sent({ instrument: i, zone }: { instrument: Instrument; zone: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const g = i.gift!;
  const receipt = useReceipt(g.orderId ?? undefined).data;
  const [picking, setPicking] = useState(false);
  const [when, setWhen] = useState(() => new Date(g.sendAt ?? Date.now() + 3600_000));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const claimed = !!g.claimedAt;
  const ended = i.status === 'voided' || g.delivery === 'cancelled';
  // WP-8: the face shows the value bought — the receipt total, or the unclaimed balance until the receipt loads.
  const amountCents = receipt?.totalCents ?? i.balanceCents;

  async function call(path: string, body: object, done?: string) {
    setBusy(true);
    setFailed(false);
    try {
      await session.authed(path, { method: 'POST', body });
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      if (done) toast({ tone: 'success', message: done });
      setPicking(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  let footer: ReactNode;
  if (!claimed && !ended) {
    footer = picking ? (
      <Button size="lg" fullWidth loading={busy} onPress={() => call(`/v1/wallet/gifts/${i.id}/send-time`, { sendAt: when.toISOString() })}>
        {t('gc.changeTime')}
      </Button>
    ) : (
      <View style={styles.row}>
        {g.delivery === 'scheduled' ? (
          <View style={styles.flex}>
            <Button variant="secondary" fullWidth onPress={() => setPicking(true)}>
              {t('gc.changeTime')}
            </Button>
          </View>
        ) : null}
        <View style={styles.flex}>
          {g.delivery === 'scheduled' ? (
            <Button variant="secondary" fullWidth loading={busy} onPress={() => call(`/v1/wallet/gifts/${i.id}/send-time`, { sendAt: null })}>
              {t('gc.sendNow')}
            </Button>
          ) : (
            <Button variant="secondary" fullWidth loading={busy} onPress={() => call(`/v1/wallet/gifts/${i.id}/resend`, {}, t('gc.resent'))}>
              {t('gc.resend')}
            </Button>
          )}
        </View>
      </View>
    );
  }

  return (
    <Screen topInset={false} footer={footer}>
      {amountCents != null ? (
        <GiftFace amount={amountCents / 100} recipient={g.recipientName} status={sentGiftStatus(i)} code={t('gc.sentByText')} design={g.design || undefined} />
      ) : null}
      {g.delivery === 'failed' && !ended ? <Banner tone="danger" title={t('gc.failed')} /> : null}
      <ListGroup>
        {g.delivery === 'scheduled' || g.sentAt ? (
          <ListRow
            icon="clock"
            title={g.delivery === 'scheduled' ? t('gc.sends') : t('gc.sent')}
            subtitle={g.delivery === 'scheduled' && g.sendAt ? clinicDateTime(g.sendAt, zone) : g.sentAt ? clinicDateTime(g.sentAt, zone) : undefined}
            chevron={false}
          />
        ) : null}
        <ListRow icon="chat-circle-text" title={t('gc.to')} subtitle={`${g.recipientName} · ${g.recipientPhoneMasked}`} chevron={false} />
        {claimed ? <ListRow icon="check-circle" title={t('gc.claimed')} subtitle={clinicDateTime(g.claimedAt!, zone)} chevron={false} /> : null}
        {g.orderId ? (
          <ListRow
            icon="receipt"
            title={t('gc.receipt')}
            value={receipt ? cents(receipt.totalCents) : undefined}
            onPress={() => router.push({ pathname: '/pay/receipt/[id]', params: { id: g.orderId! } })}
          />
        ) : null}
      </ListGroup>
      {picking ? <SendTimePicker label={t('gift.sendOn')} value={when} onChange={setWhen} zone={zone} /> : null}
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
      {!claimed && !ended ? (
        <Text variant="caption" tone="inkMuted">
          {t('gc.untilClaimed')}
        </Text>
      ) : null}
      <HelpLink onPress={() => router.push({ pathname: '/support/contact', params: { topic: t('gc.topic') } })}>{t('gc.problem')}</HelpLink>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space['3'] },
});
