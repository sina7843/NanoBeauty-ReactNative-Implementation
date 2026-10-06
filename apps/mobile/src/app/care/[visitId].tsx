import { Stack, useLocalSearchParams } from 'expo-router';
import { Badge, CareTimeline, EmptyState, Screen, Text, UrgentLine } from '../../components';
import { VisitGate } from '../../booking/VisitGate';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { clinicDate } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';

/** `/care/[visitId]` — CAR-01. The treatment's clinic-approved care steps, for this visit; no invented advice. */
export default function Care() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const services = useCatalog().data?.data.services;
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen topInset={false}>
        <VisitGate id={visitId}>
          {(visit) => {
            const service = services?.find((s) => s.id === visit.serviceId);
            return (
              <>
                <Text variant="displayMd" accessibilityRole="header">
                  {t('care.title', { name: visit.serviceName })}
                </Text>
                <Text variant="body" tone="inkMuted">
                  {t('care.forVisit', { date: clinicDate(visit.startsAt, zone) })}
                </Text>
                {service?.sample ? <Badge tone="sample">{t('care.sample')}</Badge> : null}
                {service?.care.length ? <CareTimeline steps={service.care} /> : <EmptyState icon="first-aid-kit" title={t('care.sample')} />}
                <UrgentLine text={t('care.urgent')} />
              </>
            );
          }}
        </VisitGate>
      </Screen>
    </>
  );
}
