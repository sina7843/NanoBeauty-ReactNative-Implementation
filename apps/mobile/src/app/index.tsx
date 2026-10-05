import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEnv } from '../config/env';
import { t } from '../i18n';
import { useIsOnline } from '../lib/network';
import { useSettings } from '../settings/useSettings';

/**
 * Temporary NANO-00 boot screen proving the providers, settings boundary and network status work.
 * NANO-01 replaces it with ENT-01 (splash) and the Option B navigation shell.
 */
export default function FoundationScreen() {
  const online = useIsOnline();
  const settings = useSettings();

  return (
    <SafeAreaView style={styles.screen}>
      {online === false && (
        <View accessibilityRole="alert" style={styles.banner}>
          <Text>{t('offline.banner')}</Text>
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {t('app.name')}
      </Text>
      <Text>{t('foundation.title')}</Text>
      <Text>{t('foundation.variant', { variant: getEnv().appVariant })}</Text>

      {settings.isPending && (
        <View accessibilityLiveRegion="polite" style={styles.row}>
          <ActivityIndicator />
          <Text>{t('foundation.loading')}</Text>
        </View>
      )}
      {settings.isError && (
        <View accessibilityLiveRegion="polite" style={styles.block}>
          <Text>{t('foundation.settingsError')}</Text>
          <Pressable accessibilityRole="button" onPress={() => settings.refetch()} style={styles.button}>
            <Text>{t('error.retry')}</Text>
          </Pressable>
        </View>
      )}
      {settings.data && (
        <View style={styles.block}>
          <Text>
            {settings.data.source === 'cache'
              ? t('foundation.settingsFromCache', { version: settings.data.data.version })
              : t('foundation.settingsLive', { version: settings.data.data.version })}
          </Text>
          <Text>{t('foundation.bookingMode', { mode: settings.data.data.settings.bookingMode })}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '600' },
  banner: { padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  block: { gap: 8, marginTop: 16 },
  button: { minHeight: 48, justifyContent: 'center' },
});
