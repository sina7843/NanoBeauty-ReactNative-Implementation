import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Banner, Button, PackageBalance, Screen } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateLong } from '../../../i18n/format';
import { HelpLink, InstrumentGate, LedgerLines, packageState, Terms } from '../../../payments/InstrumentView';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/packages/[id]` — WAL-03 (active, expiring, expired, used). Archived packages stay usable (WALT 05/06). */
export default function PackageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('pkg.title') }} />
      <InstrumentGate id={id}>{(detail) => <Detail {...detail} />}</InstrumentGate>
    </>
  );
}

function Detail({ instrument: i, lines, terms }: Parameters<Parameters<typeof InstrumentGate>[0]['children']>[0]) {
  const router = useRouter();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [now] = useState(() => Date.now());
  const s = i.sessions;
  const state = packageState(i, now);
  const book = () => router.push(i.serviceId ? { pathname: '/book/service', params: { service: i.serviceId } } : '/book/service');
  const footer =
    state === 'expired' ? (
      <Button size="lg" variant="secondary" fullWidth onPress={() => router.push({ pathname: '/support/contact', params: { topic: t('pkg.topic') } })}>
        {t('pkg.contact')}
      </Button>
    ) : state === 'used' ? (
      <Button size="lg" fullWidth onPress={() => router.push('/wallet/buy-package')}>
        {t('pkg.buyAgain')}
      </Button>
    ) : undefined;
  return (
    <Screen topInset={false} footer={footer}>
      {s ? (
        <PackageBalance
          name={i.label}
          total={s.total}
          // Remaining is the server's number; whatever isn't remaining shows as used.
          used={s.total - s.remaining}
          expires={i.expiresAt && state !== 'expired' ? clinicDateLong(i.expiresAt, zone) : undefined}
          status={state === 'used' ? 'active' : state}
          onBook={state === 'active' || state === 'expiring' ? book : undefined}
        />
      ) : null}
      {i.status === 'reconciling' ? (
        <Banner tone="info" title={t('wal.reconciling')}>
          {t('wal.reconcilingNote')}
        </Banner>
      ) : null}
      {state === 'expired' && s ? (
        <Banner tone="neutral" title={t('pkg.endedTitle')}>
          {t('pkg.endedBody', { count: s.remaining, date: clinicDateLong(i.expiresAt!, zone) })}
        </Banner>
      ) : state === 'used' && s ? (
        <Banner tone="success" title={t('pkg.usedUpTitle')}>
          {t('pkg.usedUpBody', { total: s.total })}
        </Banner>
      ) : null}
      {/* WP-5: only sessions actually used, never the purchase line. */}
      <LedgerLines lines={lines.filter((l) => l.kind === 'redeem')} zone={zone} header={t('pkg.used')} icon="check-circle" />
      <Terms terms={terms} label={t('pkg.terms')} />
      <HelpLink onPress={() => router.push({ pathname: '/wallet/help', params: { id: i.id } })}>{t('wal.problem')}</HelpLink>
    </Screen>
  );
}
