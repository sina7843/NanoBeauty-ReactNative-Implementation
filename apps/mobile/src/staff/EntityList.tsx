import { entityRowSchema, type EntityRow, type Permission } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { Badge, Banner, Button, ConfirmDialog, EmptyState, ListGroup, ListRow, SearchField, SegmentedControl, Skeleton, Text, useToast } from '../components';
import { t, type StringKey } from '../i18n';
import { problemOf, useStaffQuery } from './api';
import type { EntityPlural } from './useEntityEditor';

const FILTERS = ['all', 'live', 'draft', 'archived'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL = { all: 'stf.all', live: 'stf.live', draft: 'stf.drafts', archived: 'stf.archived' } as const;

export const stateBadge = (state: EntityRow['state'], phase?: string | null) => (
  <Badge tone={phase === 'paused' || phase === 'ended' ? 'neutral' : state === 'live' ? 'success' : state === 'review' ? 'warning' : state === 'archived' ? 'neutral' : 'info'}>
    {phase ? t(`stf.phase.${phase}` as StringKey) : t(`stf.state.${state}`)}
  </Badge>
);

/** STF-05/15/19/21/33 lists: filter, search, open, and STF-39 archive / restore / delete-draft (D36). */
export function EntityList({
  plural,
  publishPermission,
  archivable = true,
  header,
  onCreate,
  creating,
  newLabel,
  render,
}: {
  plural: EntityPlural;
  publishPermission: Permission;
  archivable?: boolean;
  header?: ReactNode;
  onCreate?: () => void;
  creating?: boolean;
  newLabel?: string;
  /** Replaces the plain list (campaign calendar view). */
  render?: (rows: EntityRow[]) => ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canPublish = !!me?.permissions.includes(publishPermission);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const list = useStaffQuery([plural, 'list', filter, q], `/v1/staff/${plural}?filter=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`, z.array(entityRowSchema));
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'restore' | 'delete'; row: EntityRow } | null>(null);
  const [busy, setBusy] = useState(false);

  async function act() {
    if (!confirm) return;
    setBusy(true);
    try {
      await session.authed(`/v1/staff/${plural}/${encodeURIComponent(confirm.row.id)}/${confirm.kind}`, { method: 'POST', body: { version: confirm.row.version } });
      await queryClient.invalidateQueries({ queryKey: ['staff', plural] });
    } catch (e) {
      const p = problemOf(e);
      toast({ tone: 'warning', message: p.kind === 'conflict' ? t('stf.conflict') : t('error.body') });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <SearchField value={q} onChangeText={setQ} placeholder={t('stf.searchAll')} />
      {archivable ? (
        <SegmentedControl label={t('stf.all')} options={FILTERS.map((f) => t(FILTER_LABEL[f]))} value={t(FILTER_LABEL[filter])} onChange={(v) => setFilter(FILTERS.find((f) => t(FILTER_LABEL[f]) === v)!)} />
      ) : null}
      {onCreate ? (
        <View style={styles.actions}>
          <Button icon="pencil-simple" loading={creating} onPress={onCreate}>
            {newLabel ?? t('stf.new')}
          </Button>
        </View>
      ) : null}
      {header}
      {list.data ? (
        list.data.length === 0 ? (
          <EmptyState title={t('stf.nothingHere')} />
        ) : render ? (
          render(list.data)
        ) : (
          <ListGroup>
            {list.data.map((r) => (
              <View key={r.id}>
                <ListRow title={r.name} subtitle={[r.subtitle, r.hasDraft ? t('stf.edited') : null].filter(Boolean).join(' · ')} onPress={() => router.push(`/staff/${plural}/${encodeURIComponent(r.id)}` as Href)} />
                <View style={styles.rowActions}>
                  {stateBadge(r.state, r.phase)}
                  {!archivable ? null : r.state === 'archived' && canPublish ? (
                    <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'restore', row: r })}>
                      {t('stf.restore')}
                    </Button>
                  ) : r.deletable ? (
                    <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'delete', row: r })}>
                      {t('stf.delete')}
                    </Button>
                  ) : canPublish && r.state !== 'archived' ? (
                    <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'archive', row: r })}>
                      {t('stf.archive')}
                    </Button>
                  ) : null}
                </View>
              </View>
            ))}
          </ListGroup>
        )
      ) : list.isError ? (
        <Banner
          tone="danger"
          title={t('error.title')}
          action={
            <Button variant="secondary" size="sm" onPress={() => list.refetch()}>
              {t('error.retry')}
            </Button>
          }
        >
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
      {filter === 'archived' ? (
        <Text variant="caption" tone="inkMuted">
          {t('stf.restoreDraft')}
        </Text>
      ) : null}
      <ConfirmDialog visible={!!confirm} kind={confirm?.kind ?? 'archive'} item={confirm?.row.name ?? ''} loading={busy} onConfirm={act} onCancel={() => setConfirm(null)} affects={[t('confirm.audit')]} />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space['4'], paddingBottom: space['2'] },
});
