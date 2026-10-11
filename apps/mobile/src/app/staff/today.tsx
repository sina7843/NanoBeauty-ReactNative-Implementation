import { todaySchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { Banner, Button, ListGroup, ListRow, Skeleton, Text } from '../../components';
import { t } from '../../i18n';
import { clinicDate, clinicTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';
import { useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';

/** `/staff/today` — STF-23. In hand-off mode Fresha is the diary; the app shows its own requests. */
export default function Today() {
  const router = useRouter();
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const today = useStaffQuery(['today'], '/v1/staff/today', todaySchema);
  const d = today.data;
  return (
    <StaffScreen title={t('stf.today')}>
      {d ? (
        <>
          {d.bookingMode === 'handoff' ? <Banner tone="info" title={t('today.handoffTitle')}>
              {t('today.fresha')}
            </Banner> : null}
          <ListGroup header={t('today.appointments', { count: d.visits.length })} footer={d.visits.length ? undefined : t('today.noVisits')}>
            {d.visits.map((v) => (
              <ListRow key={v.id} title={`${clinicTime(v.at, tz)} · ${v.customer}`} subtitle={[v.service, v.professional, v.status].filter(Boolean).join(' · ')} chevron={false} />
            ))}
          </ListGroup>
          <ListGroup header={t('today.requests', { count: d.requests.length })} footer={d.requests.length ? undefined : t('today.noRequests')}>
            {d.requests.map((r) => (
              <ListRow
                key={r.id}
                title={`${r.customer} · ${t(r.type === 'cancel' ? 'req.cancel' : 'req.change')}`}
                subtitle={[`${clinicDate(r.visitAt, tz)} ${clinicTime(r.visitAt, tz)}`, t(`req.status.${r.status}` as 'req.status.done'), r.late ? t('today.late') : null].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/staff/requests/${r.id}` as Href)}
              />
            ))}
          </ListGroup>
        </>
      ) : today.isError ? (
        <Banner
          tone="danger"
          title={t('error.title')}
          action={
            <Button variant="secondary" size="sm" onPress={() => today.refetch()}>
              {t('error.retry')}
            </Button>
          }
        >
          {t('error.body')}
        </Banner>
      ) : (
        <>
          <Text variant="caption" tone="inkMuted">
            {t('today.fresha')}
          </Text>
          <Skeleton lines={4} media={false} />
        </>
      )}
    </StaffScreen>
  );
}
