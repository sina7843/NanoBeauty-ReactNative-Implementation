import type { Catalog, Service } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Redirect, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import {
  Badge,
  Banner,
  Button,
  CareTimeline,
  FAQBlock,
  Icon,
  ListGroup,
  ListRow,
  PhotoFrame,
  PriceTag,
  Screen,
  Sheet,
  Skeleton,
  Text,
  UrgentLine,
} from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { imageFor } from '../../content/images';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { money } from '../../i18n/format';
import { priceLabel } from '../../booking/summary';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { useSettings } from '../../settings/useSettings';
import { useTheme } from '../../theme/ThemeProvider';
import { analytics } from '../../lib/analytics';

/** `/treatments/[id]` — TRT-05 detail (standard, FAQ, per-area, consultation, promo) and TRT-07 unavailable/archived. */
export default function TreatmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ContentGate query={catalog} skeleton={<Screen topInset={false}><Skeleton lines={4} /></Screen>}>
        {(data) => {
          const service = data.services.find((s) => s.id === id);
          if (!service) return <Gone />;
          return service.status === 'live' ? <Detail service={service} catalog={data} /> : <NotBookable service={service} catalog={data} />;
        }}
      </ContentGate>
    </>
  );
}

/** Unknown or removed treatment ids behave like any old link (LEG 07). */
function Gone() {
  return <Redirect href={OLD_LINK_HREF} />;
}

function Detail({ service, catalog }: { service: Service; catalog: Catalog }) {
  const router = useRouter();
  const settings = useSettings().data?.data.settings;
  const [care, setCare] = useState(false);
  const category = catalog.categories.find((c) => c.id === service.categoryId)?.name;
  useEffect(() => {
    analytics.track('treatment_viewed', { service_id: service.id, category: service.categoryId, price_kind: service.price.kind.toLowerCase(), source: 'detail' });
  }, [service.id, service.categoryId, service.price.kind]);
  const performers = catalog.professionals.filter((p) => service.professionals.includes(p.id));
  const withProfile = performers.filter((p) => p.profile);
  const consult = service.price.kind === 'consultation';
  const mode = settings?.bookingMode ?? 'handoff';
  const consultPrice = settings ? money(settings.consultation.priceCAD) : null;

  // DISC 14: settings-driven, never implying approval; names only the providers that are switched on.
  const amount = service.price.amount ?? service.price.min ?? 0;
  const providers = [settings?.paymentMethods.klarna && 'Klarna', settings?.paymentMethods.affirm && 'Affirm'].filter(Boolean) as string[];
  const financing =
    settings?.financingLine.on && !consult && amount >= settings.financingLine.minCAD && providers.length
      ? providers.length === 2
        ? t('trt.financingBoth')
        : t('trt.financingOne', { provider: providers[0]! })
      : null;

  const book = (): Href =>
    mode === 'handoff'
      ? (`/book/how-it-works?service=${service.id}` as Href)
      : (`/book/professional?service=${service.id}` as Href);

  const footer = consult ? (
    <Button size="lg" icon="chat-circle-text" fullWidth disabled={!consultPrice} onPress={() => router.push(book())}>
      {t('trt.bookConsult', { price: consultPrice ?? '' })}
    </Button>
  ) : service.perArea ? (
    <Button size="lg" fullWidth onPress={() => router.push(`/book/areas?service=${service.id}` as Href)}>
      {t('trt.chooseAreasCta')}
    </Button>
  ) : (
    <Button size="lg" fullWidth iconAfter={mode === 'handoff' ? 'arrow-square-out' : undefined} onPress={() => router.push(book())}>
      {t('trt.bookThis')}
    </Button>
  );

  return (
    <Screen topInset={false} footer={footer}>
      <PhotoFrame source={imageFor(service.photo)} alt={service.name} ratio={service.faq.length ? '16 / 9' : '16 / 10'} />
      <View style={styles.heading}>
        {category ? (
          <Text variant="overline" tone="inkMuted">
            {category}
          </Text>
        ) : null}
        <Text variant="titleLg" accessibilityRole="header">
          {service.name}
        </Text>
        <View style={styles.meta}>
          <PriceTag {...service.price} size="lg" />
          {service.durationLabel ? (
            <View style={styles.inline}>
              <Icon name="clock" size={16} tone="inkMuted" />
              <Text variant="caption" tone="inkMuted">
                {service.durationLabel}
              </Text>
            </View>
          ) : null}
        </View>
        {financing ? (
          <View style={styles.inline}>
            <Icon name="credit-card" size={16} tone="inkMuted" />
            <Text variant="caption" tone="inkMuted">
              {financing}
            </Text>
          </View>
        ) : null}
        {consult && settings ? (
          <View style={styles.inline}>
            {settings.sample ? <Badge tone="sample">{t('badge.sample')}</Badge> : null}
            <Text variant="caption">
              {settings.consultation.credited
                ? t('trt.consultationCredited', { price: money(settings.consultation.priceCAD) })
                : t('trt.consultation', { price: money(settings.consultation.priceCAD) })}
            </Text>
          </View>
        ) : null}
      </View>

      {service.perArea && service.price.amount !== undefined ? (
        <ListGroup>
          <ListRow
            icon="map-trifold"
            title={t('trt.chooseAreas')}
            subtitle={t('trt.chooseAreasSub', { price: money(service.price.amount) })}
            onPress={() => router.push(`/book/areas?service=${service.id}` as Href)}
          />
        </ListGroup>
      ) : null}

      {service.description ? <Text variant="bodyLg">{service.description}</Text> : null}

      <ListGroup>
        {service.care.length ? (
          <ListRow icon="calendar-check" title={t('trt.preparation')} subtitle={t('trt.preparationSub')} onPress={() => setCare(true)} />
        ) : null}
        {service.suitabilityArticle ? (
          <ListRow
            icon="first-aid-kit"
            title={t('trt.suitability')}
            subtitle={t('trt.suitabilitySub')}
            onPress={() => router.push({ pathname: '/support/[article]', params: { article: service.suitabilityArticle! } })}
          />
        ) : null}
        {/* Profiles only with consent on file (C5): one row per profile; otherwise names without a link. */}
        {withProfile.length > 1
          ? withProfile.map((p) => (
              <ListRow
                key={p.id}
                icon="user-circle"
                title={t('trt.performedBy')}
                subtitle={p.name}
                onPress={() => router.push({ pathname: '/professionals/[id]', params: { id: p.id } })}
              />
            ))
          : performers.length ? (
              <ListRow
                icon="user-circle"
                title={t('trt.performedBy')}
                subtitle={performers.map((p) => p.name).join(', ')}
                onPress={withProfile[0] ? () => router.push({ pathname: '/professionals/[id]', params: { id: withProfile[0]!.id } }) : undefined}
              />
            ) : null}
      </ListGroup>

      {service.faq.length ? (
        <View style={styles.faq}>
          {service.sample ? <Badge tone="sample">{t('trt.faqSample')}</Badge> : null}
          <FAQBlock title={t('trt.faqTitle', { name: service.name })} items={service.faq} />
        </View>
      ) : null}

      <Modal visible={care} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCare(false)}>
        <CareSheet service={service} onClose={() => setCare(false)} />
      </Modal>
    </Screen>
  );
}

