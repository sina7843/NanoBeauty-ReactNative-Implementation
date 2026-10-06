import { space } from '@nano/design-tokens';
import { Stack, useRouter, type Href } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Chip, EmptyState, ListGroup, ListRow, SearchField, Text } from '../../components';
import { searchCatalog } from '../../catalog/search';
import { ContentGate } from '../../content/ContentGate';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

/** TRT-04 — typing, results (with alias explanation) and no results (DISC 03, DISC 10). Works offline. */
export default function Search() {
  const router = useRouter();
  const { colors } = useTheme();
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  // Results update after a short pause rather than on every keystroke.
  const deferred = useDeferredValue(query);
  const open = (id: string) => router.push({ pathname: '/treatments/[id]', params: { id } });

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bar}>
        <View style={styles.flex}>
          <SearchField value={query} onChangeText={setQuery} autoFocus />
        </View>
        <Button variant="tertiary" size="sm" onPress={() => router.back()}>
          {t('search.cancel')}
        </Button>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ContentGate query={catalog}>
          {(data) => {
            if (!deferred.trim()) return null;
            const { results, alias, didYouMean } = searchCatalog(data, deferred);
            const category = (id: string) => data.categories.find((c) => c.id === id)?.name ?? '';
            if (results.length === 0) {
              return (
                <View style={styles.section}>
                  <EmptyState icon="magnifying-glass" title={t('search.noMatch.title', { q: deferred.trim() })}>
                    {t('search.noMatch.body')}
                  </EmptyState>
                  {didYouMean ? (
                    <Button variant="tertiary" onPress={() => open(didYouMean.service.id)}>
                      {t('search.didYouMean', { term: didYouMean.term })}
                    </Button>
                  ) : null}
                  <Text variant="label">{t('search.byConcern')}</Text>
                  <View style={styles.chips}>
                    {data.concerns.slice(0, 3).map((c) => (
                      <Chip key={c.id} onPress={() => router.push(`/treatments/list?concern=${c.id}` as Href)}>
                        {c.name}
                      </Chip>
                    ))}
                  </View>
                  <Button variant="secondary" icon="chat-circle-text" fullWidth onPress={() => router.push('/support/contact')}>
                    {t('trt.askClinic')}
                  </Button>
                </View>
              );
            }
            return (
              <View style={styles.section}>
                {alias ? (
                  <Banner tone="info" title={t('search.aliasTitle', { name: alias.service.name })}>
                    {t('search.aliasBody', { term: alias.term.charAt(0).toUpperCase() + alias.term.slice(1), name: alias.service.name })}
                  </Banner>
                ) : null}
                <ListGroup header={alias ? undefined : t('search.suggestions')}>
                  {results.map((s) => (
                    <ListRow
                      key={s.id}
                      icon="magnifying-glass"
                      title={s.name}
                      subtitle={t('search.treatmentIn', { category: category(s.categoryId) })}
                      onPress={() => open(s.id)}
                    />
                  ))}
                </ListGroup>
              </View>
            );
          }}
        </ContentGate>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space['2'], paddingHorizontal: space['5'], paddingVertical: space['2'] },
  body: { paddingHorizontal: space['5'], paddingBottom: space['8'], gap: space['4'] },
  section: { gap: space['3'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
