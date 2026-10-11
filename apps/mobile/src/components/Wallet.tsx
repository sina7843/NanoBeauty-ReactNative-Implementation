import { radius, space } from '@nano/design-tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { money } from '../i18n/format';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Badge, SampleBadge, type Tone } from './Badge';
import { Banner } from './Banner';
import { Button } from './Button';
import { giftTone } from './Gift';
import { Icon } from './Icon';
import { Logo } from './Logo';

function Top({ eyebrow, children }: { eyebrow: string; children?: ReactNode }) {
  return (
    <View style={styles.top}>
      <Text variant="overline" tone="inkMuted" numberOfLines={1} style={styles.shrink}>
        {eyebrow}
      </Text>
      {children ? <View style={styles.row}>{children}</View> : null}
    </View>
  );
}

/** `.nb-pkg` (WAL-03): dots show used (muted), pending (dashed tint) and left (primary) sessions. */
export function PackageBalance({
  name,
  total,
  used,
  pending = 0,
  expires,
  status = 'active',
  sample,
  onBook,
}: {
  name: string;
  total: number;
  used: number;
  pending?: number;
  /** Already formatted, e.g. "28 Feb 2027". */
  expires?: string;
  status?: 'active' | 'expiring' | 'expired';
  sample?: boolean;
  onBook?: () => void;
}) {
  const { colors } = useTheme();
  const left = total - used - pending;
  return (
    <View
      accessible={!onBook}
      accessibilityLabel={t('walletui.packageLabel', { name, left, total })}
      style={[styles.pkg, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <Top eyebrow={t('walletui.package')}>
        {sample ? <SampleBadge /> : null}
        {status === 'expiring' ? <Badge tone="warning">{t('walletui.expiringSoon')}</Badge> : null}
        {status === 'expired' ? <Badge tone="neutral">{t('walletui.expired')}</Badge> : null}
      </Top>
      <Text variant="headline">{name}</Text>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < used
                ? { backgroundColor: colors.surfaceMuted, borderWidth: 1.5, borderColor: colors.lineStrong }
                : i < used + pending
                  ? { backgroundColor: colors.surfaceTint, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary }
                  : { backgroundColor: colors.primary },
            ]}
          />
        ))}
      </View>
      <Text variant="body">
        <Text variant="body" strong>
          {t('walletui.sessionsLeft', { left, total })}
        </Text>
        {t('walletui.sessionsLeftSuffix')}
        {pending ? (
          <Text variant="body" tone="inkMuted">
            {t('walletui.booked', { n: pending })}
          </Text>
        ) : null}
      </Text>
      {expires ? (
        <Text variant="caption" tone="inkMuted">
          {t('walletui.useBy', { date: expires })}
        </Text>
      ) : null}
      {status !== 'expired' && left > 0 && onBook ? (
        <Button variant="secondary" size="sm" icon="calendar-blank" onPress={onBook}>
          {t('walletui.bookSession')}
        </Button>
      ) : null}
    </View>
  );
}

const GIFT_STATUS = {
  scheduled: ['info', 'giftui.status.scheduled'],
  sent: ['success', 'giftui.status.sent'],
  claimed: ['success', 'giftui.status.claimed'],
  refunded: ['neutral', 'giftui.status.refunded'],
  payment: ['warning', 'giftui.status.payment'],
} as const satisfies Record<string, readonly [Tone, string]>;
export type GiftCardStatus = keyof typeof GIFT_STATUS;

/**
 * `.nb-gift`: brand face (ratio 1.6) with logo, masked code and value/balance; footer with recipient and status.
 * Pass `design` (a GIFT_TONES key) to show the chosen colour face, e.g. the WAL-13 preview.
 */
