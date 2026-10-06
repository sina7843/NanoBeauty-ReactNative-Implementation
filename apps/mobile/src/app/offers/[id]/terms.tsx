import { space } from '@nano/design-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Sheet, Text } from '../../../components';
import { ContentGate } from '../../../content/ContentGate';
import { useOffer } from '../../../content/queries';
import { t } from '../../../i18n';
import { useTheme } from '../../../theme/ThemeProvider';

/** OFR-02 — offer terms as a native sheet (PROMO 04). */
export default function OfferTerms() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useOffer(id);
  return (
    <ScrollView style={{ backgroundColor: colors.surfaceRaised }} contentContainerStyle={styles.grow}>
      <Sheet
        title={t('offer.termsTitle')}
        onClose={() => router.back()}
        actions={
          <Button variant="secondary" fullWidth onPress={() => router.back()}>
            {t('common.close')}
          </Button>
        }
      >
        <ContentGate query={query}>
          {(data) => (
            <View style={styles.list}>
              {data.offer.sample ? <Badge tone="sample">{t('offer.termsSample')}</Badge> : null}
              {data.offer.terms.map((term) => (
                <View key={term} style={styles.item} accessible>
                  <Text variant="body">{'•'}</Text>
                  <Text variant="body" style={styles.flex}>
                    {term}
                  </Text>
                </View>
              ))}
              <Button variant="tertiary" size="sm" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'booking' } })}>
                {t('offer.bookingPolicy')}
              </Button>
            </View>
          )}
        </ContentGate>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  list: { gap: space['3'] },
  item: { flexDirection: 'row', gap: space['2'] },
});
