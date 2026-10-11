import type { Catalog } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useRouter, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, Icon, Screen, SearchField, Skeleton, Text } from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { imageFor } from '../../content/images';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

const liveCategories = (data: Catalog) => data.categories.filter((c) => data.services.some((s) => s.categoryId === c.id && s.status === 'live'));

/** TRT-01 — concern-led browsing (DISC 04) and categories, from the published catalogue. */
export default function Treatments() {
  const router = useRouter();
  const { colors } = useTheme();
  const catalog = useCatalog();
  return (
    <Screen
      tabbed
      title={t('tab.treatments')}
      fab={
        <Button icon="calendar-plus" onPress={() => router.push('/book/service')}>
          {t('home.bookShort')}
        </Button>
      }
    >
      {/* Opens the dedicated search screen (TRT-04). */}
      <SearchField value="" onChangeText={() => undefined} onFocus={() => router.push('/treatments/search')} />
      <ContentGate query={catalog} skeleton={<Skeleton lines={4} media={false} />}>
        {(data) => (
          <>
            <View style={styles.section}>
              <Text variant="headline" accessibilityRole="header">
                {t('home.workOn')}
              </Text>
              <View style={styles.chips}>
                {data.concerns.map((c) => (
                  <Chip key={c.id} onPress={() => router.push(`/treatments/list?concern=${c.id}` as Href)}>
                    {c.name}
                  </Chip>
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <Text variant="headline" accessibilityRole="header">
                {t('trt.categories')}
              </Text>
              <View style={styles.grid}>
                {liveCategories(data).map((c) => {
                    const source = imageFor(c.photo);
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                        onPress={() => router.push(`/treatments/list?category=${c.id}` as Href)}
                        android_ripple={{ color: colors.surfacePressed, foreground: true }}
                        style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
                      >
                        <View style={[styles.tilePhoto, { backgroundColor: colors.surfaceMuted }]}>
                          {source ? <Image source={source} style={styles.tileImage} resizeMode="cover" accessible={false} /> : <Icon name="compass" size={24} tone="inkMuted" />}
                        </View>
                        <Text variant="label" strong>
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                {/* An odd last tile keeps its column width. */}
                {liveCategories(data).length % 2 ? <View style={styles.tile} /> : null}
              </View>
            </View>
          </>
        )}
      </ContentGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space['3'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space['3'] },
  // TRT-01: two even columns, a 76 px photo with 16 px corners, no card.
  tile: { flexBasis: '40%', flexGrow: 1, gap: space['2'] },
  tilePhoto: { height: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});
