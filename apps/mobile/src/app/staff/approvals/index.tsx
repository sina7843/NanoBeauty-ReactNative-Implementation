import { approvalsResponseSchema } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { Banner, Button, EmptyState, ListGroup, ListRow, Skeleton } from '../../../components';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/**
 * `/staff/approvals` — STF-08 (waiting, empty). The queue holds Editors' submissions and, with a second approver on,
 * Owners' price changes; otherwise the Owner publishes directly after a confirm step (D35).
 */
export default function Approvals() {
  const router = useRouter();
  const q = useStaffQuery(['approvals'], '/v1/staff/approvals', approvalsResponseSchema);
  const zone = 'America/Vancouver';
  return (
    <StaffScreen title={t('appr.title')}>
      {!q.data ? (
        q.isError ? (
          <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => q.refetch()}>{t('error.retry')}</Button>}>
            {t('error.body')}
          </Banner>
        ) : (
          <Skeleton lines={4} media={false} />
        )
      ) : (
        <>
          {!q.data.secondApprover ? (
            <Banner tone="info" title={t('appr.offTitle')}>
              {t('appr.offBody')}
            </Banner>
          ) : null}
          {q.data.waiting.length ? (
            <ListGroup header={t('appr.waiting', { count: q.data.waiting.length })}>
              {q.data.waiting.map((a) => (
                <ListRow
                  key={a.id}
                  title={a.itemName}
                  subtitle={`${a.summary} · ${t('appr.by', { name: a.submittedBy })}`}
                  onPress={() => router.push(`/staff/approvals/${a.id}` as Href)}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState icon="check-circle" title={t('appr.empty')} />
          )}
          {q.data.recent.length ? (
            <ListGroup header={t('appr.recent')}>
              {q.data.recent.map((r) => (
                <ListRow key={`${r.item}-${r.at}`} title={r.item} subtitle={`${t('appr.by', { name: r.by })} · ${clinicDateTime(r.at, zone)}`} chevron={false} />
              ))}
            </ListGroup>
          ) : null}
        </>
      )}
    </StaffScreen>
  );
}
