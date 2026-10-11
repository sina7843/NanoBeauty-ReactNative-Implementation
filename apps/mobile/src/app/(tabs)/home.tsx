import type { Href } from 'expo-router';
import { radius, space } from '@nano/design-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { NotSynced } from '../../booking/NotSynced';
import { addVisitToCalendar, useVisits } from '../../booking/visits';
import { AppointmentPass, Banner, Button, Chip, IconButton, Logo, OfferCard, PhotoFrame, RatingSummary, Screen, Skeleton, Text, useToast } from '../../components';
import { imageFor } from '../../content/images';
import { effectiveState, useServerNow } from '../../content/offerClock';
import { useCatalog, useHomeContent } from '../../content/queries';
import { t } from '../../i18n';
import { clinicDay, clinicTime } from '../../i18n/format';
import { useIsOnline } from '../../lib/network';
import { useSettings } from '../../settings/useSettings';

/**
 * HOM-01 guest home and the signed-in home. Priority (DISC 11): next visit, booking, value, then at most two
 * server-ordered offers. Nothing personal is shown that the server hasn't provided: visits arrive with the
 * Fresha read-back (NANO-04) and balances with the wallet (NANO-06), so until then the hand-off card says so.
 */
export default function Home() {
  const router = useRouter();
  const online = useIsOnline();
  const { status, me } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const home = useHomeContent();
  const catalog = useCatalog();
  const settings = useSettings().data?.data;
  const zone = settings?.clinic.timezone ?? 'America/Vancouver';
  const signedIn = status === 'signedIn';
  const visitsSavedAt = useVisits().data?.savedAt;

  // Server state, moved toward "expired" by the server clock while Home stays open (PROMO 09).
  const serverNow = useServerNow(home.data?.data.serverTime, home.data?.savedAt);
  const offers = (home.data?.data.offers ?? [])
    .map((o) => ({ ...o, state: effectiveState(o, serverNow) }))
    .filter((o) => o.state !== 'expired');
  const concerns = (catalog.data?.data.concerns ?? []).filter((c) => c.homeRank !== null).sort((a, b) => a.homeRank! - b.homeRank!);

  return (
    <Screen
      tabbed
      fab={
        signedIn ? (
          <Button icon="calendar-plus" onPress={() => router.push('/book/service')}>
            {t('home.bookShort')}
          </Button>
        ) : undefined
      }
    >
      <View style={styles.header}>
        <Logo height={signedIn ? 30 : 38} />
        {signedIn ? (
          <IconButton icon="user-circle" label={t('nav.account')} variant="tonal" onPress={() => router.push('/account')} />
        ) : status === 'guest' ? (
          // Guests browse freely (AUTH 01); sign-in is offered, never forced.
          <Button variant="tertiary" size="sm" onPress={() => router.push('/auth/phone')}>
            {t('home.signIn')}
          </Button>
        ) : null}
      </View>

      {online === false ? (
        <Banner tone="offline" title={t('offline.title')}>
          {signedIn ? signedInOffline(visitsSavedAt, zone) : t('home.offlineBody')}
        </Banner>
      ) : null}
      {notice === 'oldlink' ? (
        <Banner tone="info" title={t('link.notFound.title')} onDismiss={() => router.setParams({ notice: undefined })}>
          {t('link.notFound.body')}
        </Banner>
      ) : null}

      {signedIn ? (
        <>
          {me?.customer.firstName ? (
            <Text variant="displayMd" accessibilityRole="header">
              {t('home.welcomeBack', { name: me.customer.firstName })}
            </Text>
          ) : null}
          <NextVisit zone={zone} compact={online === false} eyebrow={settings?.settings.bookingMode === 'inapp' ? t('pass.next') : t('pass.fresha')} />
        </>
      ) : (
        <View style={styles.hero}>
          {home.data ? (
            <>
              {/* Main board: 28 px corners; a shallow crop while a banner (offline, old link) takes the room. */}
              <View style={styles.heroPhoto}>
                <PhotoFrame
                  rounded={false}
                  source={imageFor(home.data.data.hero.photo)}
                  alt={home.data.data.hero.alt}
                  ratio={online === false || notice === 'oldlink' ? '16 / 5.6' : settings?.settings.ratingLine.on ? '16 / 9' : '16 / 11'}
                />
              </View>
              <Text variant="displayLg" accessibilityRole="header">
                {home.data.data.hero.title}
              </Text>
              <Text variant="accentItalic" tone="inkMuted">
                {home.data.data.hero.subtitle}
              </Text>
              <RatingSummary rating={home.data.data.rating} enabled={!!settings?.settings.ratingLine.on} />
            </>
          ) : home.isError ? (
            <Banner
              tone="danger"
              title={t('error.title')}
              action={
                <Button variant="secondary" size="sm" onPress={() => home.refetch()}>
                  {t('error.retry')}
                </Button>
              }
            >
              {t('error.body')}
            </Banner>
          ) : (
            <Skeleton lines={3} />
          )}
          {/* Booking and browsing never wait on a failed campaign load; while loading, the skeleton stands in (Main loading). */}
          {home.data || home.isError ? (
          <View style={styles.actions}>
            <Button size="lg" fullWidth onPress={() => router.push('/book/service')}>
              {t('home.book')}
            </Button>
            <Button variant="secondary" fullWidth onPress={() => router.push('/treatments')}>
              {t('home.explore')}
            </Button>
          </View>
          ) : null}
        </View>
      )}

      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          timeZone={zone}
          onOpen={() => router.push({ pathname: '/offers/[id]', params: { id: offer.id } })}
          onTerms={() => router.push({ pathname: '/offers/[id]/terms', params: { id: offer.id } })}
        />
      ))}

      {!signedIn && concerns.length ? (
        <View style={styles.section}>
          <Text variant="titleMd" accessibilityRole="header">
            {t('home.workOn')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBleed} contentContainerStyle={styles.chips}>
            {concerns.map((c) => (
              <Chip key={c.id} onPress={() => router.push(`/treatments/list?concern=${c.id}` as Href)}>
                {c.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space['2'] },
  hero: { gap: space['4'] },
  heroPhoto: { borderRadius: radius.xl, overflow: 'hidden' },
  actions: { gap: space['2'] },
  section: { gap: space['3'], marginTop: space['4'] },
  // One scrolling row that runs to the screen edges (Main board).
  chipsBleed: { marginHorizontal: -space['5'] },
  chips: { flexDirection: 'row', gap: space['2'], paddingHorizontal: space['5'] },
});

/** HOM-02 offline: when the visits shown were last loaded ("Last updated today, 9:41 am."). */
function signedInOffline(savedAt: string | undefined, zone: string, now = new Date()): string {
  if (!savedAt) return t('home.offlineChanges');
  const day = clinicDay(savedAt, zone) === clinicDay(now.toISOString(), zone) ? t('home.today') : clinicDay(savedAt, zone);
  return t('home.offlineSignedIn', { day, time: clinicTime(savedAt, zone) });
}

/**
 * HOM-02: the next visit when Fresha shares bookings; otherwise "Your bookings are in Fresha" (open-items E2).
 * Nothing is shown until the visits answer arrives, so Home never implies there is no booking. Offline, the pass is
 * the compact one (HOM-02 offline).
 */
function NextVisit({ zone, compact, eyebrow }: { zone: string; compact: boolean; eyebrow: string }) {
  const router = useRouter();
  const toast = useToast();
  const address = useSettings().data?.data.clinic.address ?? t('pass.location');
  const visits = useVisits().data?.data;
  if (!visits) return null;
  if (visits.sync === 'not_connected') return <NotSynced freshaUrl={visits.freshaUrl} />;
  const next = visits.upcoming[0];
  if (!next) return null;
  return (
    <AppointmentPass
      service={next.serviceName}
      date={clinicDay(next.startsAt, zone)}
      time={clinicTime(next.startsAt, zone)}
      provider={next.professional}
      status={next.status}
      eyebrow={eyebrow}
      compact={compact}
      onAddToCalendar={async () => {
        const result = await addVisitToCalendar(next, address);
        if (result !== 'opened') toast({ tone: 'warning', message: t(result === 'denied' ? 'cal.denied' : 'cal.unavailable') });
      }}
      onManage={() => router.push(`/visits/${next.id}` as Href)}
    />
  );
}
