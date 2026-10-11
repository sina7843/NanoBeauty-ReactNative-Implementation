import type { Visit } from '@nano/contracts';
import { Redirect, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { AsyncStatus, Button } from '../../../components';
import { VisitGate } from '../../../booking/VisitGate';
import { t } from '../../../i18n';
import { clinicDay } from '../../../i18n/format';
import { useSettings } from '../../../settings/useSettings';

/**
 * `/visits/[id]/cancelled` — VIS-05 (opened from NTF-04). Shown only for a visit the booking source reports as
 * cancelled (truth first); any other visit goes to its detail screen.
 */
export default function VisitCancelled() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('cancelled.title') }} />
      <VisitGate id={id}>{(visit) => <Cancelled visit={visit} />}</VisitGate>
    </>
  );
}

function Cancelled({ visit }: { visit: Visit }) {
  const router = useRouter();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  if (visit.status !== 'cancelled') return <Redirect href={`/visits/${visit.id}` as Href} />;
  // VIS-05: AsyncStatus success with the reference, primary "Book another time", tertiary "Back to visits".
  return (
    <AsyncStatus
      state="success"
      title={t('cancelled.title')}
      reference={visit.ref}
      actions={
        <>
          <Button size="lg" fullWidth onPress={() => router.push(visit.serviceId ? { pathname: '/book/service', params: { service: visit.serviceId } } : '/book/service')}>
            {t('cancelled.again')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={() => router.replace('/visits')}>
            {t('cancelled.back')}
          </Button>
        </>
      }
    >
      {t('cancelled.body', { service: visit.serviceName, date: clinicDay(visit.startsAt, zone) })}
    </AsyncStatus>
  );
}
