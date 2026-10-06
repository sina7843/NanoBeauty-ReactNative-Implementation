import type { Visit, VisitsResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppointmentPass, Banner, Button, ListGroup, ListRow, Screen, useToast } from '../../../components';
import { VisitGate } from '../../../booking/VisitGate';
import { addVisitToCalendar, isLate, lateBannerText } from '../../../booking/visits';
import { useCatalog } from '../../../content/queries';
import { t } from '../../../i18n';
import { clinicDate, clinicTime, money } from '../../../i18n/format';
import { useSettings } from '../../../settings/useSettings';

/** `/visits/[id]` — VIS-02 (early, late, requested) and VIS-07 (completed, missed), hand-off mode (BOOK 18, 19). */
export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('visit.title') }} />
      <Screen topInset={false}>
        <VisitGate id={id}>{(visit, data, offline) => <Detail visit={visit} data={data} offline={offline} />}</VisitGate>
      </Screen>
    </>
  );
}

function Detail({ visit, data, offline }: { visit: Visit; data: VisitsResponse; offline: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const bootstrap = useSettings().data?.data;
  const settings = bootstrap?.settings;
  const zone = bootstrap?.clinic.timezone ?? 'America/Vancouver';
  const service = useCatalog().data?.data.services.find((s) => s.id === visit.serviceId);
  const [now] = useState(() => Date.now());
  const hours = settings?.freeChangeHours ?? 48;
  const upcoming = data.upcoming.some((v) => v.id === visit.id);
  const late = upcoming && isLate(visit, hours, now);
  const request = visit.openRequest;
  const lateChange = `/visits/${visit.id}/late-change` as Href;

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
        <Banner tone="danger" title={t('visit.missed.title')}>
          {visit.depositCAD ? t('visit.missed.body', { deposit: money(visit.depositCAD) }) : t('visit.missed.bodyNoAmount')}
        </Banner>
      ) : null}

      <AppointmentPass
        service={visit.detail ? `${visit.serviceName} · ${visit.detail}` : visit.serviceName}
        date={clinicDate(visit.startsAt, zone)}
        time={clinicTime(visit.startsAt, zone)}
        provider={visit.professional}
        status={visit.status}
        eyebrow={upcoming ? (visit.source === 'fresha_sync' ? t('pass.fresha') : t('pass.yourVisit')) : t('pass.past')}
        onAddToCalendar={upcoming ? calendar : undefined}
      />

      {upcoming && !request ? (
        <View style={styles.actions}>
          {late ? (
            <Button size="lg" fullWidth icon="phone" disabled={offline} onPress={() => router.push(lateChange)}>
              {t('visit.contactClinic')}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                fullWidth
                iconAfter="arrow-square-out"
                disabled={!data.freshaUrl}
                onPress={() => data.freshaUrl && WebBrowser.openBrowserAsync(data.freshaUrl).catch(() => undefined)}
              >
                {t('visit.changeFresha')}
              </Button>
              <Button variant="tertiary" fullWidth disabled={offline} onPress={() => router.push(lateChange)}>
                {t('visit.askClinic', { hours })}
              </Button>
            </>
          )}
        </View>
      ) : null}

      <ListGroup>
        {upcoming && service?.care.length ? (
          <ListRow icon="first-aid-kit" title={t('visit.care')} subtitle={t('visit.careSub', { count: service.care.length })} onPress={() => router.push(`/care/${visit.id}` as Href)} />
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
        {!upcoming && service?.status === 'live' ? (
          <ListRow icon="calendar-plus" title={t('visit.bookAgain')} onPress={() => router.push({ pathname: '/book/service', params: { service: service.id } })} />
        ) : null}
      </ListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space['2'] },
});
