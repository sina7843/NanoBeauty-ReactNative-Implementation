import { radius, space } from '@nano/design-tokens';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '../components';
import { t } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Hand-off without read-back (open-items E2): say where the bookings are instead of showing an empty list.
 * "Open Fresha" goes through BKG-12 → BKG-08 so the hand-off is recorded and BKG-09 checks the return (BV-5);
 * BKG-08 explains when the clinic hasn't set up its Fresha link. `freshaUrl` is accepted for older callers only.
 */
export function NotSynced(_props: { freshaUrl?: string | null } = {}) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.fresha, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text variant="overline" tone="inkMuted">
        {t('home.freshaEyebrow')}
      </Text>
      <Text variant="headline">{t('home.freshaTitle')}</Text>
      <Text variant="body" tone="inkMuted">
        {t('home.freshaBody')}
      </Text>
      <Button variant="secondary" iconAfter="arrow-square-out" fullWidth onPress={() => router.push('/book/how-it-works')}>
        {t('home.openFresha')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  fresha: { gap: space['2'], padding: space['4'], borderRadius: radius.lg, borderWidth: 1 },
});
