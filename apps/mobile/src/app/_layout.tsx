import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { wireQueryToDevice } from '../lib/network';

wireQueryToDevice();

/** Root crash screen. Never shows `error.message` — it can carry internals. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('error.title')}
        </Text>
        <Text style={styles.body}>{t('error.body')}</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
          <Text>{t('error.retry')}</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
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
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.flex}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// ponytail: un-themed placeholder styles; NANO-01 replaces them with nano-tokens.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16 },
  button: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 16 },
});
