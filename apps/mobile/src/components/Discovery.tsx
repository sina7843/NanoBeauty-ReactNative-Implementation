import type { Offer, Price } from '@nano/contracts';
import { radius, size as sizes, space } from '@nano/design-tokens';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { imageFor } from '../content/images';
import { t } from '../i18n';
import { clinicDateTime } from '../i18n/format';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Badge } from './Badge';
import { Banner } from './Banner';
import { Button, IconButton } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { pressFeedback } from './press';
import { PhotoFrame, PriceTag } from './Status';

export interface ServiceCardProps {
  name: string;
  category?: string;
  duration?: string | null;
  price?: Price;
  consultation?: boolean;
  photo?: string | null;
  /** `stacked` (photo on top) for featured spots; `row` (thumbnail) for dense lists. */
  layout?: 'stacked' | 'row';
  photoRatio?: '16 / 10' | '16 / 9' | '4 / 3' | '5 / 2';
  onPress: () => void;
}

/** A treatment from the approved catalogue; the whole card opens its detail (DISC 02, 07). */
export function ServiceCard({ name, category, duration, price, consultation, photo, layout = 'stacked', photoRatio = '16 / 10', onPress }: ServiceCardProps) {
  const { colors } = useTheme();
  const meta = (
    <>
      {category ? (
        <Text variant="overline" tone="inkMuted">
          {category}
        </Text>
      ) : null}
      <Text variant={layout === 'row' ? 'headline' : 'titleMd'}>{name}</Text>
      <View style={styles.meta}>
        {duration ? (
          <View style={styles.inline}>
            <Icon name="clock" size={16} tone="inkMuted" />
            <Text variant="caption" tone="inkMuted">
              {duration}
            </Text>
          </View>
        ) : null}
        {consultation ? (
          <Badge tone="info" icon="chat-circle-text">
            {t('service.consultFirst')}
          </Badge>
        ) : null}
      </View>
      {price ? <PriceTag {...price} /> : null}
    </>
  );
  const label = [category, name, duration].filter(Boolean).join(', ');
  if (layout === 'row') {
    const source = imageFor(photo);
    return (
      <Card padded={false} photo onPress={onPress} accessibilityLabel={label}>
        <View style={styles.row}>
          <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}>
            {source ? <Image source={source} style={styles.thumbImage} resizeMode="cover" accessible={false} /> : <Icon name="compass" size={24} tone="inkMuted" />}
          </View>
          <View style={styles.body}>{meta}</View>
        </View>
      </Card>
    );
  }
  return (
    <Card padded={false} photo onPress={onPress} accessibilityLabel={label}>
      <PhotoFrame source={imageFor(photo)} ratio={photoRatio} rounded={false} />
      <View style={[styles.body, styles.stackedBody]}>{meta}</View>
    </Card>
  );
}

const OFFER_BADGE: Partial<Record<Offer['state'], ['info' | 'neutral' | 'warning', 'offer.state.upcoming' | 'offer.state.expired' | 'offer.state.paused']>> = {
  upcoming: ['info', 'offer.state.upcoming'],
  expired: ['neutral', 'offer.state.expired'],
  paused: ['warning', 'offer.state.paused'],
};

