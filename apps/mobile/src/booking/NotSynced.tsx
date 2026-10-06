import { radius, space } from '@nano/design-tokens';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '../components';
import { t } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

/** Hand-off without read-back (open-items E2): say where the bookings are instead of showing an empty list. */
export function NotSynced({ freshaUrl }: { freshaUrl: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fresha, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text variant="overline" tone="inkMuted">
        {t('home.freshaEyebrow')}
      </Text>
      <Text variant="headline">{t('home.freshaTitle')}</Text>
      <Text variant="body" tone="inkMuted">
        {t('home.freshaBody')}
      </Text>
      <Button
        variant="secondary"
        iconAfter="arrow-square-out"
        fullWidth
        disabled={!freshaUrl}
        onPress={() => freshaUrl && WebBrowser.openBrowserAsync(freshaUrl).catch(() => undefined)}
      >
        {t('home.openFresha')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  fresha: { gap: space['2'], padding: space['4'], borderRadius: radius.lg, borderWidth: 1 },
});
