import type { Visit, VisitsResponse } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { setReturnTo } from '../../auth/flow';
import { AppointmentPass, Banner, Button, EmptyState, IconButton, ListGroup, ListRow, Screen, SegmentedControl, Skeleton, Text, useToast } from '../../components';
import { NotSynced } from '../../booking/NotSynced';
import { addVisitToCalendar, passStatus, syncNote, useVisits } from '../../booking/visits';
import { t } from '../../i18n';
import { clinicDate, clinicDateLong, clinicDay, clinicTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';

/** VIS-01 (upcoming, past, empty, guest, offline; synced / not synced). Every Home, Treatments and Visits screen carries one Book button (D28). */
export default function Visits() {
  const router = useRouter();
  const { status } = useAuth();
  return (
    <Screen
      tabbed
      title={t('tab.visits')}
      trailing={<IconButton icon="user-circle" label={t('nav.account')} variant="tonal" onPress={() => router.push('/account')} />}
      fab={
        <Button icon="calendar-plus" onPress={() => router.push('/book/service')}>
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
        {data.sync === 'not_connected' ? <NotSynced /> : <Lists data={data} zone={zone} note={syncNote(data, source === 'cache', zone)} />}
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

function Lists({ data, zone, note }: { data: VisitsResponse; zone: string; note: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const address = useSettings().data?.data.clinic.address ?? t('pass.location');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const open = (v: Visit) => router.push(`/visits/${v.id}` as Href);
  // Past list (VIS-01): grouped under a year header, so the date drops the year; "Done" / "Missed" / "Cancelled".
  const pastRow = (v: Visit) => {
    const date = clinicDate(v.startsAt, zone, Date.parse(v.startsAt));
    const when = v.professional ? t('vis.withPro', { date, pro: v.professional }) : date;
    return (
      <ListRow
        key={v.id}
        icon={v.status === 'completed' ? 'check-circle' : 'calendar-x'}
        title={v.serviceName}
        subtitle={v.detail ? `${v.detail} · ${when}` : when}
        value={t(v.status === 'completed' ? 'status.done' : `status.${v.status}`)}
        onPress={() => open(v)}
      />
    );
  };
  const years = [...new Set(data.past.map((v) => clinicDateLong(v.startsAt, zone).slice(-4)))];
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
            {note ? (
              <Text variant="caption" tone="inkMuted">
                {note}
              </Text>
            ) : null}
            <AppointmentPass
              service={next.serviceName}
              date={clinicDay(next.startsAt, zone)}
              time={clinicTime(next.startsAt, zone)}
              provider={next.professional}
              status={passStatus(next)}
              eyebrow={t('pass.next')}
              onAddToCalendar={() => calendar(next)}
              onManage={() => open(next)}
            />
            {/* Later visits: compact passes, eyebrow "Upcoming" (VIS-01). */}
            {later.map((v) => (
              <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={`${v.serviceName}, ${clinicDay(v.startsAt, zone)} ${clinicTime(v.startsAt, zone)}`} onPress={() => open(v)}>
                <AppointmentPass
                  compact
                  service={v.serviceName}
                  date={clinicDay(v.startsAt, zone)}
                  time={clinicTime(v.startsAt, zone)}
                  provider={v.professional}
                  status={passStatus(v)}
                  eyebrow={t('pass.upcoming')}
                />
              </Pressable>
            ))}
          </>
        ) : (
          <EmptyState
            icon="calendar-blank"
            title={t('vis.empty.title')}
            actions={
              <Button fullWidth onPress={() => router.push('/book/service')}>
                {t('vis.bookTreatment')}
              </Button>
            }
          >
            {t('vis.empty.body')}
          </EmptyState>
        )
      ) : data.past.length ? (
        years.map((year) => (
          <ListGroup key={year} header={year}>
            {data.past.filter((v) => clinicDateLong(v.startsAt, zone).endsWith(year)).map(pastRow)}
          </ListGroup>
        ))
      ) : (
        <EmptyState icon="clock-counter-clockwise" title={t('vis.past')} />
      )}
    </>
  );
}
