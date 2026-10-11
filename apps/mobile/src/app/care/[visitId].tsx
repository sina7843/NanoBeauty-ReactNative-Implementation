import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, CareTimeline, EmptyState, Text, UrgentLine } from '../../components';
import { VisitGate } from '../../booking/VisitGate';
import { careProgress } from '../../booking/visits';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { clinicDay } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';

/** `/care/[visitId]` — CAR-01. The treatment's clinic-approved care steps, for this visit; no invented advice. */
export default function Care() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const services = useCatalog().data?.data.services;
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [now] = useState(() => Date.now());
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <VisitGate id={visitId}>
        {(visit) => {
          const service = services?.find((s) => s.id === visit.serviceId);
          return (
            <>
              {/* The heading lives in the top bar (CAR-01). */}
              <Stack.Screen options={{ title: t('care.title', { name: visit.serviceName }) }} />
              <View style={styles.row}>
                <Text variant="body" tone="inkMuted" style={styles.flex}>
                  {t('care.forVisit', { date: clinicDay(visit.startsAt, zone) })}
                </Text>
                {service?.sample ? <Badge tone="sample">{t('care.sample')}</Badge> : null}
              </View>
              {service?.care.length ? (
                <CareTimeline steps={careProgress(service.care, visit.startsAt, zone, now)} />
              ) : (
                <EmptyState icon="first-aid-kit" title={t('care.sample')} />
              )}
              <UrgentLine text={t('care.urgent')} />
            </>
          );
        }}
      </VisitGate>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space['2'] },
});
