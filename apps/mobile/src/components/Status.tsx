import { radius, space } from '@nano/design-tokens';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { t } from '../i18n';
import { money } from '../i18n/format';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

const SKELETON_DELAY_MS = 300;
const SKELETON_WIDTHS = ['70%', '92%', '48%', '80%'] as const;

/**
 * Static content-shaped placeholder; appears only after ~300 ms; no shimmer. On price/payment/balance
 * screens prefer a plain "Loading…" line — never something that could read as a value.
 */
export function Skeleton({ lines = 3, media = true }: { lines?: number; media?: boolean }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      accessibilityState={{ busy: true }}
      style={[styles.skeleton, { backgroundColor: colors.surface, opacity: visible ? 1 : 0 }]}
    >
      {media ? <View style={[styles.skeletonMedia, { backgroundColor: colors.surfaceMuted }]} /> : null}
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={[styles.skeletonLine, { backgroundColor: colors.surfaceMuted, width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] ?? '70%' }]} />
      ))}
    </View>
  );
}

function StateIcon({ name, bg, fg, children }: { name?: IconName; bg: string; fg: string; children?: ReactNode }) {
  return (
    <View style={[styles.stateIcon, { backgroundColor: bg }]}>
      {children ?? (name ? <Icon name={name} size={28} color={fg} /> : null)}
    </View>
  );
}

