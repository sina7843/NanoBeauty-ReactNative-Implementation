import type { Catalog } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, SampleBadge, Screen, ServiceBasket, Skeleton, Text } from '../../components';
import { basket, useBasket } from '../../booking/basket';
import { MAX_VISIT_MINUTES, priceLabel, summarize } from '../../booking/summary';
import { ContentGate } from '../../content/ContentGate';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { useSettings } from '../../settings/useSettings';
import { useTheme } from '../../theme/ThemeProvider';

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
      <Stack.Screen options={{ title: t('bkg.title') }} />
      <Screen
        topInset={false}
        footer={
          <Button
            size="lg"
            fullWidth
            iconAfter={mode === 'handoff' && !summary?.needsAreas ? 'arrow-square-out' : undefined}
            disabled={!summary?.lines.length || summary.tooLong}
            onPress={() => router.push(next())}
          >
            {label}
          </Button>
        }
      >
        <Text variant="body" tone="inkMuted">
          {t('bkg.pickHint')}
        </Text>
        <ContentGate query={catalog} skeleton={<Skeleton lines={4} media={false} />}>
          {(data) => <Picker catalog={data} consultation={consultation} />}
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

function Picker({ catalog, consultation }: { catalog: Catalog; consultation: number | null }) {
  const router = useRouter();
  const { colors } = useTheme();
  const items = useBasket();
  const live = catalog.services.filter((s) => s.status === 'live');
  return (
    <View style={styles.group} accessibilityLabel={t('bkg.legend')}>
      <View style={styles.legend}>
        <Text variant="label" style={styles.flex}>
          {t('bkg.legend')}
        </Text>
        {live.some((s) => s.sample) ? <SampleBadge /> : null}
      </View>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {live.map((s, i) => {
          const on = items.some((it) => it.serviceId === s.id);
          const sub = s.perArea ? t('bkg.chooseAreasNext') : s.durationLabel;
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
              <Icon name={on ? 'check-square' : 'square'} fill={on} size={24} tone={on ? 'primary' : 'inkMuted'} />
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
              <Text variant="body" style={styles.tabular}>
                {priceLabel(s.price, consultation)}
              </Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 64, paddingHorizontal: space['4'], paddingVertical: space['3'] },
});
