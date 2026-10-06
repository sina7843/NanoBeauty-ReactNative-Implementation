import { space } from '@nano/design-tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Screen, Switch, Text } from '../../components';
import { basket } from '../../booking/basket';
import { t } from '../../i18n';

const DISMISSED_KEY = 'nano.booking.howItWorksDismissed';

/**
 * `/book/how-it-works` — BKG-12 (first, dontshow). Every hand-off entry point comes here; once dismissed it
 * steps straight through to BKG-08, so "first time only" lives in one place.
 */
export default function HowItWorks() {
  const router = useRouter();
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

  const steps = [
    ['how.step1.title', 'how.step1.body'],
    ['how.step2.title', 'how.step2.body'],
    ['how.step3.title', 'how.step3.body'],
  ] as const;

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen
        topInset={false}
        footer={
          <Button size="lg" fullWidth iconAfter="arrow-square-out" onPress={next}>
            {t('bkg.continueFresha')}
          </Button>
        }
      >
        <Text variant="displayMd" accessibilityRole="header">
          {t('how.title')}
        </Text>
        <Text variant="bodyLg" tone="inkMuted">
          {t('how.body')}
        </Text>
        <View style={styles.steps}>
          {steps.map(([title, body]) => (
            <View key={title} style={styles.step} accessible>
              <Text variant="headline">{t(title)}</Text>
              <Text variant="body" tone="inkMuted">
                {t(body)}
              </Text>
            </View>
          ))}
        </View>
        <Badge tone="warning" icon="info">
          {t('how.assumption')}
        </Badge>
        <Switch label={t('how.dontShow')} value={dontShow} onValueChange={setDontShow} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space['4'] },
  step: { gap: space['1'] },
});
