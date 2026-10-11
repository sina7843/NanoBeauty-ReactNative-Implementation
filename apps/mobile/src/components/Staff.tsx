import { radius, space } from '@nano/design-tokens';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEnv } from '../config/env';
import { t } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Icon } from './Icon';
import { EmptyState } from './Status';

export type StaffEnv = 'Production' | 'Staging' | 'Development';
const ENV_BY_VARIANT = { production: 'Production', staging: 'Staging', development: 'Development' } as const;

/** The build's environment, so non-production staff screens always carry the amber tag. */
export function currentStaffEnv(): StaffEnv {
  return ENV_BY_VARIANT[getEnv().appVariant];
}

/**
 * Header of EVERY staff screen (ADMIN 01/07): deep plum `staff` band, role, environment. Customer screens
 * never use it. `role` comes from the server session; this component only displays it.
 */
export function StaffBar({
  title,
  role,
  env = currentStaffEnv(),
  layout = 'phone',
}: {
  title?: string;
  role: string;
  env?: StaffEnv;
  layout?: 'phone' | 'tablet';
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const test = env !== 'Production';
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.staff, paddingTop: insets.top + space['3'], paddingHorizontal: layout === 'tablet' ? space['8'] : space['5'] },
      ]}
    >
      {/* The plum band runs under the status bar in both themes, so its icons are always light. */}
      <StatusBar style="light" />
      <View style={styles.row}>
        <View style={styles.inline}>
          <Icon name="user-gear" size={18} color={colors.onStaff} />
          <Text variant="label" style={{ color: colors.onStaff }}>
            {t('staff.workspace')}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={t('staff.envLabel', { env })}
          style={[
            styles.env,
            test ? { backgroundColor: colors.warningSoft, borderColor: 'transparent' } : { borderColor: colors.onStaff },
          ]}
        >
          <Text variant="overline" style={{ color: test ? colors.warning : colors.onStaff }}>
            {env}
          </Text>
        </View>
      </View>
      {title ? (
        <Text variant="titleMd" accessibilityRole="header" style={[styles.title, { color: colors.onStaff }]}>
          {title}
        </Text>
      ) : null}
      <Text variant="caption" style={{ color: colors.onStaff, opacity: 0.9 }}>
        {t('staff.signedInAs', { role })}
      </Text>
    </View>
  );
}

/**
 * Shown when a role can't do something (deep link, stale screen). The server is the authority — hiding a
 * button is not security.
 */
export function PermissionNotice({ action, role, onAskAdmin }: { action: string; role: string; onAskAdmin?: () => void }) {
  return (
    <EmptyState
      icon="lock"
      title={t('permission.title')}
      actions={
        onAskAdmin ? (
          <Button variant="secondary" fullWidth onPress={onAskAdmin}>
            {t('permission.ask')}
          </Button>
        ) : undefined
      }
    >
      {t('permission.body', { role, action })}
    </EmptyState>
  );
}

const styles = StyleSheet.create({
  bar: { paddingBottom: space['4'], gap: space['1'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space['2'] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['1'] },
  env: { paddingHorizontal: space['2'], paddingVertical: 2, borderRadius: radius.xs, borderWidth: 1.5 },
  title: { marginTop: space['2'] },
});
