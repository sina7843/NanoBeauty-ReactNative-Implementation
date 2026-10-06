import { importReviewSchema, type ImportReview, type ImportRow } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { AsyncStatus, Badge, Banner, Button, Chip, ListGroup, ListRow, Skeleton, Text } from '../../../components';
import { t } from '../../../i18n';
import { problemOf, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

const UUID = /^[0-9a-f-]{36}$/i;
type Filter = 'all' | 'new' | 'changed' | 'duplicate';
const DECISIONS = ['keep', 'replace', 'both', 'skip'] as const;

/**
 * `/staff/import/review?id=` — STF-42 (review, conflicts, published) with TAB-07 two columns on tablets. Duplicates
 * must be resolved before the Owner publishes; an Editor submits everything for approval instead.
 */
export default function ImportReviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id || !UUID.test(id)) return <Redirect href="/staff/import" />;
  return <Review id={id} />;
}

function Review({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canPublish = !!me?.permissions.includes('content.publish');
  const q = useStaffQuery(['import', id], `/v1/staff/imports/${id}/review`, importReviewSchema);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = { to: '/staff/import' as const, label: t('imp.title') };
  const set = (r: ImportReview) => queryClient.setQueryData(['staff', 'import', id], r);

  if (!q.data) return <StaffScreen title={t('imp.reviewTitle')} back={back}>{<Skeleton lines={6} media={false} />}</StaffScreen>;
  const r = q.data;

  async function decide(row: ImportRow, decision: (typeof DECISIONS)[number]) {
    try {
      const res = await session.authed(`/v1/staff/imports/${id}/decisions`, { method: 'PUT', body: { decisions: { [String(row.index)]: decision } } });
      set(importReviewSchema.parse(res.body));
    } catch (e) {
      problemOf(e);
      setError(t('error.body'));
    }
  }
  async function finish(action: 'publish' | 'submit') {
    setBusy(true);
    setError(null);
    try {
      const res = await session.authed(`/v1/staff/imports/${id}/${action}`, { method: 'POST', body: {} });
      set(importReviewSchema.parse(res.body));
      await queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
    } catch (e) {
      const p = problemOf(e);
      setError(p.kind === 'conflict' ? t('imp.resolve', { count: r.counts.unresolved }) : t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  if (r.result) {
    return (
      <StaffScreen title={t('imp.reviewTitle')} back={back}>
        <AsyncStatus
          state="success"
          title={t('imp.doneTitle')}
          actions={
            <Button fullWidth onPress={() => router.replace('/staff/services')}>
              {t('imp.open')}
            </Button>
          }
        >
          {t('imp.doneBody', r.result)}
        </AsyncStatus>
      </StaffScreen>
    );
  }

  const rows = r.rows.filter((x) => filter === 'all' || x.kind === filter);
  const publishable = r.counts.new + r.counts.changed + r.rows.filter((x) => x.kind === 'duplicate' && (x.decision === 'replace' || x.decision === 'both')).length;
  const actions = (
    <View style={styles.actions}>
      {r.counts.unresolved ? (
        <Banner tone="warning" title={t('imp.resolve', { count: r.counts.unresolved })}>
          {t('imp.dupNote', { count: r.counts.duplicate })}
        </Banner>
      ) : null}
      {error ? <Banner tone="danger" title={error} /> : null}
      {canPublish ? (
        <Button loading={busy} disabled={!!r.counts.unresolved || !publishable} onPress={() => finish('publish')}>
          {t('imp.publish', { count: publishable })}
        </Button>
      ) : null}
      <Button variant={canPublish ? 'secondary' : 'primary'} loading={busy} disabled={!!r.counts.unresolved || !publishable} onPress={() => finish('submit')}>
        {t('imp.submit')}
      </Button>
    </View>
  );
  return (
    <StaffScreen title={t('imp.reviewTitle')} back={back} aside={actions}>
      <View style={styles.chips}>
        {(['all', 'new', 'changed', 'duplicate'] as Filter[]).map((f) => (
          <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>
            {f === 'all' ? `${t('stf.all')} ${r.rows.length}` : `${t(`imp.kind.${f}`)} ${r.counts[f]}`}
          </Chip>
        ))}
      </View>
      <ListGroup>
        {rows.map((row) => (
          <View key={row.index}>
            <ListRow title={row.name || '—'} subtitle={[row.category, row.detail].filter(Boolean).join(' · ')} chevron={false} />
            <View style={styles.rowFoot}>
              <Badge tone={row.kind === 'new' ? 'success' : row.kind === 'changed' ? 'info' : row.kind === 'duplicate' || row.kind === 'conflict' ? 'warning' : 'neutral'}>{t(`imp.kind.${row.kind}`)}</Badge>
              {row.kind === 'duplicate' ? (
                <View style={styles.chips}>
                  {DECISIONS.map((d) => (
                    <Chip key={d} selected={row.decision === d} onPress={() => decide(row, d)}>
                      {t(`imp.${d}`)}
                    </Chip>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </ListGroup>
      <Text variant="caption" tone="inkMuted">
        {t('imp.nothingLive')}
      </Text>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  rowFoot: { gap: space['2'], paddingHorizontal: space['4'], paddingBottom: space['3'] },
  actions: { gap: space['2'] },
});
