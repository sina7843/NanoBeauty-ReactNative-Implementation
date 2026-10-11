import type { VisitStatus } from '@nano/contracts';
import { radius, size as sizes, space } from '@nano/design-tokens';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import { money } from '../i18n/format';
import { Text } from '../theme/Text';
import { useTheme } from '../theme/ThemeProvider';
import { Badge, SampleBadge, type Tone } from './Badge';
import { Banner } from './Banner';
import { Button, IconButton } from './Button';
import { SegmentedControl } from './Field';
import { Icon } from './Icon';

const STATUS: Record<VisitStatus, [Tone, 'status.confirmed' | 'status.pending' | 'status.changed' | 'status.cancelled' | 'status.completed' | 'status.noshow']> = {
  confirmed: ['success', 'status.confirmed'],
  pending: ['warning', 'status.pending'],
  changed: ['info', 'status.changed'],
  cancelled: ['neutral', 'status.cancelled'],
  completed: ['neutral', 'status.completed'],
  noshow: ['danger', 'status.noshow'],
};

export interface AppointmentPassProps {
  service: string;
  date: string;
  time: string;
  provider?: string | null;
  /** Status from the booking source; the pass never says "Confirmed" before the clinic system does. */
  status: VisitStatus;
  eyebrow?: string;
  compact?: boolean;
  sample?: boolean;
  onAddToCalendar?: () => void;
  onManage?: () => void;
}

