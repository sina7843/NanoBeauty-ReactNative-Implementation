import type { HistoryItem } from '@nano/contracts';
import { Stack, useRouter } from 'expo-router';
import { SignInGate } from '../../auth/SignInGate';
import { useState } from 'react';
import { Banner, Button, EmptyState, ListGroup, ListRow, Screen, SegmentedControl, Skeleton } from '../../components';
import { t } from '../../i18n';
import { clinicDateLong } from '../../i18n/format';
import { cents, filterHistory, historyKind, useHistory, type HistoryFilter } from '../../payments/queries';
import { useSettings } from '../../settings/useSettings';

/** `/wallet/history` — WAL-06 (WALT 08): purchases, refunds, redemptions and adjustments with references, by month. */
export default function History() {
  return (
    <>
      <Stack.Screen options={{ title: t('hist.title') }} />
      <Screen topInset={false}>
        <SignInGate>
          <List />
        </SignInGate>
      </Screen>
    </>
  );
}

const value = (h: HistoryItem) =>
  h.amountCents !== null
    ? `${h.amountCents > 0 ? '+' : '−'}${cents(Math.abs(h.amountCents))}`
    : h.sessions !== null
      ? `${h.sessions > 0 ? '+' : '−'}${Math.abs(h.sessions)}`
      : undefined;

const ICON = { payment: 'receipt', refund: 'arrow-clockwise', move: 'wallet' } as const;

function List() {
  const router = useRouter();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const history = useHistory();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  if (!history.data) {
    return history.isError ? (
      <Banner
        tone="danger"
        title={t('error.title')}
        action={
          <Button variant="secondary" size="sm" onPress={() => history.refetch()}>
            {t('error.retry')}
          </Button>
        }
      >
        {t('error.body')}
      </Banner>
    ) : (
      <Skeleton lines={4} media={false} />
    );
  }
  if (!history.data.length) return <EmptyState icon="receipt" title={t('hist.empty')} />;
  const months = new Map<string, HistoryItem[]>();
  for (const h of filterHistory(history.data, filter)) {
    const key = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: zone }).format(new Date(h.createdAt));
    months.set(key, [...(months.get(key) ?? []), h]);
  }
  const options = [t('hist.all'), t('hist.payments'), t('hist.refunds')];
  const filters: HistoryFilter[] = ['all', 'payments', 'refunds'];
  return (
    <>
      <SegmentedControl label={t('hist.show')} options={options} value={options[filters.indexOf(filter)]!} onChange={(o) => setFilter(filters[options.indexOf(o)] ?? 'all')} />
      {months.size === 0 ? <EmptyState icon="receipt" title={t('hist.emptyFilter')} /> : null}
      {[...months].map(([month, items]) => (
        <ListGroup key={month} header={month}>
          {items.map((h) => (
            <ListRow
              key={h.id}
              icon={ICON[historyKind(h)]}
              title={h.title}
              subtitle={[clinicDateLong(h.createdAt, zone), h.subtitle, h.reference].filter(Boolean).join(' · ')}
              value={value(h)}
              chevron={!!h.orderId}
              onPress={h.orderId ? () => router.push({ pathname: '/pay/receipt/[id]', params: { id: h.orderId! } }) : undefined}
            />
          ))}
        </ListGroup>
      ))}
    </>
  );
}
