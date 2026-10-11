import { handoffStatusSchema, type HandoffStatus } from '@nano/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Button, Screen, SupportContext } from '../../components';
import { basket } from '../../booking/basket';
import { clearPendingHandoff } from '../../booking/pendingHandoff';
import { hoursLabel } from '../../content/clinic';
import { t } from '../../i18n';
import { clinicDay, clinicTime } from '../../i18n/format';
import { analytics } from '../../lib/analytics';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { useSettings } from '../../settings/useSettings';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_MS = 3000;

/**
 * `/book/fresha-return?handoff=` — BKG-09 (checking, confirmed, notyet, notvisible). Every state comes from the
 * server's Fresha evidence (BOOK 16); returning from the browser alone never shows "booked".
 */
export default function FreshaReturn() {
  const { handoff } = useLocalSearchParams<{ handoff?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
      <Screen topInset={false}>
        <SignInGate>{handoff && UUID.test(handoff) ? <Check id={handoff} /> : <Stale />}</SignInGate>
      </Screen>
    </>
  );
}

/** Unknown, malformed or someone else's hand-off link: drop it and land on Home with the old-link note. */
function Stale() {
  useEffect(() => {
    clearPendingHandoff();
  }, []);
  return <Redirect href={OLD_LINK_HREF} />;
}

function Check({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const settings = useSettings().data?.data;
  const zone = settings?.clinic.timezone ?? 'America/Vancouver';
  const [opened] = useState(() => Date.now());
  const reported = useRef(false);
  const status = useQuery({
    queryKey: ['handoff', id],
    queryFn: async () => handoffStatusSchema.parse((await session.authed(`/v1/bookings/handoffs/${id}`)).body),
    refetchInterval: (q) => ((q.state.data as HandoffStatus | undefined)?.state === 'checking' ? POLL_MS : false),
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
    gcTime: 0,
  });
  const state = status.data?.state;

  useEffect(() => {
    if (!state || state === 'checking') return;
    if (state === 'confirmed') {
      clearPendingHandoff();
      basket.clear();
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    }
    if (reported.current) return;
    reported.current = true;
    analytics.track('handoff_returned', {
      result: state === 'notyet' ? 'not_yet' : state === 'notvisible' ? 'not_visible' : 'confirmed',
      seconds_away: Math.round((Date.now() - opened) / 1000),
    });
  }, [state, queryClient, opened]);

  if (status.error instanceof ApiError && status.error.code === 'not_found') return <Stale />;

  const leave = (to: '/home' | '/visits') => {
    clearPendingHandoff();
    router.dismissTo(to);
  };
  const support = (
    <SupportContext
      topic={t('ret.topic')}
      hours={hoursLabel(settings?.settings.clinicHours ?? null) ?? t('sup.hoursPending')}
      response={settings?.clinic.supportReplyTime ? t('sup.replies', { time: settings.clinic.supportReplyTime }) : undefined}
      phone={settings?.clinic.phone ?? null}
      onAsk={() => router.push('/support/ask')}
    />
  );

  if (state === 'confirmed') {
    const v = status.data!.visit;
    const body = v
      ? v.professional
        ? t('ret.confirmed.body', { date: clinicDay(v.startsAt, zone), time: clinicTime(v.startsAt, zone), pro: v.professional })
        : t('ret.confirmed.bodyNoPro', { date: clinicDay(v.startsAt, zone), time: clinicTime(v.startsAt, zone) })
      : undefined;
    return (
      <AsyncStatus
        state="success"
        title={t('ret.confirmed.title')}
        reference={v?.ref}
        actions={
          <Button size="lg" fullWidth onPress={() => router.dismissTo('/home')}>
            {t('ret.done')}
          </Button>
        }
      >
        {body}
      </AsyncStatus>
    );
  }
  if (state === 'notvisible') {
    const at = status.data!.checkAgainAt;
    return (
      // Fresha confirmed it (success), it just isn't readable yet (BKG-09 notvisible).
      <AsyncStatus
        state="success"
        title={t('ret.notvisible.title')}
        reference={status.data!.visit?.ref ?? t('ret.freshaRef')}
        actions={
          <Button size="lg" fullWidth onPress={() => leave('/visits')}>
            {t('ret.goVisits')}
          </Button>
        }
      >
        {t('ret.notvisible.body', { time: at ? clinicTime(at, zone) : '' })}
      </AsyncStatus>
    );
  }
  // "Not yet" also covers a failed check: no evidence either way, so never "booked" and never "failed".
  if (state === 'notyet' || status.isError) {
    return (
      <>
        {/* The only way out besides "Check again" (BKG-09 has one button): a header Close, as on the booking modal. */}
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Button variant="tertiary" size="sm" onPress={() => leave('/home')}>
                {t('common.close')}
              </Button>
            ),
          }}
        />
        <AsyncStatus
          state="timeout"
          title={t('ret.notyet.title')}
          actions={
            <Button size="lg" fullWidth icon="arrow-clockwise" loading={status.isFetching} onPress={() => status.refetch()}>
              {t('ret.checkAgain')}
            </Button>
          }
        >
          {t('ret.notyet.body')}
        </AsyncStatus>
        {support}
      </>
    );
  }
  return (
    <AsyncStatus state="pending" title={t('ret.checking.title')}>
      {t('ret.checking.body')}
    </AsyncStatus>
  );
}
