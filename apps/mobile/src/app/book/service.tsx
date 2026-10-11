import type { Catalog } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Icon, Screen, SearchField, ServiceBasket, Skeleton, Text } from '../../components';
import { basket, useBasket } from '../../booking/basket';
import { MAX_VISIT_MINUTES, priceLabel, summarize } from '../../booking/summary';
import { ContentGate } from '../../content/ContentGate';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { useSettings } from '../../settings/useSettings';
import { useTheme } from '../../theme/ThemeProvider';
import { analytics } from '../../lib/analytics';

/**
 * `/book/service` — BKG-01. Pick one or more live treatments for one visit (BOOK 17); laser goes to BKG-10 for
 * areas first. In hand-off mode the time, deposit and final basket are Fresha's (BOOK 15).
 */
export default function BookService() {
  const router = useRouter();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const items = useBasket();
  const catalog = useCatalog();
  const settings = useSettings().data?.data.settings;
  const consultation = settings?.consultation.priceCAD ?? null;
  const credited = settings?.consultation.credited ?? false;
  const [query, setQuery] = useState('');
  const mode = settings?.bookingMode ?? 'handoff';

  useEffect(() => {
    if (service) basket.ensure(service);
  }, [service]);

  const summary = catalog.data ? summarize(items, catalog.data.data, consultation) : null;
  const next = (): Href =>
    summary?.needsAreas
      ? { pathname: '/book/areas', params: { service: summary.needsAreas.id } }
      : mode === 'handoff'
        ? '/book/how-it-works'
        : '/book/professional';
  const label = summary?.needsAreas ? t('bkg.chooseLaserAreas') : mode === 'handoff' ? t('bkg.continueFresha') : t('bkg.continue');

  return (
    <>
      <Stack.Screen
        options={{
          title: t('bkg.title'),
          // BKG-01 opens the booking modal: Close leaves it (back label "Close" on the board).
          headerLeft: () => (
            <Button variant="tertiary" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}>
              {t('common.close')}
            </Button>
          ),
        }}
      />
      <Screen
        topInset={false}
        footer={
          <Button
            size="lg"
            fullWidth
            iconAfter={mode === 'handoff' && !summary?.needsAreas ? 'arrow-square-out' : undefined}
            disabled={!summary?.lines.length || summary.tooLong}
            onPress={() => {
              analytics.track('booking_started', { entry_point: service ? 'treatment' : 'book', service_count: summary?.lines.length ?? 0, mode });
              analytics.track('booking_step_completed', { step: 'service', mode });
              router.push(next());
            }}
          >
            {label}
          </Button>
        }
      >
        <SearchField value={query} onChangeText={setQuery} placeholder={t('bkg.search')} />
        <Text variant="caption" tone="inkMuted">
          {t('bkg.pickHint')}
        </Text>
        <ContentGate query={catalog} skeleton={<Skeleton lines={4} media={false} />}>
          {(data) => <Picker catalog={data} consultation={consultation} credited={credited} query={query} />}
        </ContentGate>
        {summary?.lines.length ? (
          <ServiceBasket
            items={summary.lines.map((l) => ({ key: l.key, name: l.name, detail: l.detail, minutes: l.minutes, priceLabel: l.priceLabel }))}
            totalMinutes={summary.totalMinutes}
            totalLabel={summary.totalLabel}
            maxMinutes={MAX_VISIT_MINUTES}
            onRemove={(key) => basket.toggle(key)}
          />
        ) : null}
      </Screen>
    </>
  );
}

function Picker({ catalog, consultation, credited, query }: { catalog: Catalog; consultation: number | null; credited: boolean; query: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const items = useBasket();
  const q = query.trim().toLowerCase();
  // Picked treatments stay listed while searching so they can still be unticked.
  const live = catalog.services.filter(
    (s) => s.status === 'live' && (!q || items.some((it) => it.serviceId === s.id) || [s.name, ...s.aliases].some((n) => n.toLowerCase().includes(q))),
  );
  return (
    <View style={styles.group} accessibilityLabel={t('bkg.legend')}>
      <View style={styles.legend}>
        <Text variant="label" style={styles.flex}>
          {t('bkg.legend')}
        </Text>
        {live.some((s) => s.sample) ? <Badge tone="sample">{t('bkg.samplePrices')}</Badge> : null}
      </View>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {live.map((s, i) => {
          const on = items.some((it) => it.serviceId === s.id);
          const sub = s.perArea
            ? t('bkg.chooseAreasNext')
            : s.price.kind === 'consultation' && credited
              ? [s.durationLabel, t('bkg.credited')].filter(Boolean).join(' · ')
              : s.durationLabel;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={[s.name, sub, priceLabel(s.price, consultation)].filter(Boolean).join(', ')}
              onPress={() => basket.toggle(s.id)}
              android_ripple={{ color: colors.surfacePressed }}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}
            >
              <View style={styles.flex}>
                <Text variant="body" strong>
                  {s.name}
                </Text>
                {sub ? (
                  <Text variant="caption" tone="inkMuted">
                    {sub}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" tone="inkMuted" style={styles.tabular}>
                {priceLabel(s.price, consultation)}
              </Text>
              {/* Right-hand circular check (BKG-01). */}
              <View style={[styles.check, on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.lineStrong }]}>
                {on ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Button variant="tertiary" iconAfter="caret-right" onPress={() => router.push('/treatments')}>
        {t('bkg.browseAll')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  group: { gap: space['2'] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  box: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  check: { width: 26, height: 26, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 64, paddingHorizontal: space['4'], paddingVertical: space['3'] },
});
