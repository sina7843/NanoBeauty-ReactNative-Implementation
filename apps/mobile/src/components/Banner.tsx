import { radius, space } from '@nano/design-tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'offline' | 'neutral';

const ICON: Record<BannerTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning',
  danger: 'warning-circle',
  offline: 'wifi-slash',
  neutral: 'info',
};

export interface BannerProps {
  tone?: BannerTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}

/**
 * Persistent inline state message — icon plus words, never auto-dismissed. `success` only after the
 * authoritative system confirms; `danger` says what happened, whether money moved, and what next.
 */
export function Banner({ tone = 'info', title, children, action, onDismiss }: BannerProps) {
  const { colors } = useTheme();
  const key = tone === 'offline' ? 'info' : tone;
  // `neutral` (an ended state that is nobody's fault, WAL-03): muted surface, muted icon.
  const soft = key === 'neutral' ? colors.surfaceMuted : { info: colors.infoSoft, success: colors.successSoft, warning: colors.warningSoft, danger: colors.dangerSoft }[key];
  const strong = key === 'neutral' ? colors.inkMuted : colors[key];
  return (
    <View
      // One announced element unless it holds controls, which must stay individually reachable.
      accessible={!action && !onDismiss}
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={[styles.banner, { backgroundColor: soft }]}
    >
      <View style={styles.icon}>
        <Icon name={ICON[tone]} size={20} color={strong} />
      </View>
      <View style={styles.body}>
        {title ? (
          <Text variant="body" strong>
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? <Text variant="body">{children}</Text> : children}
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      {onDismiss ? <IconButton size="sm" icon="x" label={t('common.dismiss')} onPress={onDismiss} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space['3'],
    paddingVertical: space['3'],
    paddingHorizontal: space['4'],
    borderRadius: radius.md,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: space['1'] },
  action: { marginTop: space['2'], flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
