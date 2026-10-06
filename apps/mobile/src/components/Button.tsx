import { radius, size as sizes, space } from '@nano/design-tokens';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { hitSlopFor, pressFeedback } from './press';

export interface ButtonProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconAfter?: IconName;
  /** Inert, spinner and `loadingLabel` until the server answers. Never shows success by itself. */
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  onPress?: (e: GestureResponderEvent) => void;
}

const HEIGHT = { sm: sizes.controlSm, md: sizes.controlMd, lg: sizes.controlLg } as const;
const PAD = { sm: space['4'], md: space['6'], lg: space['8'] } as const;

/** One `primary` per screen. Destructive only on the final confirmation, never the first tap. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  loadingLabel,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  onPress,
}: ButtonProps) {
  const { colors } = useTheme();
  const inert = disabled || loading;
  const showDisabledLook = disabled && !loading;

  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.surface, pressed: colors.surfacePressed, fg: colors.ink, border: colors.lineStrong },
    tertiary: { bg: 'transparent', pressed: colors.surfaceTint, fg: colors.primary, border: 'transparent' },
    destructive: { bg: colors.danger, pressed: colors.danger, fg: colors.onDanger, border: 'transparent' },
  }[variant];
  const bg = showDisabledLook ? (variant === 'tertiary' ? 'transparent' : colors.surfaceMuted) : palette.bg;
  const fg = showDisabledLook ? colors.inkDisabled : palette.fg;
  const iconSize = size === 'sm' ? 16 : 20;

  const base = [
    styles.base,
    {
      minHeight: HEIGHT[size],
      paddingHorizontal: variant === 'tertiary' ? space['3'] : PAD[size],
      backgroundColor: bg,
      borderColor: showDisabledLook ? 'transparent' : palette.border,
    },
    fullWidth && styles.full,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading && loadingLabel ? loadingLabel : children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      hitSlop={hitSlopFor(HEIGHT[size])}
      {...pressFeedback(base, { pressedColor: palette.pressed, rippleColor: colors.surfacePressed })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Icon name={icon} size={iconSize} color={fg} />
      ) : null}
      <Text variant={size === 'sm' ? 'label' : 'labelLg'} style={[styles.label, { color: fg }]}>
        {loading && loadingLabel ? loadingLabel : children}
      </Text>
      {!loading && iconAfter ? <Icon name={iconAfter} size={iconSize} color={fg} /> : null}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  /** Required accessible name. */
  label: string;
  variant?: 'plain' | 'tonal' | 'outline';
  /** A violet "new" dot; never an unread-marketing count. */
  badge?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function IconButton({ icon, label, variant = 'plain', badge, disabled, onPress }: IconButtonProps) {
  const { colors } = useTheme();
  const base = [
    styles.iconButton,
    variant === 'tonal' && { backgroundColor: colors.surfaceMuted },
    variant === 'outline' && { borderWidth: 1.5, borderColor: colors.lineStrong },
  ];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      {...pressFeedback(base, { pressedColor: colors.surfacePressed, rippleColor: colors.surfacePressed, borderless: true })}
    >
      <Icon name={icon} size={22} color={disabled ? colors.inkDisabled : colors.ink} />
      {badge ? <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.bg }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['2'],
    borderRadius: radius.full,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  full: { alignSelf: 'stretch' },
  // Labels wrap instead of truncating at large text sizes; the button grows in height.
  label: { textAlign: 'center', flexShrink: 1, paddingVertical: space['2'] },
  iconButton: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: radius.full, borderWidth: 2 },
});
