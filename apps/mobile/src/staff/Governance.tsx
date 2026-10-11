import { space } from '@nano/design-tokens';
import type { EntityRow } from '@nano/contracts';
import { StyleSheet, View } from 'react-native';
import { Badge, Card, Icon, Text, type IconName, type Tone } from '../components';
import { t, type StringKey } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { auditItemName, splitDiff } from './readable';

/** Design-system PUB map (bundle.js PublishState): tone, icon and word per lifecycle state. */
const PUB: Record<string, [Tone, IconName]> = {
  draft: ['neutral', 'pencil-simple'],
  review: ['warning', 'clock'],
  scheduled: ['info', 'calendar-check'],
  live: ['success', 'check'],
  paused: ['warning', 'prohibit'],
  ended: ['neutral', 'clock-counter-clockwise'],
  'used up': ['neutral', 'clock-counter-clockwise'],
  unavailable: ['warning', 'prohibit'],
  archived: ['neutral', 'archive'],
};

/** DS-12 PublishState: the campaign/promo phase when there is one, else the publish state. Never colour alone. */
export function PublishState({ state, phase }: { state: EntityRow['state']; phase?: string | null }) {
  const key = phase ?? state;
  const [tone, icon] = PUB[key] ?? PUB.draft!;
  return (
    <Badge tone={tone} icon={icon}>
      {phase ? t(`stf.phase.${phase}` as StringKey) : t(`stf.state.${state}`)}
    </Badge>
  );
}

/** DS-12 ApprovalItem: what changed (before → after when the summary is a change), who asked (STF-09). */
export function ApprovalItem({ name, summary, by, kind }: { name: string; summary: string; by: string; kind?: string }) {
  const diff = splitDiff(summary);
  return (
    <Card>
      <View style={styles.top}>
        {kind ? (
          <Text variant="overline" tone="inkMuted">
            {kind}
          </Text>
        ) : (
          <View />
        )}
        <PublishState state="review" />
      </View>
      <Text variant="headline">{name}</Text>
      {diff ? (
        <View style={styles.diff} accessible accessibilityLabel={`${diff.label}: ${t('appr.before')} ${diff.before}, ${t('appr.after')} ${diff.after}`}>
          <Text variant="caption" tone="inkMuted">
            {diff.label}
          </Text>
          <View style={styles.row}>
            <Text variant="body" tone="inkMuted" style={styles.strike}>
              {diff.before}
            </Text>
            <Icon name="caret-right" size={14} />
            <Text variant="label">{diff.after}</Text>
          </View>
        </View>
      ) : (
        <Text variant="body">{summary}</Text>
      )}
      <Text variant="caption" tone="inkMuted">
        {t('appr.by', { name: by })}
      </Text>
    </Card>
  );
}

/** DS-12 AuditEntry: one line of history on a timeline, read-only (STF-12). Render newest first. */
export function AuditEntry({ actor, item, change, reason, time, last }: { actor: string; item: string; change: string | null; reason: string | null; time: string; last?: boolean }) {
  const { colors } = useTheme();
  const { type, name } = auditItemName(item);
  const what = [type, name].filter(Boolean).join(' · ');
  return (
    <View style={styles.entry} accessible accessibilityLabel={[actor, what, change, reason ? t('audit.reason', { reason }) : null, time].filter(Boolean).join('. ')}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        {last ? null : <View style={[styles.line, { backgroundColor: colors.line }]} />}
      </View>
      <View style={styles.entryBody}>
        <Text variant="body">
          <Text variant="label">{actor}</Text> {what}
        </Text>
        {change ? (
          <Text variant="caption" tone="inkMuted">
            {change}
          </Text>
        ) : null}
        {reason ? (
          <Text variant="caption" tone="inkMuted">
            {t('audit.reason', { reason })}
          </Text>
        ) : null}
        <Text variant="caption" tone="inkMuted">
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space['2'] },
  diff: { gap: space['1'] },
  row: { flexDirection: 'row', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  entry: { flexDirection: 'row', gap: space['3'] },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  line: { width: 2, flex: 1, marginTop: 2 },
  entryBody: { flex: 1, gap: 2, paddingBottom: space['4'] },
});
