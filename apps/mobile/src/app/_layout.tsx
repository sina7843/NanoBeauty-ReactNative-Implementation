import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, ToastProvider } from '../components';
import { t } from '../i18n';
import { wireQueryToDevice } from '../lib/network';
import { loadBrandFonts } from '../theme/fonts';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { OnboardingGate } from '../auth/OnboardingGate';
import { getEnv } from '../config/env';
import { Maintenance, UpdateRequired } from '../entry/GateScreens';
import { useHardGate } from '../entry/useEntry';
import { installGlobalErrorHandler, telemetry } from '../lib/telemetry';
import { NotificationBridge } from '../platform/NotificationBridge';

wireQueryToDevice();
installGlobalErrorHandler();
// ENT-01: keep the native splash (plum + master frame) until fonts are resolved; the entry route then
// continues the same splash in-app while the remote gate is checked.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Root crash screen. Never shows `error.message` — it can carry internals. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  telemetry.capture(error, 'render', true);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CrashScreen retry={retry} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function CrashScreen({ retry }: { retry: () => void }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: colors.bg }]}>
      <EmptyState
        icon="warning-circle"
        title={t('error.title')}
        actions={
          <Button fullWidth onPress={retry}>
            {t('error.retry')}
          </Button>
        }
      >
        {t('error.body')}
      </EmptyState>
    </SafeAreaView>
  );
}

function Navigator() {
  const { colors, scheme } = useTheme();
  useEffect(() => {
    // Window background behind screens/transitions follows the theme (no white flash in dark mode).
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
  }, [colors.bg]);
  const devTools = getEnv().appVariant !== 'production';
  const gate = useHardGate();
  const { status, me } = useAuth();
  // FE-1: while sign-up is unfinished the sign-in modal can't be swiped away.
  const onboarding = status === 'signedIn' && !!me && me.next !== 'done';
  if (gate) {
    return (
      <>
        {gate === 'update' ? <UpdateRequired /> : <Maintenance />}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.ink },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'default',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        {/* Modal stacks for booking and payment (phase-7 route map). */}
        <Stack.Screen name="book" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="pay" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'modal', gestureEnabled: !onboarding }} />
        {/* Staff workspace: its own StaffBar header (ADMIN 01/07). */}
        <Stack.Screen name="staff" options={{ headerShown: false }} />
        <Stack.Screen name="account/index" options={{ title: t('nav.account') }} />
        <Stack.Screen name="legal/[doc]" options={{ title: '' }} />
        <Stack.Screen name="support/contact" options={{ title: '' }} />
        {/* OFR-02 terms as a native sheet (iOS page sheet with detents, Android bottom sheet). */}
        <Stack.Screen name="offers/[id]/terms" options={{ headerShown: false, presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="dev" options={{ headerShown: false }} redirect={!devTools} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function RootLayout() {
  const [fonts, setFonts] = useState<ReadonlySet<string> | null>(null);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2 },
          // Mutations never retry implicitly: money/booking writes need explicit idempotent retry.
          mutations: { retry: false, networkMode: 'online' },
        },
      }),
  );

  const [fontError, setFontError] = useState<Error | null>(null);
  useEffect(() => {
    loadBrandFonts().then(setFonts, (e: unknown) => setFontError(e instanceof Error ? e : new Error(String(e))));
  }, []);
  useEffect(() => {
    // Also on failure, so the development error screen isn't hidden behind the splash.
    if (fonts || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fonts, fontError]);

  if (fontError) throw fontError; // D-QA-02: brand fonts are required; never fall back to system fonts silently
  if (!fonts) return null; // native splash is still covering the screen
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider fonts={fonts}>
          <ToastProvider>
            <AuthProvider>
              <NotificationBridge />
              <Navigator />
              <OnboardingGate />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
});
