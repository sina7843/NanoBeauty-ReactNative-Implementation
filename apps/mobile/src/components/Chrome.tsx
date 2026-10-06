import { radius, size as sizes, space } from '@nano/design-tokens';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, type StringKey } from '../i18n';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { SampleBadge } from './Badge';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  key: string;
  labelKey: StringKey;
  icon: IconName;
  badge?: boolean;
}

/** D28 Option B: four places. Booking is not a tab; staff tools are never a tab. */
export const TABS: TabItem[] = [
  { key: 'home', labelKey: 'tab.home', icon: 'house' },
  { key: 'treatments', labelKey: 'tab.treatments', icon: 'compass' },
  { key: 'visits', labelKey: 'tab.visits', icon: 'calendar-blank' },
  { key: 'wallet', labelKey: 'tab.wallet', icon: 'wallet' },
];

/**
 * Custom tab bar for Expo Router `Tabs`. Selected = Fill icon in a lavender pill + primary bold label;
 * colour/fill change only, no bounce. Labels always visible. Height `tabbarHeight` above the inset.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.tabbar, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: insets.bottom }]}
    >
      {state.routes.map((route, index) => {
        const item = TABS.find((tab) => tab.key === route.name);
        if (!item) return null;
        const selected = state.index === index;
        const label = t(item.labelKey);
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.badge ? `${label}, ${t('tab.new')}` : label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
          >
            <View style={[styles.pill, selected && { backgroundColor: colors.surfaceTint }]}>
              <Icon name={item.icon} size={24} fill={selected} color={selected ? colors.onTint : colors.inkMuted} />
            </View>
            <Text variant="overline" strong={selected} numberOfLines={1} style={[styles.tabLabel, { color: selected ? colors.primary : colors.inkMuted }]}>
              {label}
            </Text>
            {item.badge ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Top-level (tab) screen scaffold: serif large title, up to two trailing actions, gutter `space-5`,
 * centred `contentMax` column, content scrolls (never the pinned action), safe areas respected.
 * Pushed screens use the native Stack header instead (chevron+label on iOS, arrow + predictive back on Android).
 */
export function Screen({
  title,
  trailing,
  children,
  footer,
  scroll = true,
  topInset = true,
  tabbed = false,
}: {
  title?: string;
  trailing?: ReactNode;
  children: ReactNode;
  /** Screen-ending action block, kept above the bottom inset. */
  footer?: ReactNode;
  scroll?: boolean;
  /** false under a native Stack header (the header already sits below the status bar). */
  topInset?: boolean;
  /** true inside the tab navigator, where the TabBar already absorbs the bottom inset. */
  tabbed?: boolean;
}) {
  const { colors } = useTheme();
  const body = (
    <View style={styles.column}>
      {title || trailing ? (
        <View style={styles.header}>
          {title ? (
            <Text variant="displayMd" accessibilityRole="header" style={styles.flex}>
              {title}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={[...(topInset ? (['top'] as const) : []), 'left', 'right', ...(tabbed ? [] : (['bottom'] as const))]} style={[styles.flex, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.scroll]}>{body}</View>
      )}
      {footer ? <View style={[styles.column, styles.footer]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/**
 * Development placeholder for a route a later prompt builds. Visibly not product UI (Sample badge), so a
 * review build can never be mistaken for a finished screen.
 */
export function NotBuiltYet({ screen, prompt }: { screen: string; prompt: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { borderColor: colors.lineStrong }]}>
      <SampleBadge />
      <Text variant="headline">{t('placeholder.title')}</Text>
      <Text variant="body" tone="inkMuted">
        {t('placeholder.body', { screen, prompt })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeholder: { gap: space['2'], padding: space['4'], borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
  scroll: { flexGrow: 1, paddingHorizontal: space['5'], paddingBottom: space['8'] },
  column: { width: '100%', maxWidth: sizes.contentMax, alignSelf: 'center', gap: space['4'] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space['2'], paddingTop: space['2'] },
  trailing: { flexDirection: 'row' },
  footer: { paddingHorizontal: space['5'], paddingTop: space['3'], paddingBottom: space['3'] },
  tabbar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space['1'] },
  tab: { flex: 1, minHeight: sizes.tabbarHeight, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pill: { width: 56, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  // Tab labels are 12/16 like `overline` but not uppercase (web reference `.nb-tab__label`).
  tabLabel: { textTransform: 'none', letterSpacing: 0 },
  dot: { position: 'absolute', top: 8, left: '50%', marginLeft: 10, width: 8, height: 8, borderRadius: radius.full },
});
