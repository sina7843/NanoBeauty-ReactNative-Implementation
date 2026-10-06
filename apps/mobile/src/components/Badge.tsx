import { radius, space } from '@nano/design-tokens';
import { StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme, type Colors } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'sample';

const DEFAULT_ICON: Partial<Record<Tone, IconName>> = {
  success: 'check',
  warning: 'clock',
  danger: 'warning-circle',
  info: 'info',
  sample: 'eye',
};

function toneColors(tone: Tone, c: Colors) {
  return {
    neutral: { bg: c.surfaceMuted, fg: c.ink },
    primary: { bg: c.surfaceTint, fg: c.onTint },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warning },
    danger: { bg: c.dangerSoft, fg: c.danger },
    info: { bg: c.infoSoft, fg: c.info },
    sample: { bg: 'transparent', fg: c.inkMuted },
  }[tone];
}

/** One or two words with an icon — never colour alone. `sample` (dashed) marks simulated data. */
export function Badge({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: IconName | null; children: string }) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(tone, colors);
  const name = icon === undefined ? DEFAULT_ICON[tone] : icon;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        tone === 'sample' && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
      ]}
    >
      {name ? <Icon name={name} size={14} color={fg} /> : null}
      <Text variant="overline" style={[styles.text, { color: fg }]}>
        {children}
      </Text>
    </View>
  );
}

/** Shorthand for the simulated-data marker (guideline 09). */
export function SampleBadge() {
  return <Badge tone="sample">{t('badge.sample')}</Badge>;
}

export type StaffRole = 'Owner' | 'Editor' | 'Front desk';
const ROLES: Record<StaffRole, [Tone, IconName]> = {
  Owner: ['primary', 'user-gear'],
  Editor: ['info', 'pencil-simple'],
  'Front desk': ['success', 'storefront'],
};

export function RoleBadge({ role }: { role: StaffRole }) {
  const [tone, icon] = ROLES[role];
  return (
    <Badge tone={tone} icon={icon}>
      {role}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space['1'],
    minHeight: 24,
    paddingHorizontal: space['2'],
    borderRadius: radius.xs,
  },
  // Badge text is 12/16 semibold like `overline`, but sentence case (not uppercase).
  text: { textTransform: 'none', letterSpacing: 0 },
});
