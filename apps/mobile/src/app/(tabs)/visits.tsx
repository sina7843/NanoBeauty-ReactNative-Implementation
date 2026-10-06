import type { Visit, VisitsResponse } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { setReturnTo } from '../../auth/flow';
import { AppointmentPass, Banner, Button, EmptyState, ListGroup, ListRow, Screen, SegmentedControl, Skeleton, Text, useToast } from '../../components';
import { NotSynced } from '../../booking/NotSynced';
import { addVisitToCalendar, useVisits } from '../../booking/visits';
import { t } from '../../i18n';
import { clinicDate, clinicTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';

/** VIS-01 (upcoming, past, empty, guest, offline; synced / not synced). Every Home, Treatments and Visits screen carries one Book button (D28). */
export default function Visits() {
  const router = useRouter();
  const { status } = useAuth();
  return (
    <Screen
      tabbed
      title={t('tab.visits')}
      footer={
        <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
          {t('home.book')}
        </Button>
      }
    >
      {status === 'guest' ? (
        <EmptyState
          icon="calendar-blank"
          title={t('vis.guest.title')}
          actions={
            <Button
              variant="secondary"
              fullWidth
              onPress={() => {
                setReturnTo('/visits');
                router.push('/auth/phone');
              }}
            >
              {t('home.signIn')}
            </Button>
          }
        >
          {t('vis.guest.body')}
        </EmptyState>
      ) : status === 'signedIn' ? (
        <SignedIn />
      ) : null}
    </Screen>
  );
}

function SignedIn() {
  const visits = useVisits();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  if (visits.data) {
    const { data, source, savedAt } = visits.data;
    return (
      <>
        {source === 'cache' ? (
          <Banner tone="offline" title={t('offline.title')}>
            {t('vis.offline', { time: clinicTime(savedAt, zone) })}
          </Banner>
        ) : null}
        {data.sync === 'not_connected' ? <NotSynced freshaUrl={data.freshaUrl} /> : <Lists data={data} zone={zone} />}
      </>
    );
  }
  if (visits.isError) {
    return (
      <Banner
        tone="danger"
        title={t('error.title')}
        action={
          <Button variant="secondary" size="sm" onPress={() => visits.refetch()}>
            {t('error.retry')}
          </Button>
        }
      >
        {t('error.body')}
      </Banner>
    );
  }
  return <Skeleton lines={3} />;
}

function Lists({ data, zone }: { data: VisitsResponse; zone: string }) {
  const router = useRouter();
  const toast = useToast();
  const address = useSettings().data?.data.clinic.address ?? t('pass.location');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const open = (v: Visit) => router.push(`/visits/${v.id}` as Href);
  const row = (v: Visit) => (
    <ListRow
      key={v.id}
      icon={v.status === 'cancelled' ? 'calendar-x' : 'calendar-check'}
      title={v.serviceName}
      subtitle={
        v.detail && v.professional
          ? t('vis.rowSub', { detail: v.detail, date: clinicDate(v.startsAt, zone), pro: v.professional })
          : t('vis.rowSubShort', { date: `${clinicDate(v.startsAt, zone)}, ${clinicTime(v.startsAt, zone)}` })
      }
      value={t(`status.${v.status}`)}
      onPress={() => open(v)}
    />
  );
  const [next, ...later] = data.upcoming;
  const calendar = async (v: Visit) => {
    const result = await addVisitToCalendar(v, address);
    if (result !== 'opened') toast({ tone: 'warning', message: t(result === 'denied' ? 'cal.denied' : 'cal.unavailable') });
  };

  return (
    <>
      <SegmentedControl
        label={t('tab.visits')}
        options={[t('vis.upcoming'), t('vis.past')]}
        value={tab === 'upcoming' ? t('vis.upcoming') : t('vis.past')}
        onChange={(v) => setTab(v === t('vis.past') ? 'past' : 'upcoming')}
      />
      {tab === 'upcoming' ? (
        next ? (
          <>
            <Text variant="caption" tone="inkMuted">
              {t('vis.syncNote')}
            </Text>
            <AppointmentPass
              service={next.serviceName}
              date={clinicDate(next.startsAt, zone)}
              time={clinicTime(next.startsAt, zone)}
              provider={next.professional}
              status={next.status}
              eyebrow={t('pass.next')}
              onAddToCalendar={() => calendar(next)}
              onManage={() => open(next)}
            />
            {later.length ? <ListGroup header={t('pass.upcoming')}>{later.map(row)}</ListGroup> : null}
          </>
        ) : (
          <EmptyState
            icon="calendar-blank"
            title={t('vis.empty.title')}
            actions={
              <Button variant="secondary" fullWidth onPress={() => router.push('/book/service')}>
                {t('vis.bookTreatment')}
              </Button>
            }
          >
            {t('vis.empty.body')}
          </EmptyState>
        )
      ) : data.past.length ? (
        <ListGroup>{data.past.map(row)}</ListGroup>
      ) : (
        <EmptyState icon="clock-counter-clockwise" title={t('vis.past')} />
      )}
    </>
  );
}
