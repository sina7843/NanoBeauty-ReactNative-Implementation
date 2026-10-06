import type { Offer, OfferResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Banner, Button, EmptyState, Icon, ListGroup, ListRow, OfferCard, PhotoFrame, Screen, Skeleton, Text } from '../../../components';
import { ContentGate } from '../../../content/ContentGate';
import { imageFor } from '../../../content/images';
import { effectiveState, useServerNow } from '../../../content/offerClock';
import { useOffer } from '../../../content/queries';
import { t } from '../../../i18n';
import { clinicDate, clinicDateTime, money } from '../../../i18n/format';
import { useSettings } from '../../../settings/useSettings';
import { analytics } from '../../../lib/analytics';
import { resolveLink } from '../../../navigation/links';

/** `/offers/[id]` — OFR-01 (live, upcoming, paused, returning-audience) and OFR-04 (ended → safe destination). */
export default function OfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOffer(id);
  const serverNow = useServerNow(query.data?.data.serverTime, query.data?.savedAt);
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ContentGate query={query} skeleton={<Screen topInset={false}><Skeleton lines={3} /></Screen>}>
        {(data) => {
          const state = effectiveState(data.offer, serverNow);
          return state === 'expired' ? <Ended data={data} /> : <Live offer={data.offer} state={state} />;
        }}
      </ContentGate>
    </>
  );
}

function Live({ offer, state }: { offer: Offer; state: Offer['state'] }) {
  const router = useRouter();
  const settings = useSettings().data?.data;
  const zone = settings?.clinic.timezone ?? 'America/Vancouver';
  const mode = settings?.settings.bookingMode;
  const live = state === 'live';
  useEffect(() => {
    analytics.track('offer_viewed', { offer_id: offer.id, placement: 'offer_page' });
  }, [offer.id]);
  return (
    <Screen
      topInset={false}
      footer={
        <View style={styles.footer}>
          {live ? (
            <Button size="lg" fullWidth onPress={() => {
              analytics.track('offer_tapped', { offer_id: offer.id, cta: 'primary' });
              router.push(resolveLink(offer.cta.href, mode) as Href);
            }}>
              {offer.cta.label}
            </Button>
          ) : (
            <Button size="lg" variant="secondary" fullWidth onPress={() => router.push(resolveLink(offer.fallback.href, mode) as Href)}>
              {offer.fallback.label}
            </Button>
          )}
          <Button variant="tertiary" fullWidth onPress={() => router.push({ pathname: '/promo', params: { offer: offer.id } })}>
            {t('offer.promo')}
          </Button>
        </View>
      }
    >
      <PhotoFrame source={imageFor(offer.photo)} alt={offer.title} ratio="16 / 9" />
      <View style={styles.heading}>
        <View style={styles.row}>
          <Text variant="overline">{offer.eyebrow}</Text>
          {offer.sample ? <Badge tone="sample">{t('badge.sample')}</Badge> : null}
        </View>
        <Text variant="displayMd" accessibilityRole="header">
          {offer.title}
        </Text>
        <View style={styles.row}>
          <Icon name="clock" size={16} />
          <Text variant="body">
            {state === 'upcoming' ? t('offer.starts', { when: clinicDateTime(offer.startsAt, zone) }) : t('offer.ends', { when: clinicDateTime(offer.endsAt, zone) })}
          </Text>
        </View>
        {state === 'upcoming' ? (
          <Banner tone="info" title={t('offer.upcoming.title')}>
            {t('offer.upcoming.body', { when: clinicDateTime(offer.startsAt, zone) })}
          </Banner>
        ) : null}
        {state === 'paused' ? (
          <Banner tone="warning" title={t('offer.paused.title')}>
            {t('offer.paused.body')}
          </Banner>
        ) : null}
        {offer.audience === 'returning' ? (
          <Badge tone="info" icon="user-circle">
            {t('offer.returning')}
          </Badge>
        ) : null}
        {offer.body ? <Text variant="bodyLg">{offer.body}</Text> : null}
      </View>
      {state !== 'paused' && offer.eligible.length ? (
        <ListGroup header={t('offer.eligible')}>
          {offer.eligible.map((e) => (
            <ListRow key={e.title} title={e.title} value={t('offer.wasNow', { was: money(e.was), now: money(e.now) })} chevron={false} />
          ))}
        </ListGroup>
      ) : null}
      {/* PROMO 04: material terms one tap away, before any purchase. */}
      <Button variant="tertiary" onPress={() => router.push({ pathname: '/offers/[id]/terms', params: { id: offer.id } })}>
        {t('offer.terms')}
      </Button>
    </Screen>
  );
}

/** OFR-04 — never a dead end: what ended, a current offer if there is one, and a safe destination. */
function Ended({ data }: { data: OfferResponse }) {
  const router = useRouter();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const current = data.alternatives[0];
  const mode = useSettings().data?.data.settings.bookingMode;
  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth onPress={() => router.push(resolveLink(data.offer.fallback.href, mode) as Href)}>
          {data.offer.fallback.label}
        </Button>
      }
    >
      <EmptyState icon="clock-counter-clockwise" title={t('offer.endedTitle')}>
        {t('offer.endedBody', { title: data.offer.title, date: clinicDate(data.offer.endsAt, zone) })}
      </EmptyState>
      {current ? (
        <OfferCard
          offer={{ ...current, eyebrow: t('offer.current') }}
          timeZone={zone}
          onOpen={() => router.replace({ pathname: '/offers/[id]', params: { id: current.id } })}
          onTerms={() => router.push({ pathname: '/offers/[id]/terms', params: { id: current.id } })}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space['2'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' },
  footer: { gap: space['2'] },
});
