import { categoryRowSchema, staffServiceRowSchema, type CategoryRow } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, Button, Chip, ConfirmDialog, Dialog, ListGroup, ListRow, Skeleton, Text, TextField, useToast } from '../../components';
import { ApiError } from '../../api/client';
import { t } from '../../i18n';
import { problemOf, useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';

/**
 * `/staff/taxonomy` — STF-04: rename, move a treatment, archive an empty category (D36). A category with
 * treatments shows the blocked state; the API refuses it too.
 */
export default function Taxonomy() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canPublish = !!me?.permissions.includes('content.publish');
  const cats = useStaffQuery(['categories'], '/v1/staff/categories', z.array(categoryRowSchema));
  const services = useStaffQuery(['services', 'all', ''], '/v1/staff/services?filter=all', z.array(staffServiceRowSchema));
  const [rename, setRename] = useState<{ row: CategoryRow; name: string } | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'restore' | 'delete'; row: CategoryRow } | null>(null);
  const [blocked, setBlocked] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['staff', 'categories'] }), queryClient.invalidateQueries({ queryKey: ['staff', 'services'] })]);
  async function call(path: string, body: object, method: 'POST' | 'PUT' = 'POST') {
    setBusy(true);
    try {
      await session.authed(path, { method, body });
      await refresh();
      return true;
    } catch (e) {
      const p = problemOf(e);
      toast({ tone: 'warning', message: p.kind === 'conflict' && e instanceof ApiError ? t('stf.conflict') : t('error.body') });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function move(serviceId: string, version: number, categoryId: string) {
    if (await call(`/v1/staff/services/${serviceId}/move`, { version, categoryId })) setBlocked(null);
  }

  return (
    <StaffScreen title={t('cat.title')}>
      {cats.data ? (
        <ListGroup>
          {cats.data.map((c) => (
            <View key={c.id}>
              <ListRow
                title={c.name}
                subtitle={c.archived ? t('stf.archived') : c.treatments ? t('cat.count', { count: c.treatments }) : t('cat.empty')}
                chevron={false}
                onPress={canPublish && !c.archived ? () => setRename({ row: c, name: c.name }) : undefined}
              />
              {canPublish ? (
                <View style={styles.rowActions}>
                  {c.archived ? (
                    <Button variant="tertiary" size="sm" onPress={() => setConfirm({ kind: 'restore', row: c })}>
                      {t('stf.restore')}
                    </Button>
                  ) : (
                    <>
                      <Button variant="tertiary" size="sm" onPress={() => setRename({ row: c, name: c.name })}>
                        {t('cat.rename')}
                      </Button>
                      <Button variant="tertiary" size="sm" onPress={() => (c.treatments ? setBlocked(c) : setConfirm({ kind: c.deletable ? 'delete' : 'archive', row: c }))}>
                        {c.deletable ? t('stf.delete') : t('stf.archive')}
                      </Button>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </ListGroup>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
      {canPublish ? (
        <Button icon="pencil-simple" onPress={() => setCreating('')}>
          {t('cat.new')}
        </Button>
      ) : null}

      {blocked ? (
        <View style={styles.blocked}>
          <Banner tone="warning" title={t('cat.blockedTitle', { name: blocked.name })}>
            {t('cat.blockedBody', { count: blocked.treatments })}
          </Banner>
          {(services.data ?? [])
            .filter((s) => s.categoryName === blocked.name)
            .map((s) => (
              <View key={s.id} style={styles.move}>
                <Text variant="label">{t('cat.move', { name: s.name })}</Text>
                <View style={styles.chips}>
                  {(cats.data ?? [])
                    .filter((c) => c.id !== blocked.id && !c.archived)
                    .map((c) => (
                      <Chip key={c.id} onPress={() => move(s.id, s.version, c.id)}>
                        {c.name}
                      </Chip>
                    ))}
                </View>
              </View>
            ))}
        </View>
      ) : null}

      <Dialog
        visible={!!rename}
        title={t('cat.rename')}
        confirmLabel={t('cat.save')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onCancel={() => setRename(null)}
        onConfirm={async () => {
          if (rename && (await call(`/v1/staff/categories/${rename.row.id}`, { version: rename.row.version, name: rename.name }, 'PUT'))) setRename(null);
        }}
      >
        <TextField label={t('cat.name')} helper={t('cat.renameHelp')} value={rename?.name ?? ''} onChangeText={(v) => setRename((r) => (r ? { ...r, name: v } : r))} maxLength={60} />
      </Dialog>
      <Dialog
        visible={creating !== null}
        title={t('cat.new')}
        confirmLabel={t('cat.save')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onCancel={() => setCreating(null)}
        onConfirm={async () => {
          if (await call('/v1/staff/categories', { name: creating ?? '' })) setCreating(null);
        }}
      >
        <TextField label={t('cat.name')} value={creating ?? ''} onChangeText={setCreating} maxLength={60} />
      </Dialog>
      <ConfirmDialog
        visible={!!confirm}
        kind={confirm?.kind ?? 'archive'}
        item={confirm?.row.name ?? ''}
        loading={busy}
        affects={[t('confirm.audit')]}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm && (await call(`/v1/staff/categories/${confirm.row.id}/${confirm.kind}`, { version: confirm.row.version }))) setConfirm(null);
        }}
      />
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space['2'], paddingHorizontal: space['4'], paddingBottom: space['2'] },
  blocked: { gap: space['3'] },
  move: { gap: space['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