/** Preparation and aftercare from the service's clinic-approved content (NOTIF 03). CAR-01 adds visit dates in NANO-04. */
function CareSheet({ service, onClose }: { service: Service; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView style={{ backgroundColor: colors.surfaceRaised }} contentContainerStyle={styles.flexGrow}>
      <Sheet title={t('care.title', { name: service.name })} onClose={onClose}>
        {service.sample ? <Badge tone="sample">{t('care.sample')}</Badge> : null}
        <CareTimeline steps={service.care} />
        <UrgentLine text={t('care.urgent')} />
      </Sheet>
    </ScrollView>
  );
}

/** TRT-07 — not bookable now, or no longer offered. Similar live treatments and the clinic are always offered. */
function NotBookable({ service, catalog }: { service: Service; catalog: Catalog }) {
  const router = useRouter();
  const similar = catalog.services.filter((s) => s.categoryId === service.categoryId && s.id !== service.id && s.status === 'live');
  const category = catalog.categories.find((c) => c.id === service.categoryId)?.name;
  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" icon="chat-circle-text" fullWidth onPress={() => router.push('/support/contact')}>
          {t('trt.askClinic')}
        </Button>
      }
    >
      <PhotoFrame source={imageFor(service.photo)} alt={service.name} ratio="16 / 10" dimmed />
      <View style={styles.heading}>
        {category ? (
          <Text variant="overline" tone="inkMuted">
            {category}
          </Text>
        ) : null}
        <Text variant="titleLg" accessibilityRole="header">
          {service.name}
        </Text>
      </View>
      {service.status === 'unavailable' ? (
        <Banner tone="info" title={t('trt.unavailable.title')}>
          {t('trt.unavailable.body')}
        </Banner>
      ) : (
        <Banner tone="info" title={t('trt.archived.title')}>
          {t('trt.archived.body')}
        </Banner>
      )}
      {similar.length ? (
        <ListGroup header={t('trt.similar')}>
          {similar.map((s) => (
            <ListRow
              key={s.id}
              title={s.name}
              subtitle={priceLabel(s.price, null)}
              onPress={() => router.push({ pathname: '/treatments/[id]', params: { id: s.id } })}
            />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexGrow: { flexGrow: 1 },
  heading: { gap: space['2'] },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space['3'] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['1'], flexWrap: 'wrap' },
  faq: { gap: space['2'] },
});
