import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Banner, Button, Screen, Text } from '../../components';
import { t } from '../../i18n';
import { clinicDate } from '../../i18n/format';
import { InstrumentGate, LedgerLines, shown, Terms } from '../../payments/InstrumentView';
import { useSettings } from '../../settings/useSettings';

const SOON_MS = 30 * 24 * 3600_000;

/** `/wallet/credit?id=` — WAL-02 (available, expiring, reconciling). WALT 10: source, adjustments, non-cash. */
export default function Credit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [now] = useState(() => Date.now());
  return (
    <>
      <Stack.Screen options={{ title: t('wal.credit') }} />
      <Screen
        topInset={false}
        footer={
          <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
            {t('wal.book')}
          </Button>
        }
      >
        <InstrumentGate id={id}>
          {({ instrument: i, lines, terms }) => (
            <>
              <Text variant="displayMd" accessibilityRole="header">
                {shown(i)}
              </Text>
              {i.status === 'reconciling' ? (
                <Banner tone="info" title={t('wal.reconciling')}>
                  {t('wal.reconcilingNote')}
                </Banner>
              ) : null}
              {i.expiresAt && i.balanceCents && Date.parse(i.expiresAt) - now < SOON_MS ? (
                <Banner tone="warning" title={t('credit.expiring')}>
                  {t('credit.expiringBody', { date: clinicDate(i.expiresAt, zone), amount: shown(i) })}
                </Banner>
              ) : null}
              <LedgerLines lines={lines} zone={zone} />
              <Terms terms={terms} />
              <Button variant="tertiary" onPress={() => router.push({ pathname: '/wallet/help', params: { id: i.id } })}>
                {t('wal.problem')}
              </Button>
            </>
          )}
        </InstrumentGate>
      </Screen>
    </>
  );
}
