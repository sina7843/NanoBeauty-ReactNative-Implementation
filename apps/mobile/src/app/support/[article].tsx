import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Chip, Screen, Skeleton, Text } from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { useArticle } from '../../content/queries';
import { t } from '../../i18n';

/** `/support/[article]` — SUP-02 help article, from published content (cached for offline reading). */
export default function SupportArticle() {
  const router = useRouter();
  const { article } = useLocalSearchParams<{ article: string }>();
  const query = useArticle(article);
  const [helped, setHelped] = useState(false);
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen topInset={false}>
        <ContentGate query={query} skeleton={<Skeleton lines={4} media={false} />}>
          {(a) => (
            <>
              <Text variant="titleLg" accessibilityRole="header">
                {a.title}
              </Text>
              {a.sample ? <Badge tone="sample">{t('sup.sampleAnswer')}</Badge> : null}
              {a.body.map((p) => (
                <Text key={p} variant="bodyLg">
                  {p}
                </Text>
              ))}
              <View style={styles.helped}>
                <Text variant="label">{t('sup.helped')}</Text>
                <View style={styles.chips}>
                  <Chip selected={helped} onPress={() => setHelped(true)}>
                    {t('sup.yes')}
                  </Chip>
                  <Chip onPress={() => router.push('/support/contact')}>{t('sup.no')}</Chip>
                </View>
              </View>
            </>
          )}
        </ContentGate>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  helped: { gap: space['2'], marginTop: space['4'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
