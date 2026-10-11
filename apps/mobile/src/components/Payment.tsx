import { radius, space } from '@nano/design-tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

const METHOD_ICON: Record<string, IconName> = { card: 'credit-card', debit: 'credit-card', klarna: 'receipt', affirm: 'receipt' };

/**
 * `.nb-pay` radio row (PAY-01): selected = primary 2 px border on a tint fill with a ring radio; unavailable =
 * muted surface with a prohibit icon (not a faded row, so the reason text keeps its contrast).
 */
export function PaymentMethodRow({
  method,
  label,
  detail,
  state = 'available',
  selected,
  onPress,
}: {
  /** card, debit, klarna, affirm ... drives the icon. */
  method: string;
  label: string;
  detail?: string | null;
  state?: 'available' | 'unavailable';
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const unavailable = state === 'unavailable';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: unavailable }}
      accessibilityLabel={[label, detail].filter(Boolean).join(', ')}
      disabled={unavailable}
      onPress={onPress}
      android_ripple={{ color: colors.surfacePressed, foreground: true }}
      style={[
        styles.row,
        {
          backgroundColor: unavailable ? colors.surfaceMuted : selected ? colors.surfaceTint : colors.surface,
          borderColor: selected ? colors.primary : colors.line,
          borderWidth: selected ? 2 : 1.5,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name={METHOD_ICON[method] ?? 'credit-card'} size={20} />
      </View>
      <View style={styles.text}>
        <Text variant="body" strong tone={unavailable ? 'inkMuted' : 'ink'}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="inkMuted">
            {detail}
          </Text>
        ) : null}
      </View>
      {unavailable ? (
        <Icon name="prohibit" size={18} tone="inkMuted" />
      ) : (
        <View style={[styles.radio, selected ? { borderWidth: 7, borderColor: colors.primary } : { borderWidth: 2, borderColor: colors.lineStrong }, { backgroundColor: colors.surface }]} />
      )}
    </Pressable>
  );
}

/**
 * Apple Pay / Google Pay button (`.nb-wpay`): black, logo + label, full width, 48 dp, inverted in dark mode. The
 * caller decides availability from the device and the server; an unavailable button is dimmed and inert.
 */
export function WalletPayButton({
  type = 'apple',
  state = 'available',
  label,
  loading,
  onPress,
}: {
  type?: 'apple' | 'google';
  state?: 'available' | 'unavailable';
  label?: string;
  loading?: boolean;
  onPress?: () => void;
}) {
  const { scheme } = useTheme();
  const unavailable = state === 'unavailable';
  const bg = scheme === 'dark' ? '#FFFFFF' : '#000000';
  const fg = scheme === 'dark' ? '#000000' : '#FFFFFF';
  const name = t(type === 'apple' ? 'payui.applePay' : 'payui.googlePay');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unavailable ? `${name}, ${t('payui.unavailable')}` : name}
      accessibilityState={{ disabled: unavailable || !!loading, busy: !!loading }}
      disabled={unavailable || loading}
      onPress={onPress}
      style={[styles.wpay, { backgroundColor: bg, borderColor: bg }, (unavailable || loading) && { opacity: 0.45 }]}
    >
      <Icon name={type === 'apple' ? 'apple-logo' : 'google-logo'} size={20} color={fg} />
      <Text variant="labelLg" style={{ color: fg, fontSize: 18, lineHeight: 22 }}>
        {label ?? t('payui.walletPay')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], width: '100%', minHeight: 64, paddingVertical: space['3'], paddingHorizontal: space['4'], borderRadius: radius.md, overflow: 'hidden' },
  icon: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  radio: { width: 22, height: 22, borderRadius: radius.full },
  wpay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', height: 48, borderRadius: radius.full, borderWidth: 1 },
});
