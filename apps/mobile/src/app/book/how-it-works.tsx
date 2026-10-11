import { radius, space } from '@nano/design-tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Icon, Screen, Switch, Text, type IconName } from '../../components';
import { basket } from '../../booking/basket';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

const DISMISSED_KEY = 'nano.booking.howItWorksDismissed';

/**
 * `/book/how-it-works` — BKG-12 (first, dontshow). Every hand-off entry point comes here; once dismissed it
 * steps straight through to BKG-08, so "first time only" lives in one place.
 */
export default function HowItWorks() {
  const router = useRouter();
  const { colors } = useTheme();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (service) basket.ensure(service);
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(false));
  }, [service]);

  if (dismissed === null) return null;
  if (dismissed) return <Redirect href="/book/fresha" />;

  const next = async () => {
    if (dontShow) await AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => undefined);
    router.push('/book/fresha');
  };

  const steps: readonly (readonly ['how.step1.title' | 'how.step2.title' | 'how.step3.title', 'how.step1.body' | 'how.step2.body' | 'how.step3.body', IconName])[] = [
    ['how.step1.title', 'how.step1.body', 'compass'],
    ['how.step2.title', 'how.step2.body', 'arrow-square-out'],
    ['how.step3.title', 'how.step3.body', 'calendar-check'],
  ];

  return (
    <>
      <Stack.Screen options={{ title: t('bkg.title') }} />
      <Screen
        topInset={false}
        footer={
          <Button size="lg" fullWidth onPress={next}>
            {t('bkg.continue')}
          </Button>
        }
      >
        <Text variant="titleLg" accessibilityRole="header">
          {t('how.title')}
        </Text>
        <Text variant="body" tone="inkMuted">
          {t('how.body')}
        </Text>
        <View style={styles.steps}>
          {steps.map(([title, body, icon]) => (
            <View key={title} style={styles.step} accessible>
              <View style={[styles.stepIcon, { backgroundColor: colors.surfaceTint }]}>
                <Icon name={icon} size={20} tone="onTint" />
              </View>
              <View style={styles.stepText}>
                <Text variant="headline">{t(title)}</Text>
                <Text variant="body" tone="inkMuted">
                  {t(body)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Badge tone="sample">
          {t('how.assumption')}
        </Badge>
        <Switch label={t('how.dontShow')} value={dontShow} onValueChange={setDontShow} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space['4'] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: 2 },
});