/** A visit (DISC 01, BOOK 08, BOOK 11). Calendar uses the system sheet without full calendar permission. */
export function AppointmentPass({ service, date, time, provider, status, eyebrow = t('pass.next'), compact, sample, onAddToCalendar, onManage }: AppointmentPassProps) {
  const { colors, elevation } = useTheme();
  const [tone, label] = STATUS[status];
  const active = status !== 'cancelled' && status !== 'completed' && status !== 'noshow';
  return (
    <View
      style={[styles.pass, { backgroundColor: colors.surface, borderColor: colors.line }, elevation.card]}
      accessible={!onAddToCalendar && !onManage}
      accessibilityLabel={`${service}, ${date} at ${time}, ${t(label)}`}
    >
      <View style={styles.top}>
        <Text variant="overline" tone="inkMuted" numberOfLines={1} style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <View style={styles.badges}>
          {sample ? <SampleBadge /> : null}
          <Badge tone={tone}>{t(label)}</Badge>
        </View>
      </View>
      <Text variant="titleLg">{service}</Text>
      <View style={styles.when}>
        <Text variant="headline">{date}</Text>
        <Text variant="headline" tone="inkMuted">
          {time}
        </Text>
      </View>
      {compact ? null : (
        <>
          <View style={[styles.meta, { borderTopColor: colors.line }]}>
            {provider ? (
              <View style={styles.inline}>
                <Icon name="user-circle" size={16} tone="inkMuted" />
                <Text variant="caption" tone="inkMuted">{provider}</Text>
              </View>
            ) : null}
            <View style={styles.inline}>
              <Icon name="map-pin" size={16} tone="inkMuted" />
              <Text variant="caption" tone="inkMuted">{t('pass.location')}</Text>
            </View>
          </View>
          {active && (onAddToCalendar || onManage) ? (
            <View style={styles.actions}>
              {onAddToCalendar ? (
                <Button variant="secondary" size="sm" icon="calendar-plus" onPress={onAddToCalendar}>
                  {t('pass.addCal')}
                </Button>
              ) : null}
              {onManage ? (
                <Button variant="tertiary" size="sm" iconAfter="caret-right" onPress={onManage}>
                  {t('pass.manage')}
                </Button>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * `.nb-stepper`: "Step 2 of 4" overline, the current step name as headline and a segmented track
 * (done and current segments primary, current at 55%). Used on booking and the four gift steps (Design, Value, Recipient, Review).
 */
export function BookingStepper({ steps, current }: { steps: string[]; current: number }) {
  const { colors } = useTheme();
  const label = t('stepper.step', { n: current + 1, total: steps.length });
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label}: ${steps[current]}`} accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }} style={styles.stepper}>
      <Text variant="overline" tone="inkMuted">
        {label}
      </Text>
      <Text variant="headline">{steps[current]}</Text>
      <View style={styles.track}>
        {steps.map((name, i) => (
          <View key={name} style={[styles.seg, { backgroundColor: i <= current ? colors.primary : colors.line, opacity: i === current ? 0.55 : 1 }]} />
        ))}
      </View>
    </View>
  );
}

export interface BasketItem {
  name: string;
  detail?: string | null;
  minutes: number;
  /** Shown as given ("From $250", "Consultation") — the basket never invents a final price. */
  priceLabel: string;
}

/** BOOK 17: treatments in one visit, with total time and a warning when the visit is too long. */
export function ServiceBasket({
  items,
  totalMinutes,
  totalLabel,
  maxMinutes,
  onRemove,
}: {
  items: (BasketItem & { key: string })[];
  totalMinutes: number;
  totalLabel: string;
  maxMinutes: number;
  onRemove?: (key: string) => void;
}) {
  const { colors } = useTheme();
  const summary = items.length === 1 ? t('basket.summary.one', { minutes: totalMinutes }) : t('basket.summary.many', { count: items.length, minutes: totalMinutes });
  return (
    <View style={styles.basket}>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {items.map((item, i) => (
          <View key={item.key} style={[styles.basketRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <View style={styles.flex}>
              <Text variant="body" strong>
                {item.name}
              </Text>
              <Text variant="caption" tone="inkMuted">
                {item.detail ? `${item.detail} · ${item.minutes} min` : `${item.minutes} min`}
              </Text>
            </View>
            <Text variant="body" style={styles.tabular}>
              {item.priceLabel}
            </Text>
            {onRemove ? <IconButton icon="x" label={t('basket.remove', { name: item.name })} onPress={() => onRemove(item.key)} /> : null}
          </View>
        ))}
        <View style={[styles.basketRow, { borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Text variant="body" style={styles.flex}>
            {summary}
          </Text>
          <Text variant="amount">{totalLabel}</Text>
        </View>
      </View>
      {totalMinutes > maxMinutes ? (
        <Banner tone="warning" title={t('basket.tooLong.title')}>
          {t('basket.tooLong.body', { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60, max: maxMinutes / 60 })}
        </Banner>
      ) : null}
    </View>
  );
}

export interface Area {
  name: string;
  price: number;
}

/** BKG-10 per-area choice with running total; prices come from the catalogue, never calculated beyond a sum. */
export function AreaPicker({
  areas,
  set,
  onSet,
  selected,
  onToggle,
  max,
}: {
  areas: Area[];
  set: 'women' | 'men';
  onSet: (set: 'women' | 'men') => void;
  selected: string[];
  onToggle: (name: string) => void;
  max: number;
}) {
  const { colors } = useTheme();
  const total = areas.filter((a) => selected.includes(a.name)).reduce((sum, a) => sum + a.price, 0);
  const atMax = selected.length >= Math.min(max, areas.length);
  const note =
    selected.length === 0
      ? t('areas.note.none')
      : selected.length >= areas.length
        ? t('areas.note.all')
        : selected.length >= max
          ? t('areas.note.max')
          : t('areas.note.some', { max });
  return (
    <View style={styles.areas}>
      <SegmentedControl
        label={t('areas.set')}
        options={[t('areas.women'), t('areas.men')]}
        value={set === 'men' ? t('areas.men') : t('areas.women')}
        onChange={(v) => onSet(v === t('areas.men') ? 'men' : 'women')}
      />
      <View style={styles.grid} accessibilityLabel={t('areas.label')}>
        {areas.map((a) => {
          const on = selected.includes(a.name);
          const disabled = !on && selected.length >= max;
          return (
            <Pressable
              key={a.name}
              accessibilityRole="togglebutton"
              accessibilityState={{ checked: on, disabled }}
              accessibilityLabel={`${a.name}, ${money(a.price)}`}
              disabled={disabled}
              onPress={() => onToggle(a.name)}
              android_ripple={{ color: colors.surfacePressed, foreground: true }}
              style={[
                styles.area,
                {
                  backgroundColor: on ? colors.surfaceTint : colors.surface,
                  borderColor: on ? colors.primary : colors.line,
                  borderWidth: on ? 2 : 1.5,
                  opacity: disabled ? 0.55 : 1,
                },
              ]}
            >
              <Text variant="body" strong>
                {a.name}
              </Text>
              <Text variant="caption" tone="inkMuted" style={styles.tabular}>
                {money(a.price)}
              </Text>
              {on ? (
                <View style={styles.check}>
                  <Icon name="check-circle" size={18} tone="primary" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.total, { backgroundColor: colors.surfaceMuted }]}>
        <Text variant="body" style={styles.flex} accessibilityLiveRegion="polite">
          {atMax ? t('areas.countMax', { n: selected.length, max }) : t('areas.count', { n: selected.length, max })}
        </Text>
        <Text variant="amount">{money(total)}</Text>
      </View>
      <Text variant="caption" tone="inkMuted">
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  pass: { gap: space['2'], padding: space['5'], borderRadius: radius.lg, borderWidth: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space['2'], flexWrap: 'wrap', minHeight: 24 },
  eyebrow: { flexShrink: 1 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  when: { flexDirection: 'row', gap: space['2'], flexWrap: 'wrap' },
  meta: { gap: space['1'], paddingTop: space['2'], marginTop: space['1'], borderTopWidth: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space['1'] },
  actions: { flexDirection: 'row', gap: space['2'], flexWrap: 'wrap', marginTop: space['2'] },
  stepper: { gap: space['1'] },
  track: { flexDirection: 'row', gap: space['1'], marginTop: space['2'] },
  seg: { flex: 1, height: 4, borderRadius: radius.full },
  basket: { gap: space['3'] },
  box: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  basketRow: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 56, paddingHorizontal: space['4'], paddingVertical: space['2'] },
  areas: { gap: space['3'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  area: { flexBasis: '47%', flexGrow: 1, minHeight: sizes.touchMin + 16, padding: space['3'], borderRadius: radius.md, gap: 2 },
  check: { position: 'absolute', top: space['2'], right: space['2'] },
  // `.nb-areas__total`: surface-muted panel, 12/16 padding, radius md.
  total: { flexDirection: 'row', alignItems: 'center', gap: space['2'], paddingVertical: space['3'], paddingHorizontal: space['4'], borderRadius: radius.md },
});
