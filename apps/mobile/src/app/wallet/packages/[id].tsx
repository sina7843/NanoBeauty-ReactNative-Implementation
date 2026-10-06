import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Banner, Button, Screen, Text } from '../../../components';
import { t } from '../../../i18n';
import { clinicDate } from '../../../i18n/format';
import { InstrumentGate, LedgerLines, Terms } from '../../../payments/InstrumentView';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/packages/[id]` — WAL-03 (active, expiring, expired, used). Archived packages stay usable (WALT 05/06). */
export default function PackageScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [now] = useState(() => Date.now());
  return (
    <>
      <Stack.Screen options={{ title: t('pkg.title') }} />
      <Screen topInset={false}>
        <InstrumentGate id={id}>
          {({ instrument: i, lines, terms }) => {
            const s = i.sessions;
            const expired = !!i.expiresAt && Date.parse(i.expiresAt) <= now;
            return (
              <>
                <Text variant="titleLg" accessibilityRole="header">
                  {i.label}
                </Text>
                {s ? <Text variant="displayMd">{t('wal.sessionsLeft', { remaining: s.remaining, total: s.total })}</Text> : null}
                {i.expiresAt && !expired ? (
                  <Text variant="body" tone="inkMuted">
                    {t('wal.useBy', { date: clinicDate(i.expiresAt, zone) })}
                  </Text>
                ) : null}
                {i.status === 'reconciling' ? (
                  <Banner tone="info" title={t('wal.reconciling')}>
                    {t('wal.reconcilingNote')}
                  </Banner>
                ) : null}
                {expired && s && s.remaining > 0 ? (
                  <Banner tone="warning" title={t('pkg.endedTitle')}>
                    {t('pkg.endedBody', { count: s.remaining, date: clinicDate(i.expiresAt!, zone) })}
                  </Banner>
                ) : s && s.remaining === 0 ? (
                  <Banner tone="info" title={t('pkg.usedUpTitle')}>
                    {t('pkg.usedUpBody', { total: s.total })}
                  </Banner>
                ) : null}
                <LedgerLines lines={lines} zone={zone} header={t('pkg.used')} />
                <Terms terms={terms} />
                {i.status === 'ended' ? (
                  <Button variant="secondary" onPress={() => router.push('/wallet/buy-package')}>
                    {t('pkg.buyAgain')}
                  </Button>
                ) : (
                  <Button onPress={() => router.push('/book/service')}>{t('wal.book')}</Button>
                )}
                <Button variant="tertiary" onPress={() => router.push({ pathname: '/wallet/help', params: { id: i.id } })}>
                  {t('wal.problem')}
                </Button>
              </>
            );
          }}
        </InstrumentGate>
      </Screen>
    </>
  );
}
