import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Badge, Banner, Screen, Skeleton, Text } from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { usePolicy } from '../../content/queries';
import { t } from '../../i18n';
import { calendarDate } from '../../i18n/format';

/** `/legal/[doc]` — ACC-11 versioned policy (online / saved copy offline). Old versions stay on the server. */
export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const query = usePolicy(doc);
  const title = query.data?.data.title ?? '';
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen topInset={false}>
        <ContentGate query={query} skeleton={<Skeleton lines={5} media={false} />} offlineBanner={false}>
          {(p) => (
            <>
              <View style={styles.meta}>
                <Text variant="caption" tone="inkMuted">
                  {t('legal.version', { version: p.version, date: calendarDate(p.updatedOn) })}
                </Text>
                {p.sample ? <Badge tone="sample">{t('legal.sample')}</Badge> : null}
              </View>
              {query.data?.source === 'cache' ? (
                <Banner tone="offline" title={t('legal.saved.title')}>
                  {t('legal.saved.body', { version: p.version })}
                </Banner>
              ) : null}
              {p.sections.map((s, i) => (
                <View key={i} style={styles.section}>
                  {s.heading ? (
                    <Text variant="headline" accessibilityRole="header">
                      {s.heading}
                    </Text>
                  ) : null}
                  <Text variant="bodyLg">{s.body}</Text>
                </View>
              ))}
            </>
          )}
        </ContentGate>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: space['2'], flexWrap: 'wrap' },
  section: { gap: space['2'] },
});
