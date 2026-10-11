import type { Visit, VisitsResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppointmentPass, Banner, Button, ListGroup, ListRow, useToast } from '../../../components';
import { VisitGate } from '../../../booking/VisitGate';
import { addVisitToCalendar, careBeforeCount, isLate, lateBannerText, passStatus } from '../../../booking/visits';
import { useCatalog } from '../../../content/queries';
import { t } from '../../../i18n';
import { clinicDay, clinicTime, money } from '../../../i18n/format';
import { useSettings } from '../../../settings/useSettings';

/** `/visits/[id]` — VIS-02 (early, late, requested) and VIS-07 (completed, missed), hand-off mode (BOOK 18, 19). */
export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('visit.title') }} />
      <VisitGate id={id} footer={(visit, data, offline) => <Actions visit={visit} data={data} offline={offline} />}>
        {(visit, data, offline) => <Detail visit={visit} data={data} offline={offline} />}
      </VisitGate>
    </>
  );
}

function useVisitState(visit: Visit, data: VisitsResponse) {
  const bootstrap = useSettings().data?.data;
  const settings = bootstrap?.settings;
  const [now] = useState(() => Date.now());
  const hours = settings?.freeChangeHours ?? 48;
  const upcoming = data.upcoming.some((v) => v.id === visit.id);
  const service = useCatalog().data?.data.services.find((s) => s.id === visit.serviceId);
  return { bootstrap, settings, hours, upcoming, late: upcoming && isLate(visit, hours, now), service };
}

/** Fixed footer (VIS-02 / VIS-07). Changes go through the hand-off screens so each one is recorded (BV-5). */
function Actions({ visit, data, offline }: { visit: Visit; data: VisitsResponse; offline: boolean }) {
  const router = useRouter();
  const { hours, upcoming, late, service } = useVisitState(visit, data);
  const lateChange = `/visits/${visit.id}/late-change` as Href;
  if (!upcoming) {
    return service?.status === 'live' ? (
      <Button size="lg" fullWidth icon="calendar-plus" onPress={() => router.push({ pathname: '/book/service', params: { service: service.id } })}>
        {t('visit.bookAgain')}
      </Button>
    ) : null;
  }
  if (visit.openRequest) return null;
  if (late) {
    return (
      <Button size="lg" fullWidth icon="phone" disabled={offline} onPress={() => router.push(lateChange)}>
        {t('visit.contactClinic')}
      </Button>
    );
  }
  return (
    <View style={styles.actions}>
      <Button
        variant="secondary"
        fullWidth
        iconAfter="arrow-square-out"
        disabled={offline}
        onPress={() => router.push(visit.serviceId ? { pathname: '/book/how-it-works', params: { service: visit.serviceId } } : '/book/how-it-works')}
      >
        {t('visit.changeFresha')}
      </Button>
      <Button variant="tertiary" fullWidth disabled={offline} onPress={() => router.push(lateChange)}>
        {t('visit.askClinic', { hours })}
      </Button>
    </View>
  );
}

function Detail({ visit, data, offline }: { visit: Visit; data: VisitsResponse; offline: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { bootstrap, settings, hours, upcoming, late, service } = useVisitState(visit, data);
  const zone = bootstrap?.clinic.timezone ?? 'America/Vancouver';
  const request = visit.openRequest;

  const calendar = async () => {
    const result = await addVisitToCalendar(visit, bootstrap?.clinic.address ?? t('pass.location'));
    if (result !== 'opened') toast({ tone: 'warning', message: t(result === 'denied' ? 'cal.denied' : 'cal.unavailable') });
  };

  return (
    <>
      {offline ? (
        <Banner tone="offline" title={t('offline.title')}>
          {t('offline.banner')}
        </Banner>
      ) : null}
      <AppointmentPass
        service={visit.detail ? `${visit.serviceName} · ${visit.detail}` : visit.serviceName}
        date={clinicDay(visit.startsAt, zone)}
        time={clinicTime(visit.startsAt, zone)}
        provider={visit.professional}
        status={passStatus(visit)}
        eyebrow={upcoming ? t('pass.yourVisit') : t('pass.past')}
        onAddToCalendar={upcoming ? calendar : undefined}
      />

      {/* Banners sit below the pass (VIS-02, VIS-07). */}
      {upcoming && request ? (
        <Banner tone="info" title={t('visit.requested.title')}>
          {t(request.type === 'cancel' ? 'visit.requested.cancel' : 'visit.requested.change')}
        </Banner>
      ) : late && settings ? (
        <Banner tone="warning" title={t('visit.late.title', { hours })}>
          {lateBannerText(settings, visit.depositCAD)}
        </Banner>
      ) : upcoming && visit.source === 'fresha_sync' ? (
        <Banner tone="info" title={t('visit.handoff.title')}>
          {t('visit.handoff.body')}
        </Banner>
      ) : null}
      {visit.status === 'noshow' ? (
        <Banner tone="warning" title={t('visit.missed.title')}>
          {visit.depositCAD ? t('visit.missed.body', { deposit: money(visit.depositCAD) }) : t('visit.missed.bodyNoAmount')}
        </Banner>
      ) : null}

      <ListGroup>
        {upcoming && service?.care.length ? (
          <ListRow
            icon="calendar-check"
            title={t('visit.care')}
            subtitle={t('visit.careSub', { count: careBeforeCount(service.care) })}
            onPress={() => router.push(`/care/${visit.id}` as Href)}
          />
        ) : null}
        {visit.status === 'completed' && service?.care.length ? (
          <ListRow icon="first-aid-kit" title={t('visit.aftercare')} subtitle={t('visit.aftercareSub')} onPress={() => router.push(`/care/${visit.id}` as Href)} />
        ) : null}
        <ListRow
          icon="question"
          title={t('visit.help')}
          subtitle={t('visit.helpSub', { ref: visit.ref })}
          onPress={() => router.push({ pathname: '/support/contact', params: { reference: visit.ref, topic: t('visit.topic') } })}
        />
      </ListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space['1'] },
});
