import { customerProfileSchema } from '@nano/contracts';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '../../../../auth/AuthProvider';
import { Badge, Banner, ListGroup, ListRow, Skeleton, Text } from '../../../../components';
import { t } from '../../../../i18n';
import { calendarDate, clinicDate } from '../../../../i18n/format';
import { useSettings } from '../../../../settings/useSettings';
import { useStaffQuery } from '../../../../staff/api';
import { StaffScreen } from '../../../../staff/StaffScreen';

/** `/staff/customers/[id]` — STF-27: visits, Wallet value from the ledger, offers consent, open account check. */
export default function CustomerProfile() {
  const router = useRouter();
  const { me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const profile = useStaffQuery(['customer', id], `/v1/staff/customers/${id}`, customerProfileSchema, !!id);
  const p = profile.data;
  return (
    <StaffScreen title={t('stf.customers')} back={{ to: '/staff/customers', label: t('stf.customers') }}>
      {p ? (
        <>
          <Text variant="titleLg">{p.name ?? p.phone}</Text>
          <Text variant="caption" tone="inkMuted">
            {[p.phone, p.email, t('cust.since', { date: calendarDate(p.since.slice(0, 10)) })].filter(Boolean).join(' · ')}
          </Text>
          <Badge tone={p.offers ? 'success' : 'neutral'}>{p.offers ? t('cust.offersYes') : t('cust.offersNo')}</Badge>
          {p.openMatchCase && me?.permissions.includes('accountMatch.resolve') ? (
            <ListGroup>
              <ListRow title={t('cust.match')} subtitle={p.openMatchCase.reference} onPress={() => router.push(`/staff/customers/${p.id}/match?case=${p.openMatchCase!.id}` as Href)} />
            </ListGroup>
          ) : null}
          <ListGroup header={t('cust.value')} footer={p.value.length ? undefined : t('redeem.none')}>
            {p.value.map((v) => (
              <ListRow key={v.id} title={v.label} value={v.value} chevron={false} />
            ))}
          </ListGroup>
          <ListGroup header={t('cust.visits')} footer={p.visits.length ? undefined : t('today.noVisits')}>
            {p.visits.map((v) => (
              <ListRow key={v.ref} title={v.service} subtitle={[clinicDate(v.at, tz), v.professional, v.status].filter(Boolean).join(' · ')} chevron={false} />
            ))}
          </ListGroup>
          {p.lastMessage ? (
            <ListGroup header={t('cust.lastMessage')}>
              <ListRow title={p.lastMessage} chevron={false} />
            </ListGroup>
          ) : null}
        </>
      ) : profile.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={6} media={false} />
      )}
    </StaffScreen>
  );
}
