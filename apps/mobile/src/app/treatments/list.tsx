import type { Catalog } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, EmptyState, Screen, SegmentedControl, ServiceCard, Sheet, Skeleton, Text } from '../../components';
import { activeFilterCount, EMPTY_FILTERS, filterServices, type DurationFilter, type Filters, type PriceGroup } from '../../catalog/search';
import { ContentGate } from '../../content/ContentGate';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

const PRICE_OPTIONS: [PriceGroup, 'filters.fixed' | 'filters.range' | 'filters.consult'][] = [
  ['fixed', 'filters.fixed'],
  ['range', 'filters.range'],
  ['consultation', 'filters.consult'],
];
const DURATIONS: [DurationFilter, 'filters.any' | 'filters.under60' | 'filters.over60'][] = [
  ['any', 'filters.any'],
  ['under60', 'filters.under60'],
  ['over60', 'filters.over60'],
];

/** TRT-02 list (loaded, loading, empty) with TRT-03 filters (DISC 05). */
export default function TreatmentList() {
  const router = useRouter();
  const { category, concern } = useLocalSearchParams<{ category?: string; concern?: string }>();
  const catalog = useCatalog();
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sheet, setSheet] = useState(false);
  const data = catalog.data?.data;
  const title = data
    ? (data.categories.find((c) => c.id === category)?.name ?? data.concerns.find((c) => c.id === concern)?.name ?? t('tab.treatments'))
    : '';
  const base = useMemo(() => ({ ...filters, category, concern }), [filters, category, concern]);
  const results = useMemo(() => (data ? filterServices(data.services, base) : []), [data, base]);
  const count = (n: number) => (n === 1 ? t('trt.count.one') : t('trt.count.many', { count: n }));
  const active = activeFilterCount(filters);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen
        topInset={false}
        footer={
          <Button icon="calendar-plus" onPress={() => router.push('/book/service')}>
            {t('home.bookShort')}
          </Button>
        }
      >
        <View style={styles.bar}>
          <Chip icon="sliders-horizontal" count={active || undefined} onPress={() => setSheet(true)}>
            {t('trt.filters')}
          </Chip>
          <Text variant="caption" tone="inkMuted" accessibilityLiveRegion="polite">
            {data ? count(results.length) : t('common.loading')}
          </Text>
        </View>
        <ContentGate query={catalog} skeleton={<><Skeleton lines={2} /><Skeleton lines={2} /></>}>
          {(c) =>
            results.length === 0 ? (
              <EmptyState
                icon="sliders-horizontal"
                title={t('trt.empty.title')}
                actions={
                  <Button variant="secondary" fullWidth onPress={() => setFilters({ ...EMPTY_FILTERS })}>
                    {t('trt.clearFilters')}
                  </Button>
                }
              >
                {t('trt.empty.body')}
              </EmptyState>
            ) : (
              results.map((s) => (
                <ServiceCard
                  key={s.id}
                  name={s.name}
                  category={c.categories.find((x) => x.id === s.categoryId)?.name}
                  duration={s.durationLabel}
                  price={s.price}
                  consultation={s.price.kind === 'consultation'}
                  photo={s.photo}
                  photoRatio="16 / 9"
                  onPress={() => router.push({ pathname: '/treatments/[id]', params: { id: s.id } })}
                />
              ))
            )
          }
        </ContentGate>
      </Screen>
      {data ? (
        <FilterSheet
          visible={sheet}
          catalog={data}
          value={filters}
          base={{ category, concern }}
          onApply={(next) => {
            setFilters(next);
            setSheet(false);
          }}
          onClose={() => setSheet(false)}
        />
      ) : null}
    </>
  );
}

/** TRT-03 — a native page sheet on iOS, a full modal with system Back on Android. */
function FilterSheet({
  visible,
  catalog,
  value,
  base,
  onApply,
  onClose,
}: {
  visible: boolean;
  catalog: Catalog;
  value: Filters;
  base: { category?: string; concern?: string };
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(value);
  const toggle = <K extends 'concerns' | 'prices' | 'professionals'>(key: K, item: Filters[K][number]) =>
    setDraft((d) => ({ ...d, [key]: (d[key] as string[]).includes(item) ? (d[key] as string[]).filter((x) => x !== item) : [...(d[key] as string[]), item] }));
  const preview = filterServices(catalog.services, { ...draft, ...base }).length;
  const usedPros = catalog.professionals.filter((p) => catalog.services.some((s) => s.professionals.includes(p.id)));
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onShow={() => setDraft(value)}>
      <View style={[styles.flex, { backgroundColor: colors.surfaceRaised }]}>
        <ScrollView contentContainerStyle={styles.sheetScroll}>
          <Sheet
            title={t('trt.filters')}
            onClose={onClose}
            actions={
              <>
                <Button fullWidth onPress={() => onApply(draft)}>
                  {t('filters.show', { count: preview })}
                </Button>
                <Button variant="tertiary" fullWidth onPress={() => setDraft({ ...EMPTY_FILTERS })}>
                  {t('filters.clearAll')}
                </Button>
              </>
            }
          >
            <FilterGroup label={t('filters.concern')}>
              {catalog.concerns.map((c) => (
                <Chip key={c.id} selected={draft.concerns.includes(c.id)} onPress={() => toggle('concerns', c.id)}>
                  {c.name}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label={t('filters.price')}>
              {PRICE_OPTIONS.map(([group, label]) => (
                <Chip key={group} selected={draft.prices.includes(group)} onPress={() => toggle('prices', group)}>
                  {t(label)}
                </Chip>
              ))}
            </FilterGroup>
            <View style={styles.group}>
              <Text variant="label">{t('filters.duration')}</Text>
              <SegmentedControl
                label={t('filters.duration')}
                options={DURATIONS.map(([, label]) => t(label))}
                value={t(DURATIONS.find(([d]) => d === draft.duration)![1])}
                onChange={(v) => setDraft((d) => ({ ...d, duration: DURATIONS.find(([, label]) => t(label) === v)![0] }))}
              />
            </View>
            {usedPros.length ? (
              <FilterGroup label={t('filters.professional')}>
                {usedPros.map((p) => (
                  <Chip key={p.id} selected={draft.professionals.includes(p.id)} onPress={() => toggle('professionals', p.id)}>
                    {p.name}
                  </Chip>
                ))}
              </FilterGroup>
            ) : null}
          </Sheet>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group} accessibilityLabel={label}>
      <Text variant="label">{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space['2'] },
  sheetScroll: { flexGrow: 1 },
  group: { gap: space['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
