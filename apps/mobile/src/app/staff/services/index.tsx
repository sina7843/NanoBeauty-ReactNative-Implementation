import { categoryRowSchema, staffServiceRowSchema, staffServiceSchema, type StaffServiceRow } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Banner, Button, ConfirmDialog, ListGroup, ListRow, SearchField, SegmentedControl, Skeleton, Text, useToast } from '../../../components';
import { priceLabel } from '../../../booking/summary';
import { t } from '../../../i18n';
import { problemText, useStaffQuery } from '../../../staff/api';
import { PublishState } from '../../../staff/Governance';
import { StaffScreen } from '../../../staff/StaffScreen';

const FILTERS = ['all', 'live', 'draft', 'archived'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL = { all: 'stf.all', live: 'stf.live', draft: 'stf.drafts', archived: 'stf.archived' } as const;

/** `/staff/services` — STF-02 with STF-39 archive / restore / delete-draft on every row (D36). */
export default function StaffServices() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canPublish = !!me?.permissions.includes('content.publish');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const list = useStaffQuery(['services', filter, q], `/v1/staff/services?filter=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`, z.array(staffServiceRowSchema));
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'restore' | 'delete'; row: StaffServiceRow } | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  async function act() {
    if (!confirm) return;
    setBusy(true);
    try {
      await session.authed(`/v1/staff/services/${confirm.row.id}/${confirm.kind}`, { method: 'POST', body: { version: confirm.row.version } });
      await queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function create() {
    setCreating(true);
    try {
      const cats = z.array(categoryRowSchema).parse((await session.authed('/v1/staff/categories')).body);
      const firstLive = cats.find((c) => !c.archived);
      if (!firstLive) throw new Error('no category');
      const res = await session.authed('/v1/staff/services', {
        method: 'POST',
        body: {
          draft: {
            name: t('stf.newService'),
            categoryId: firstLive.id,
            aliases: [],
            concerns: [],
            description: null,
            price: { kind: 'consultation' },
            durationLabel: null,
            durationMin: null,
            photo: null,
            professionals: [],
            faq: [],
            care: [],
            visibility: 'live',
          },
        },
      });
      const created = staffServiceSchema.parse(res.body);
      router.push(`/staff/services/${created.id}` as Href);
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setCreating(false);
    }
  }

  return (
    <StaffScreen title={t('stf.services')}>
      <SearchField value={q} onChangeText={setQ} placeholder={t('stf.search')} />
      <SegmentedControl label={t('stf.services')} options={FILTERS.map((f) => t(FILTER_LABEL[f]))} value={t(FILTER_LABEL[filter])} onChange={(v) => setFilter(FILTERS.find((f) => t(FILTER_LABEL[f]) === v)!)} />
      <View style={styles.actions}>
        <Button icon="pencil-simple" loading={creating} onPress={create}>
          {t('stf.newService')}
        </Button>
        <Button variant="secondary" icon="archive" onPress={() => router.push('/staff/import')}>
          {t('stf.importList')}
        </Button>
      </View>
      {filter === 'archived' ? (
        <Text variant="caption" tone="inkMuted">
          {t('stf.restoreNote')}
        </Text>
      ) : null}
      {list.data ? (
        <ListGroup>
          {list.data.map((r) => (
            <View key={r.id}>
              <ListRow
                title={r.name}
                subtitle={[r.categoryName, priceLabel(r.price, null), r.hasDraft ? t('stf.edited') : null].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/staff/services/${r.id}` as Href)}
              />
              <View style={styles.rowActions}>
                <PublishState state={r.state} />
                {r.state === 'archived' && canPublish ? (
                  <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'restore', row: r })}>
                    {t('stf.restore')}
                  </Button>
                ) : r.deletable ? (
                  <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'delete', row: r })}>
                    {t('stf.delete')}
                  </Button>
                ) : canPublish ? (
                  <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'archive', row: r })}>
                    {t('stf.archive')}
                  </Button>
                ) : null}
              </View>
            </View>
          ))}
        </ListGroup>
      ) : list.isError ? (
        <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => list.refetch()}>{t('error.retry')}</Button>}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
      <ConfirmDialog visible={!!confirm} kind={confirm?.kind ?? 'archive'} item={confirm?.row.name ?? ''} loading={busy} onConfirm={act} onCancel={() => setConfirm(null)} />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space['4'], paddingBottom: space['2'] },
});
