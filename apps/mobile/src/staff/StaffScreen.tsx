import { space, size as sizes } from '@nano/design-tokens';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Button, StaffBar } from '../components';
import { t } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

/** D39: long forms switch to two columns at 768 pt (iOS) / 600 dp (Android): form left, preview and actions right. */
export const TABLET_MIN = Platform.OS === 'ios' ? 768 : 600;
export function useTablet() {
  return useWindowDimensions().width >= TABLET_MIN;
}

/**
 * Every staff screen: the StaffBar band (role from the server session), a back link, and content. Distinct from
 * customer screens by design (ADMIN 01/07); never inside the customer tabs.
 */
export function StaffScreen({
  title,
  back = { to: '/staff', label: t('stf.home') },
  children,
  aside,
  footer,
}: {
  title: string;
  back?: { to: Href; label: string } | null;
  children: ReactNode;
  /** Preview/actions column on tablets; stacked under the form on phones. */
  aside?: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const { me } = useAuth();
  const tablet = useTablet();
  const role = me?.roles.length ? me.roles.join(' + ') : '—';
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <StaffBar title={title} role={role} layout={tablet ? 'tablet' : 'phone'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, tablet && styles.scrollTablet]} keyboardShouldPersistTaps="handled">
          {back ? (
            <View style={styles.back}>
              <Button variant="tertiary" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace(back.to))}>
                {t('stf.back', { to: back.label })}
              </Button>
            </View>
          ) : null}
          {tablet && aside ? (
            <View style={styles.columns}>
              <View style={[styles.column, styles.main]}>{children}</View>
              <View style={[styles.column, styles.aside]}>{aside}</View>
            </View>
          ) : (
            <View style={styles.column}>
              {children}
              {aside}
            </View>
          )}
        </ScrollView>
        {footer ? (
          <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: colors.line, backgroundColor: colors.bg }]}>
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space['5'], paddingBottom: space['8'], gap: space['4'] },
  scrollTablet: { paddingHorizontal: space['8'] },
  back: { alignItems: 'flex-start', marginTop: space['2'] },
  column: { gap: space['4'] },
  columns: { flexDirection: 'row', gap: space['6'], alignItems: 'flex-start' },
  main: { flex: 3, maxWidth: sizes.contentMax },
  aside: { flex: 2 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'], paddingHorizontal: space['5'], paddingTop: space['3'], borderTopWidth: StyleSheet.hairlineWidth },
});
