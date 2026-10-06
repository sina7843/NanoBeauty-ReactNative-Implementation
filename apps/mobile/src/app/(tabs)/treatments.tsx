import { radius, space } from '@nano/design-tokens';
import { useRouter, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Chip, Icon, Screen, SearchField, Skeleton, Text } from '../../components';
import { ContentGate } from '../../content/ContentGate';
import { imageFor } from '../../content/images';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

/** TRT-01 — concern-led browsing (DISC 04) and categories, from the published catalogue. */
export default function Treatments() {
  const router = useRouter();
  const { colors } = useTheme();
  const catalog = useCatalog();
  return (
    <Screen
      tabbed
      title={t('tab.treatments')}
      footer={
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
              <Text variant="titleMd" accessibilityRole="header">
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
              <Text variant="titleMd" accessibilityRole="header">
                {t('trt.categories')}
              </Text>
              <View style={styles.grid}>
                {data.categories
                  .filter((c) => data.services.some((s) => s.categoryId === c.id && s.status === 'live'))
                  .map((c) => {
                    const source = imageFor(c.photo);
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                        onPress={() => router.push(`/treatments/list?category=${c.id}` as Href)}
                        android_ripple={{ color: colors.surfacePressed, foreground: true }}
                        style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.surfacePressed : colors.surface, borderColor: colors.line }]}
                      >
                        <View style={[styles.tilePhoto, { backgroundColor: colors.surfaceMuted }]}>
                          {source ? <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} /> : <Icon name="compass" size={24} tone="inkMuted" />}
                        </View>
                        <Text variant="label" strong style={styles.tileLabel}>
                          {c.name}
                        </Text>
                      </Pressable>
                    );
                  })}
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
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  tilePhoto: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileLabel: { padding: space['3'] },
});