export function GiftCard({
  amount,
  balance,
  recipient,
  status,
  code = '•••• 4821',
  design,
  sample,
}: {
  amount?: number;
  balance?: number;
  recipient?: string | null;
  status?: GiftCardStatus;
  code?: string;
  design?: string;
  sample?: boolean;
}) {
  const { colors } = useTheme();
  const value = balance ?? amount ?? 0;
  const badge = status ? GIFT_STATUS[status] : null;
  const face = design ? giftTone(design)[0] : colors.surfaceBrand;
  return (
    <View accessible accessibilityLabel={t('giftui.cardLabel', { amount: money(value) })} style={styles.gift}>
      <View style={[styles.giftFace, { backgroundColor: face }]}>
        <View style={styles.ring} />
        <View style={styles.giftTop}>
          <Logo height={30} onBrand />
          <Text variant="caption" style={[styles.code, { color: colors.onBrand }]}>
            {code}
          </Text>
        </View>
        <View>
          <Text variant="overline" style={[styles.lbl, { color: colors.onBrand }]}>
            {balance != null ? t('giftui.balance') : t('giftui.value')}
          </Text>
          <Text variant="amount" style={{ color: colors.onBrand }}>
            {money(value)}
          </Text>
        </View>
      </View>
      {recipient || badge || sample ? (
        <View style={styles.giftFoot}>
          {recipient ? (
            <Text variant="caption" tone="inkMuted" style={styles.shrink}>
              {t('giftui.for', { name: recipient })}
            </Text>
          ) : (
            <View />
          )}
          <View style={styles.row}>
            {sample ? <SampleBadge /> : null}
            {badge ? <Badge tone={badge[0]}>{t(badge[1])}</Badge> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** `.nb-credit` (WAL-02): lavender panel, never bank-card styling. `reconciling` shows a dash and the info banner. */
export function CreditRow({
  available,
  pending,
  source,
  expires,
  reconciling,
  sample,
}: {
  available: number;
  pending?: number;
  source?: string;
  /** Already formatted, e.g. "28 Feb 2027". */
  expires?: string;
  reconciling?: boolean;
  sample?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.credit, { backgroundColor: colors.surfaceTint }]}>
      <View style={styles.top}>
        <Text variant="overline" tone="onTint">
          {t('walletui.credit')}
        </Text>
        {sample ? <SampleBadge /> : null}
      </View>
      <View style={styles.fig}>
        <Text variant="amount">{reconciling ? '—' : money(available)}</Text>
        <Text variant="caption" tone="onTint">
          {reconciling ? t('walletui.checking') : t('walletui.available')}
        </Text>
      </View>
      {pending ? (
        <View style={styles.row}>
          <Icon name="hourglass-medium" size={16} tone="onTint" />
          <Text variant="caption" tone="onTint">
            {t('walletui.pending', { amount: money(pending) })}
          </Text>
        </View>
      ) : null}
      <Text variant="caption" tone="onTint">
        {t('walletui.creditNote') + (source ? t('walletui.creditFrom', { source }) : '') + (expires ? t('walletui.creditUseBy', { date: expires }) : '')}
      </Text>
      {reconciling ? <Banner tone="info">{t('walletui.reconciling')}</Banner> : null}
    </View>
  );
}

/** `.nb-credit` membership panel (WAL-04/05). New memberships are not offered in the app yet. */
export function MemberStatus({
  tier,
  since,
  benefits = [],
  sample,
  onQuestions,
}: {
  tier: string;
  /** Already formatted, e.g. "12 Oct 2026". */
  since?: string;
  benefits?: string[];
  sample?: boolean;
  onQuestions?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.credit, { backgroundColor: colors.surfaceTint }]}>
      <View style={styles.top}>
        <Text variant="overline" tone="onTint">
          {t('walletui.membership')}
        </Text>
        <View style={styles.row}>
          {sample ? <SampleBadge /> : null}
          <Badge tone="success">{t('walletui.active')}</Badge>
        </View>
      </View>
      <Text variant="titleMd">{tier}</Text>
      {since ? (
        <Text variant="caption" tone="onTint">
          {t('walletui.since', { date: since })}
        </Text>
      ) : null}
      <View style={styles.list}>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.row}>
            <Icon name="check" size={16} tone="onTint" />
            <Text variant="body" style={styles.shrink}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" tone="onTint">
        {t('walletui.memberNote')}
      </Text>
      {onQuestions ? (
        <Pressable accessibilityRole="link" hitSlop={8} onPress={onQuestions} style={styles.link}>
          <Text variant="caption" strong tone="onTint" style={styles.underline}>
            {t('walletui.memberQuestions')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space['2'], flexWrap: 'wrap', minHeight: 24 },
  pkg: { gap: space['2'], padding: space['4'], borderRadius: radius.lg, borderWidth: 1, alignItems: 'flex-start' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: space['1'], marginVertical: space['1'] },
  dot: { width: 22, height: 22, borderRadius: radius.full },
  gift: { gap: space['2'] },
  giftFace: { aspectRatio: 1.6, borderRadius: radius.lg, padding: space['5'], justifyContent: 'space-between', overflow: 'hidden' },
  ring: { position: 'absolute', right: -40, bottom: -60, width: 180, height: 180, borderRadius: radius.full, borderWidth: 1, borderColor: '#FBF8F4', opacity: 0.25 },
  giftTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  code: { letterSpacing: 1 },
  lbl: { opacity: 0.85 },
  giftFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space['1'] },
  credit: { gap: space['2'], padding: space['4'], borderRadius: radius.lg },
  fig: { flexDirection: 'row', alignItems: 'baseline', gap: space['2'] },
  list: { gap: space['1'] },
  link: { alignSelf: 'flex-start', minHeight: 24, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