/** Nothing yet: calm icon, short serif title, one or two sentences, and always a way forward. */
export function EmptyState({ icon = 'calendar-blank', title, children, actions }: { icon?: IconName; title: string; children?: string; actions?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.state}>
      <StateIcon name={icon} bg={colors.surfaceTint} fg={colors.onTint} />
      <Text variant="titleMd" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      {children ? (
        <Text variant="body" tone="inkMuted" style={styles.center}>
          {children}
        </Text>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

export type AsyncState = 'pending' | 'success' | 'failed' | 'timeout';

export interface AsyncStatusProps {
  /**
   * `success` ONLY after the authoritative system (booking provider, payment provider, ledger) confirms.
   * `failed` says whether anything was charged; `timeout` offers "Check again", never "Pay again".
   */
  state: AsyncState;
  title: string;
  children?: string;
  /** A reference the customer can quote to support. */
  reference?: string;
  actions?: ReactNode;
}

export function AsyncStatus({ state, title, children, reference, actions }: AsyncStatusProps) {
  const { colors } = useTheme();
  const look = {
    pending: { bg: colors.surfaceTint, fg: colors.onTint, icon: undefined },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'check-circle' as const },
    failed: { bg: colors.dangerSoft, fg: colors.danger, icon: 'warning-circle' as const },
    timeout: { bg: colors.warningSoft, fg: colors.warning, icon: 'hourglass-medium' as const },
  }[state];
  return (
    <View style={styles.state} accessibilityLiveRegion="polite" accessibilityState={{ busy: state === 'pending' }}>
      <StateIcon bg={look.bg} fg={look.fg}>
        {state === 'pending' ? <ActivityIndicator color={look.fg} /> : <Icon name={look.icon!} size={32} color={look.fg} />}
      </StateIcon>
      <Text variant="titleMd" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      {children ? (
        <Text variant="body" tone="inkMuted" style={styles.center}>
          {children}
        </Text>
      ) : null}
      {reference ? (
        <Text variant="caption" tone="inkMuted" selectable>
          {t('async.reference', { reference })}
        </Text>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

export type PriceKind = 'fixed' | 'from' | 'range' | 'perUnit' | 'consultation' | 'promo';
export interface PriceTagProps {
  kind?: PriceKind;
  amount?: number;
  min?: number;
  max?: number;
  unit?: string;
  was?: number;
  /** Absolute end time already formatted from server time, e.g. "31 Oct, 11:59 pm PT". */
  endsAt?: string;
  size?: 'md' | 'lg';
}

/** Each price kind reads differently so "From" or "Consultation required" can't pass as a fixed price. */
export function PriceTag({ kind = 'fixed', amount = 0, min = 0, max = 0, unit = 'unit', was, endsAt, size = 'md' }: PriceTagProps) {
  const variant = size === 'lg' ? 'amount' : 'headline';
  const muted = { color: useTheme().colors.inkMuted };
  let main: ReactNode;
  let note: string | null = null;
  let label: string;
  switch (kind) {
    case 'from':
      label = `${t('price.from')} ${money(amount)}`;
      main = (
        <>
          <Text variant="body" style={muted}>{`${t('price.from')} `}</Text>
          {money(amount)}
        </>
      );
      break;
    case 'range':
      label = `${money(min)} – ${money(max)}`;
      main = `${money(min)}–${money(max)}`;
      note = t('price.rangeNote');
      break;
    case 'perUnit':
      label = `${money(amount)} / ${unit}`;
      main = (
        <>
          {money(amount)}
          <Text variant="body" style={muted}>{` / ${unit}`}</Text>
        </>
      );
      break;
    case 'consultation':
      return (
        <View style={styles.price}>
          <View style={styles.row}>
            <Icon name="chat-circle-text" size={16} tone="info" />
            <Text variant="body" strong tone="info">
              {t('price.consultation')}
            </Text>
          </View>
          <Text variant="caption" tone="inkMuted">
            {t('price.consultationNote')}
          </Text>
        </View>
      );
    case 'promo':
      label = t('price.promoLabel', { price: money(amount), was: money(was ?? 0) });
      main = (
        <>
          <Text variant={variant} tone="primary">
            {money(amount)}
          </Text>
          {was != null ? <Text variant="body" style={[muted, styles.struck]}>{` ${money(was)}`}</Text> : null}
        </>
      );
      note = endsAt ? t('price.offerEnds', { endsAt }) : null;
      break;
    default:
      label = money(amount);
      main = money(amount);
  }
  return (
    <View style={styles.price} accessible accessibilityLabel={note ? `${label}. ${note}` : label}>
      <Text variant={variant} style={styles.tabular}>
        {main}
      </Text>
      {note ? (
        <Text variant="caption" tone="inkMuted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const RATIOS = { '4 / 3': 4 / 3, '16 / 10': 16 / 10, '16 / 9': 16 / 9, '1 / 1': 1 } as const;

/** Fixed-ratio frame; a visible, labelled placeholder until licensed clinic photography arrives. */
export function PhotoFrame({
  source,
  alt,
  ratio = '4 / 3',
  label = t('photo.pending'),
}: {
  source?: ImageSourcePropType;
  /** Required with a real photo: the treatment context, not the person's looks. */
  alt?: string;
  ratio?: keyof typeof RATIOS;
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.photo, { aspectRatio: RATIOS[ratio], backgroundColor: colors.surfaceMuted }]}>
      {source ? (
        <Image source={source} accessible accessibilityLabel={alt} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder} accessible accessibilityRole="image" accessibilityLabel={label}>
          <Svg viewBox="0 0 120 90" width={64} height={48} opacity={0.6}>
            <Circle cx={60} cy={38} r={17} fill={colors.lineStrong} />
            <Path d="M24 90c4-20 18-32 36-32s32 12 36 32z" fill={colors.lineStrong} />
          </Svg>
          <View style={[styles.photoLabel, { backgroundColor: colors.surface }]}>
            <Text variant="caption">{label}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['1'] },
  tabular: { fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through' },
  skeleton: { gap: space['2'], padding: space['4'], borderRadius: radius.lg },
  skeletonMedia: { aspectRatio: 16 / 10, borderRadius: radius.md, marginBottom: space['2'] },
  skeletonLine: { height: 14, borderRadius: radius.full },
  state: { alignItems: 'center', gap: space['3'], paddingVertical: space['8'], paddingHorizontal: space['5'] },
  stateIcon: { width: 64, height: 64, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', gap: space['2'], marginTop: space['2'] },
  price: { gap: 2 },
  photo: { width: '100%', overflow: 'hidden', borderRadius: radius.lg },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space['2'] },
  photoLabel: { paddingHorizontal: space['2'], paddingVertical: 2, borderRadius: radius.xs },
});
