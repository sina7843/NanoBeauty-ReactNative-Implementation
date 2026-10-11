import { radius, space } from '@nano/design-tokens';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from '../theme/Text';
import { Icon, type IconName } from './Icon';
import { OPACITY_DISABLED, OPACITY_PRESSED_OVERLAY, pressFeedback } from './press';

export interface CardProps {
  /** `surface` for anything people must trust (price, booking, wallet, consent); `tint` for clinic value
   * and offers; `brand` for one hero per screen. Always opaque. */
  tone?: 'surface' | 'tint' | 'brand';
  padded?: boolean;
  children: ReactNode;
  /** Makes the whole card one button; pass `accessibilityLabel` as the summary to announce. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Photo card: pressed state is an ink overlay at `opacity-pressed-overlay` over the photo (iOS; Android ripple). */
  photo?: boolean;
}

export function Card({ tone = 'surface', padded = true, children, onPress, accessibilityLabel, photo }: CardProps) {
  const { colors } = useTheme();
  const base = [
    styles.card,
    {
      backgroundColor: { surface: colors.surface, tint: colors.surfaceTint, brand: colors.surfaceBrand }[tone],
      borderColor: tone === 'surface' ? colors.line : 'transparent',
    },
    padded && styles.padded,
  ];
  if (!onPress) {
    return (
      <View style={base} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }
  if (photo) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={{ color: colors.surfacePressed, foreground: true }}
        style={base}
      >
        {({ pressed }) => (
          <>
            {children}
            {pressed && Platform.OS !== 'android' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink, opacity: OPACITY_PRESSED_OVERLAY }]} /> : null}
          </>
        )}
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...pressFeedback(base, { pressedColor: colors.surfacePressed, rippleColor: colors.surfacePressed })}
    >
      {children}
    </Pressable>
  );
}

export interface ListRowProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  chevron?: boolean;
  /** Leads to an explanation screen — never an instant destructive action. */
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function ListRow({ icon, title, subtitle, value, chevron = true, destructive, disabled, onPress }: ListRowProps) {
  const { colors } = useTheme();
  const fg = destructive ? colors.danger : colors.ink;
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: colors.surfaceMuted }]}>
          <Icon name={icon} size={20} color={destructive ? colors.danger : colors.ink} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text variant="body" strong style={{ color: fg }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="inkMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="inkMuted" style={styles.value}>
          {value}
        </Text>
      ) : null}
      {onPress && chevron ? <Icon name="caret-right" size={18} tone="inkMuted" /> : null}
    </>
  );
  const base = [styles.row, disabled && { opacity: OPACITY_DISABLED }];
  if (!onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      {...pressFeedback(base, { pressedColor: colors.surfacePressed, rippleColor: colors.surfacePressed })}
    >
      {content}
    </Pressable>
  );
}

export function ListGroup({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View style={styles.group}>
      {header ? (
        <Text variant="overline" tone="inkMuted" accessibilityRole="header" style={styles.groupPad}>
          {header}
        </Text>
      ) : null}
      <View style={[styles.groupBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line } : undefined}>
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <Text variant="caption" tone="inkMuted" style={styles.groupPad}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  padded: { padding: space['4'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 56, paddingVertical: space['2'], paddingHorizontal: space['4'] },
  rowIcon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  value: { fontVariant: ['tabular-nums'] },
  group: { gap: space['2'] },
  groupPad: { paddingHorizontal: space['4'] },
  groupBox: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
});
