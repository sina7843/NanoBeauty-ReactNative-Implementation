import { Redirect, Stack } from 'expo-router';
import { getEnv } from '../../config/env';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

/** Dev-only routes (component showcase). Never reachable in production builds. */
export default function DevLayout() {
  const { colors } = useTheme();
  if (getEnv().appVariant === 'production') return <Redirect href="/home" />;
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.ink },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('dev.showcase') }} />
      {/* Native sheet: iOS page sheet with detents, Android modal bottom sheet; Back/swipe dismiss natively. */}
      <Stack.Screen name="sheet" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5, 1], sheetGrabberVisible: true, headerShown: false }} />
    </Stack>
  );
}
