import { entityRowSchema, type EntityRow, type Permission } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Button, ConfirmDialog, EmptyState, ListGroup, ListRow, SearchField, SegmentedControl, Skeleton, Text, useToast } from '../components';
import { t } from '../i18n';
import { problemText, useStaffQuery } from './api';
import { DEFAULT_FILTERS, type ListFilter } from './filters';
import { PublishState } from './Governance';
import type { EntityPlural } from './useEntityEditor';


/** STF-05/15/19/21/33 lists: filter, search, open, and STF-39 archive / restore / delete-draft (D36). */
export function EntityList({
  plural,
  basePath,
  publishPermission,
  archivable = true,
  header,
  onCreate,
  creating,
  newLabel,
  render,
  filters = DEFAULT_FILTERS,
}: {
  plural: EntityPlural;
  /** App route when it differs from the API name (STF-10 articles live at /staff/support-content). */
  basePath?: string;
  publishPermission: Permission;
  archivable?: boolean;
  header?: ReactNode;
  onCreate?: () => void;
  creating?: boolean;
  newLabel?: string;
  /** Replaces the plain list (campaign calendar view). */
  render?: (rows: EntityRow[]) => ReactNode;
  /** Per-screen filter chips (ST-21); the default is All / Live / Draft / Archived. */
  filters?: ListFilter[];
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canPublish = !!me?.permissions.includes(publishPermission);
  const [filter, setFilter] = useState<ListFilter>(filters[0]!);
  const [q, setQ] = useState('');
  const list = useStaffQuery([plural, 'list', filter.server, q], `/v1/staff/${plural}?filter=${filter.server}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`, z.array(entityRowSchema));
  const rows = list.data && filter.keep ? list.data.filter(filter.keep) : list.data;
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'restore' | 'delete'; row: EntityRow } | null>(null);
  const [busy, setBusy] = useState(false);

  async function act() {
    if (!confirm) return;
    setBusy(true);
    try {
      await session.authed(`/v1/staff/${plural}/${encodeURIComponent(confirm.row.id)}/${confirm.kind}`, { method: 'POST', body: { version: confirm.row.version } });
      await queryClient.invalidateQueries({ queryKey: ['staff', plural] });
    } catch (e) {
      // The server's own sentence ("Customers have seen this: archive it instead."), not a version conflict (ST-8).
      toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <SearchField value={q} onChangeText={setQ} placeholder={t('stf.searchAll')} />
      {archivable ? (
        <SegmentedControl label={t('stf.all')} options={filters.map((f) => t(f.label))} value={t(filter.label)} onChange={(v) => setFilter(filters.find((f) => t(f.label) === v)!)} />
      ) : null}
      {onCreate ? (
        <View style={styles.actions}>
          <Button icon="pencil-simple" loading={creating} onPress={onCreate}>
            {newLabel ?? t('stf.new')}
          </Button>
        </View>
      ) : null}
      {header}
      {rows ? (
        rows.length === 0 ? (
          <EmptyState title={t('stf.nothingHere')} />
        ) : render ? (
          render(rows)
        ) : (
          <ListGroup>
            {rows.map((r) => (
              <View key={r.id}>
                <ListRow title={r.name} subtitle={[r.subtitle, r.hasDraft ? t('stf.edited') : null].filter(Boolean).join(' · ')} onPress={() => router.push(`${basePath ?? `/staff/${plural}`}/${encodeURIComponent(r.id)}` as Href)} />
                <View style={styles.rowActions}>
                  <PublishState state={r.state} phase={r.phase} />
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
      {filter.server === 'archived' ? (
        <Text variant="caption" tone="inkMuted">
          {t('stf.restoreDraft')}
        </Text>
      ) : null}
      <ConfirmDialog visible={!!confirm} kind={confirm?.kind ?? 'archive'} item={confirm?.row.name ?? ''} loading={busy} onConfirm={act} onCancel={() => setConfirm(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space['4'], paddingBottom: space['2'] },
});