/** A published campaign (PROMO 01–05, 09). The end time is absolute, from the server; nothing ticks. */
export function OfferCard({
  offer,
  timeZone,
  onOpen,
  onTerms,
}: {
  offer: Offer;
  timeZone: string;
  onOpen: () => void;
  onTerms: () => void;
}) {
  const badge = OFFER_BADGE[offer.state];
  const inactive = offer.state === 'expired' || offer.state === 'paused';
  const when = offer.state === 'upcoming' ? t('offer.starts', { when: clinicDateTime(offer.startsAt, timeZone) }) : t(offer.state === 'expired' ? 'offer.ended' : 'offer.ends', { when: clinicDateTime(offer.endsAt, timeZone) });
  // DS-7: an article, not one big button. The photo and title open the offer; the CTA and Terms stay separate controls.
  return (
    <Card padded={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${offer.eyebrow}, ${offer.title}, ${when}`} onPress={onOpen}>
        <PhotoFrame source={imageFor(offer.photo)} ratio="16 / 9" label={t('photo.pending')} rounded={false} dimmed={inactive} />
      </Pressable>
      <View style={[styles.body, styles.stackedBody]}>
        <View style={styles.offerTop}>
          <Text variant="overline" tone="primary" numberOfLines={1} style={styles.offerEyebrow}>
            {offer.eyebrow}
          </Text>
          <View style={styles.offerBadges}>
            {offer.sample ? <Badge tone="sample">{t('badge.sample')}</Badge> : null}
            {badge ? <Badge tone={badge[0]}>{t(badge[1])}</Badge> : null}
          </View>
        </View>
        <Text variant="titleMd">{offer.title}</Text>
        {offer.summary ? (
          <Text variant="body" tone="inkMuted">
            {offer.summary}
          </Text>
        ) : null}
        <View style={styles.inline}>
          <Icon name="clock" size={16} />
          <Text variant="caption">{when}</Text>
        </View>
        <View style={styles.offerActions}>
          <Button variant="secondary" size="sm" iconAfter={offer.state === 'expired' ? undefined : 'caret-right'} onPress={onOpen}>
            {offer.state === 'expired' ? t('offer.browse') : t('offer.cardCta')}
          </Button>
          {/* Underlined text link (.nb-textlink), 48 dp target. */}
          <Pressable accessibilityRole="link" accessibilityLabel={t('offer.termsShort')} hitSlop={8} onPress={onTerms} style={styles.textLink}>
            <Text variant="caption" strong tone="primary" style={styles.underline}>
              {t('offer.termsShort')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

/** Search treatments, concerns and approved aliases (DISC 03). */
export function SearchField({
  value,
  onChangeText,
  placeholder = t('search.placeholder'),
  autoFocus,
  onFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
}) {
  const { colors, type } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      accessibilityRole="search"
      style={[styles.search, { backgroundColor: focused ? colors.surface : colors.surfaceMuted, borderColor: focused ? colors.focus : 'transparent' }]}
    >
      <Icon name="magnifying-glass" size={20} tone="inkMuted" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        accessibilityLabel={placeholder}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[type('body'), styles.searchInput, { fontSize: 16, lineHeight: 22, color: colors.ink }]}
      />
      {value ? <IconButton size="search" icon="x" label={t('search.clear')} onPress={() => onChangeText('')} /> : null}
    </View>
  );
}

/** One answer open at a time; answers never promise results (DISC 12). */
export function FAQBlock({ items, title = t('faq.title'), defaultOpen = -1 }: { items: { q: string; a: string }[]; title?: string; /** Index opened initially; none unless the content flags one (DS-15). */ defaultOpen?: number }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.faq}>
      <Text variant="overline" tone="inkMuted" accessibilityRole="header" style={styles.faqHead}>
        {title}
      </Text>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {items.map((item, i) => (
          <View key={item.q} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : undefined}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === i }}
              onPress={() => setOpen(open === i ? -1 : i)}
              {...pressFeedback(styles.faqQ, { pressedColor: colors.surfacePressed, rippleColor: colors.surfacePressed })}
            >
              <Text variant="body" strong style={styles.flex}>
                {item.q}
              </Text>
              <Icon name={open === i ? 'caret-up' : 'caret-down'} size={18} tone="inkMuted" />
            </Pressable>
            {open === i ? (
              <Text variant="body" tone="inkMuted" style={styles.faqA}>
                {item.a}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Preparation and aftercare from clinic-approved content only; static, no progress or predictions. */
export function CareTimeline({ steps }: { steps: { when: string; title: string; text?: string; state?: 'done' | 'now' | 'upcoming' }[] }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="list" style={styles.care}>
      {steps.map((step, i) => (
        <View key={i} style={[styles.careStep, i < steps.length - 1 && styles.careStepGap]}>
          {i < steps.length - 1 ? <View style={[styles.careLine, { backgroundColor: colors.line }]} /> : null}
          <View
            style={[
              styles.careDot,
              step.state === 'now'
                ? { borderColor: colors.primary, borderWidth: 7, backgroundColor: colors.surface }
                : { borderColor: step.state === 'done' ? colors.primary : colors.lineStrong, borderWidth: 2, backgroundColor: step.state === 'done' ? colors.primary : colors.surface },
            ]}
          >
            {step.state === 'done' ? <Icon name="check" size={12} color={colors.onPrimary} /> : null}
          </View>
          <View style={styles.flex}>
            <Text variant="overline" tone="inkMuted">
              {step.when}
            </Text>
            <Text variant="body" strong>
              {step.title}
            </Text>
            {step.text ? (
              <Text variant="body" tone="inkMuted">
                {step.text}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Contextual help (SUP-03): a white card with the reference in a monospace chip, approved channels, response time,
 * an open/closed banner when the clinic publishes hours (`open` true/false; null/undefined = say nothing) and the
 * urgent-care line. Without a phone the card offers the in-app question form through `onAsk` (D-QA-03).
 */
export function SupportContext({
  topic,
  reference,
  hours,
  response,
  phone,
  open,
  onAsk,
}: {
  topic: string;
  reference?: string;
  hours: string;
  response?: string;
  /** Clinic number; Call/Text are hidden until it exists (docs/deviations.md). */
  phone: string | null;
  /** Open now? Only claimed when hours exist; leave undefined/null otherwise. */
  open?: boolean | null;
  /** Opens the in-app question form (/support/ask). Shown as the fallback when there is no phone. */
  onAsk?: () => void;
}) {
  const { colors } = useTheme();
  const digits = phone?.replace(/[^\d+]/g, '');
  return (
    <View style={[styles.support, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text variant="overline" tone="inkMuted">
        {t('support.helpWith', { topic })}
      </Text>
      {reference ? (
        <Text variant="body" accessibilityLabel={t('support.yourReference', { reference })}>
          {t('support.yourReference', { reference: '' })}
          <Text variant="body" selectable style={[styles.ref, { backgroundColor: colors.surfaceMuted }]}>{` ${reference} `}</Text>
        </Text>
      ) : null}
      {digits ? (
        <View style={styles.supportActions}>
          <View style={styles.flex}>
            <Button variant="secondary" icon="phone" fullWidth onPress={() => Linking.openURL(`tel:${digits}`).catch(() => undefined)}>
              {t('sup.call')}
            </Button>
          </View>
          <View style={styles.flex}>
            <Button variant="secondary" icon="chat-circle-text" fullWidth onPress={() => Linking.openURL(`sms:${digits}`).catch(() => undefined)}>
              {t('sup.text')}
            </Button>
          </View>
        </View>
      ) : onAsk ? (
        <View style={styles.supportAsk}>
          <Text variant="body" tone="inkMuted">
            {t('sup.noPhone')}
          </Text>
          <Button variant="secondary" icon="chat-circle-text" fullWidth onPress={onAsk}>
            {t('sup.askClinic')}
          </Button>
        </View>
      ) : null}
      <Text variant="caption" tone="inkMuted">
        {response ? `${hours} · ${response}` : hours}
      </Text>
      {open != null ? (
        <Banner tone={open ? 'success' : 'info'} title={t(open ? 'support.open.title' : 'support.closed.title')}>
          {t(open ? 'support.open.body' : 'support.closed.body')}
        </Banner>
      ) : null}
      <UrgentLine />
    </View>
  );
}

export function UrgentLine({ text = t('sup.urgent') }: { text?: string }) {
  return (
    <View style={styles.inlineTop}>
      <Icon name="first-aid-kit" size={16} tone="inkMuted" />
      <Text variant="caption" tone="inkMuted" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

/** Optional rating line (DISC 13): off by default; always names the source and count. */
export function RatingSummary({ rating, enabled }: { rating: { value: number; count: number; source: string } | null; enabled: boolean }) {
  const { colors } = useTheme();
  if (!enabled || !rating) return null;
  if (!rating.count) {
    return (
      <View style={styles.inline}>
        <Icon name="star" size={16} tone="inkMuted" />
        <Text variant="caption" tone="inkMuted">
          {t('rating.none')}
        </Text>
      </View>
    );
  }
  const filled = Math.round(rating.value);
  return (
    <View
      style={styles.inline}
      accessible
      accessibilityLabel={t('rating.label', { value: rating.value.toFixed(1), count: rating.count, source: rating.source })}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={16} fill={n <= filled} color={colors.warning} />
      ))}
      <Text variant="body" strong style={styles.tabular}>
        {rating.value.toFixed(1)}
      </Text>
      <Text variant="caption" tone="inkMuted">
        {t('rating.count', { count: rating.count, source: rating.source })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['1'], flexWrap: 'wrap' },
  inlineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space['1'] },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space['2'] },
  row: { flexDirection: 'row' },
  thumb: { width: 104, minHeight: 104, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  body: { flex: 1, gap: space['1'], padding: space['3'] },
  stackedBody: { padding: space['4'] },
  offerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space['2'] },
  offerEyebrow: { flexShrink: 1 },
  offerBadges: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  textLink: { minHeight: 24, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  offerActions: { flexDirection: 'row', alignItems: 'center', gap: space['2'], flexWrap: 'wrap', marginTop: space['2'] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['2'],
    minHeight: sizes.controlMd,
    paddingLeft: space['4'],
    paddingRight: space['2'],
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, paddingVertical: space['2'] },
  faq: { gap: space['2'] },
  faqHead: { paddingHorizontal: space['4'] },
  box: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  faqQ: { flexDirection: 'row', alignItems: 'center', gap: space['2'], minHeight: 56, paddingHorizontal: space['4'], paddingVertical: space['3'] },
  faqA: { paddingHorizontal: space['4'], paddingBottom: space['4'] },
  care: {},
  careStep: { flexDirection: 'row', gap: space['3'] },
  careStepGap: { paddingBottom: space['5'] },
  careLine: { position: 'absolute', left: 11, top: 26, bottom: 2, width: 2 },
  careDot: { width: 24, height: 24, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  support: { gap: space['3'], padding: space['4'], borderRadius: radius.lg, borderWidth: 1 },
  supportAsk: { gap: space['2'] },
  // `.nb-ref.nb-mono`: tabular, spaced, semibold brand face on a muted chip (never a system monospace font, D-QA-02).
  ref: { fontFamily: 'Sora-SemiBold', fontVariant: ['tabular-nums'], letterSpacing: 0.6, borderRadius: radius.xs },
  supportActions: { flexDirection: 'row', gap: space['2'] },
});
