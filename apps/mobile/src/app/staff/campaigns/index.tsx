import { campaignDraftSchema, entitySchema, type EntityRow } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { Chip, Dialog, ListGroup, ListRow, SegmentedControl, Text, useToast } from '../../../components';
import { t } from '../../../i18n';
import { problemOf } from '../../../staff/api';
import { EntityList, stateBadge } from '../../../staff/EntityList';
import { StaffScreen } from '../../../staff/StaffScreen';

const TEMPLATES = ['halloween', 'canada_day', 'black_friday', 'holidays', 'own'] as const;

/** Calendar view: campaigns grouped by the month they start, in date order (STF-05). */
function Calendar({ rows }: { rows: EntityRow[] }) {
  const router = useRouter();
  const months = new Map<string, EntityRow[]>();
  for (const r of rows) {
    // The subtitle starts with the start date ("31 Oct – 2 Nov"); the server list is ordered by start.
    const key = r.subtitle?.split(' – ')[0]?.split(' ')[1] ?? '—';
    months.set(key, [...(months.get(key) ?? []), r]);
  }
  return (
    <>
      {[...months.entries()].map(([month, items]) => (
        <ListGroup key={month} header={month}>
          {items.map((r) => (
            <View key={r.id}>
              <ListRow title={r.name} subtitle={r.subtitle ?? undefined} onPress={() => router.push(`/staff/campaigns/${r.id}` as Href)} />
              <View style={styles.badge}>{stateBadge(r.state, r.phase)}</View>
            </View>
          ))}
        </ListGroup>
      ))}
    </>
  );
}

/** `/staff/campaigns` — STF-05 list and calendar; "New" starts from a template (STF-06). */
export default function Campaigns() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [picking, setPicking] = useState(false);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]>('own');
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    try {
      const prefill = campaignDraftSchema.partial().parse((await session.authed(`/v1/staff/campaign-templates/${template}`)).body);
      const draft = { ...prefill, title: prefill.title || t('cmp.new') };
      const created = entitySchema.parse((await session.authed('/v1/staff/campaigns', { method: 'POST', body: { draft } })).body);
      setPicking(false);
      router.push(`/staff/campaigns/${created.id}` as Href);
    } catch (e) {
      problemOf(e);
      toast({ tone: 'warning', message: t('error.body') });
    } finally {
      setCreating(false);
    }
  }

  return (
    <StaffScreen title={t('stf.campaigns')}>
      <EntityList
        plural="campaigns"
        publishPermission="selling.publish"
        onCreate={() => setPicking(true)}
        newLabel={t('cmp.new')}
        header={
          <SegmentedControl label={t('cmp.calendar')} options={[t('cmp.list'), t('cmp.calendar')]} value={view === 'list' ? t('cmp.list') : t('cmp.calendar')} onChange={(v) => setView(v === t('cmp.list') ? 'list' : 'calendar')} />
        }
        render={view === 'calendar' ? (rows) => <Calendar rows={rows} /> : undefined}
      />
      <Dialog visible={picking} title={t('cmp.pickTemplate')} confirmLabel={t('cmp.new')} cancelLabel={t('common.cancel')} loading={creating} onConfirm={create} onCancel={() => setPicking(false)}>
        <View style={styles.chips}>
          {TEMPLATES.map((k) => (
            <Chip key={k} selected={template === k} onPress={() => setTemplate(k)}>
              {t(`cmp.template.${k}`)}
            </Chip>
          ))}
        </View>
        <Text variant="caption" tone="inkMuted">
          {t('cmp.templateNote')}
        </Text>
      </Dialog>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'], marginBottom: space['2'] },
  badge: { paddingHorizontal: space['4'], paddingBottom: space['2'], alignItems: 'flex-start' },
});
