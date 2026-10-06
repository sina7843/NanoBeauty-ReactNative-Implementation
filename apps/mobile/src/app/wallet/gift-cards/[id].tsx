import type { Instrument } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { Banner, Button, ListGroup, ListRow, Screen, Text, useToast } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { InstrumentGate, LedgerLines, shown } from '../../../payments/InstrumentView';
import { SendTimePicker } from '../../../payments/SendTimePicker';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/gift-cards/[id]` — WAL-04 (mine, sent). The sender sees delivery, never how a claimed card is spent. */
export default function GiftCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  return (
    <>
      <Stack.Screen options={{ title: t('gc.title') }} />
      <Screen topInset={false}>
        <InstrumentGate id={id}>
          {({ instrument, lines }) =>
            instrument.role === 'sender' ? (
              <Sent instrument={instrument} zone={zone} />
            ) : (
              <Mine instrument={instrument} lines={lines} zone={zone} />
            )
          }
        </InstrumentGate>
      </Screen>
    </>
  );
}

function Mine({ instrument: i, lines, zone }: { instrument: Instrument; lines: Parameters<typeof LedgerLines>[0]['lines']; zone: string }) {
  const router = useRouter();
  return (
    <>
      <Text variant="displayMd" accessibilityRole="header">
        {shown(i)}
      </Text>
      {i.last4 ? (
        <Text variant="body" tone="inkMuted">{`•••• ${i.last4}`}</Text>
      ) : null}
      <Text variant="body">{t('gc.terms')}</Text>
      <LedgerLines lines={lines} zone={zone} />
      <Button onPress={() => router.push('/book/service')}>{t('wal.book')}</Button>
      <Button variant="tertiary" onPress={() => router.push({ pathname: '/wallet/help', params: { id: i.id } })}>
        {t('gc.problem')}
      </Button>
    </>
  );
}

function Sent({ instrument: i, zone }: { instrument: Instrument; zone: string }) {
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const g = i.gift!;
  const [picking, setPicking] = useState(false);
  const [when, setWhen] = useState(() => new Date(g.sendAt ?? Date.now() + 3600_000));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const claimed = !!g.claimedAt;

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

  return (
    <>
      <Text variant="titleLg" accessibilityRole="header">
        {t('wal.giftSent', { name: g.recipientName })}
      </Text>
      <ListGroup>
        <ListRow title={t('gc.to')} subtitle={`${g.recipientName} · ${g.recipientPhoneMasked}`} chevron={false} />
        <ListRow
          title={g.delivery === 'scheduled' ? t('gc.sends') : t('gc.sent')}
          subtitle={g.delivery === 'scheduled' && g.sendAt ? clinicDateTime(g.sendAt, zone) : g.sentAt ? clinicDateTime(g.sentAt, zone) : undefined}
          chevron={false}
        />
        {claimed ? <ListRow title={t('gc.claimed')} subtitle={clinicDateTime(g.claimedAt!, zone)} chevron={false} /> : null}
      </ListGroup>
      {g.delivery === 'failed' ? <Banner tone="danger" title={t('gc.failed')} /> : null}
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
      {!claimed ? (
        <>
          <Text variant="caption" tone="inkMuted">
            {t('gc.untilClaimed')}
          </Text>
          {g.delivery === 'scheduled' ? (
            picking ? (
              <>
                <SendTimePicker label={t('gift.sendOn')} value={when} onChange={setWhen} zone={zone} />
                <Button loading={busy} onPress={() => call(`/v1/wallet/gifts/${i.id}/send-time`, { sendAt: when.toISOString() })}>
                  {t('gc.changeTime')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onPress={() => setPicking(true)}>
                  {t('gc.changeTime')}
                </Button>
                <Button variant="tertiary" loading={busy} onPress={() => call(`/v1/wallet/gifts/${i.id}/send-time`, { sendAt: null })}>
                  {t('gc.sendNow')}
                </Button>
              </>
            )
          ) : (
            <Button variant="secondary" loading={busy} onPress={() => call(`/v1/wallet/gifts/${i.id}/resend`, {}, t('gc.resent'))}>
              {t('gc.resend')}
            </Button>
          )}
        </>
      ) : null}
    </>
  );
}
