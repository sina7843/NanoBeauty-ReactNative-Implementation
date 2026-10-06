import { reportsSchema } from '@nano/contracts';
import { useState } from 'react';
import { Banner, ListGroup, ListRow, SegmentedControl, Skeleton } from '../../components';
import { t } from '../../i18n';
import { money } from '../../i18n/format';
import { useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';

const PERIODS = ['week', 'month', 'all'] as const;
type Metric = { value: number | null; unavailable: string | null };

/** `/staff/reports` — STF-37. Only numbers the server really has; anything else says why it isn't available. */
export default function Reports() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('month');
  const r = useStaffQuery(['reports', period], `/v1/staff/reports?period=${period}`, reportsSchema);
  const d = r.data;
  const metric = (title: string, m: Metric) => <ListRow key={title} title={title} value={m.value === null ? t('rep.na') : String(m.value)} subtitle={m.unavailable ?? undefined} chevron={false} />;
  return (
    <StaffScreen title={t('stf.reports')}>
      <SegmentedControl label={t('stf.reports')} options={PERIODS.map((p) => t(`rep.${p}`))} value={t(`rep.${period}`)} onChange={(v) => setPeriod(PERIODS.find((p) => t(`rep.${p}`) === v)!)} />
      {d ? (
        <>
          <ListGroup>
            {metric(t('rep.bookingsStarted'), d.bookingsStarted)}
            {metric(t('rep.bookingsCompleted'), d.bookingsCompleted)}
            <ListRow title={t('rep.giftCards')} value={t('rep.count', { count: d.giftCards.count, amount: money(d.giftCards.cents / 100) })} chevron={false} />
            <ListRow title={t('rep.packages')} value={t('rep.count', { count: d.packages.count, amount: money(d.packages.cents / 100) })} chevron={false} />
            <ListRow title={t('rep.refunds')} value={money(d.refundsCents / 100)} chevron={false} />
          </ListGroup>
          <ListGroup header={t('rep.promo')} footer={d.promoCodes.length ? undefined : t('stf.nothingHere')}>
            {d.promoCodes.map((p) => (
              <ListRow key={p.code} title={p.code} value={String(p.uses)} chevron={false} />
            ))}
          </ListGroup>
          {d.campaigns.map((c) => (
            <ListGroup key={c.id} header={c.title}>
              {metric(t('rep.views'), c.views)}
              {metric(t('rep.taps'), c.taps)}
              {metric(t('rep.bookings'), c.bookings)}
            </ListGroup>
          ))}
        </>
      ) : r.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={6} media={false} />
      )}
    </StaffScreen>
  );
}
