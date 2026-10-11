import { importReviewSchema, type ImportReview, type ImportRow } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { AsyncStatus, Badge, Banner, Button, Card, Chip, ListGroup, ListRow, Skeleton, Text, useToast, type Tone } from '../../../components';
import { t } from '../../../i18n';
import { problemOf, problemText, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

const UUID = /^[0-9a-f-]{36}$/i;
type Filter = 'all' | 'new' | 'changed' | 'duplicate';
const DECISIONS = ['keep', 'replace', 'both', 'skip'] as const;
/** STF-42 / TAB-07 badge tones: new primary, changed warning, duplicate danger. */
const KIND_TONE: Record<ImportRow['kind'], Tone> = { new: 'primary', changed: 'warning', duplicate: 'danger', invalid: 'danger', conflict: 'warning', unchanged: 'neutral' };

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
  const [finished, setFinished] = useState<'publish' | 'submit' | null>(null);
  const toast = useToast();
  const back = { to: '/staff/import' as const, label: t('imp.title') };
  const set = (r: ImportReview) => queryClient.setQueryData(['staff', 'import', id], r);

  if (!q.data) return <StaffScreen title={t('imp.reviewTitle')} back={back}>{<Skeleton lines={6} media={false} />}</StaffScreen>;
  const r = q.data;

  async function decide(row: ImportRow, decision: (typeof DECISIONS)[number]) {
    try {
      const res = await session.authed(`/v1/staff/imports/${id}/decisions`, { method: 'PUT', body: { decisions: { [String(row.index)]: decision } } });
      set(importReviewSchema.parse(res.body));
    } catch (e) {
      setError(problemText(e));
    }
  }
  async function finish(action: 'publish' | 'submit') {
    setBusy(true);
    setError(null);
    try {
      const res = await session.authed(`/v1/staff/imports/${id}/${action}`, { method: 'POST', body: {} });
      setFinished(action);
      set(importReviewSchema.parse(res.body));
      await queryClient.invalidateQueries({ queryKey: ['staff', 'services'] });
    } catch (e) {
      const p = problemOf(e);
      setError(p.kind === 'conflict' ? t('imp.resolve', { count: r.counts.unresolved }) : (p.message ?? t('error.body')));
    } finally {
      setBusy(false);
    }
  }

  if (r.result) {
    // ST-11: "Catalogue published" only after a publish; an Editor's submit waits for the Owner.
    const published = (finished ?? (canPublish ? 'publish' : 'submit')) === 'publish';
    return (
      <StaffScreen title={t('imp.reviewTitle')} back={back}>
        <AsyncStatus
          state="success"
          title={published ? t('imp.doneTitle') : t('imp.submittedTitle')}
          actions={
            <Button fullWidth onPress={() => router.replace('/staff/services')}>
              {t('imp.open')}
            </Button>
          }
        >
          {published ? t('imp.doneBody', r.result) : t('imp.submittedBody', r.result)}
        </AsyncStatus>
      </StaffScreen>
    );
  }

  const rows = r.rows.filter((x) => filter === 'all' || x.kind === filter);
  const publishable = r.counts.new + r.counts.changed + r.rows.filter((x) => x.kind === 'duplicate' && (x.decision === 'replace' || x.decision === 'both')).length;
  const actions = (
    <View style={styles.actions}>
      {r.counts.unresolved ? (
        <Banner tone="warning" title={t('imp.resolveFirst')}>
          {t('imp.dupNote', { count: r.counts.duplicate })}
        </Banner>
      ) : null}
      {error ? <Banner tone="danger" title={error} /> : null}
      {/* Choices are saved on the server as they're made, so Save draft only leaves; nothing goes live. */}
      <Button variant="secondary" disabled={busy} onPress={() => (toast({ tone: 'success', message: t('imp.saved') }), router.replace('/staff/services'))}>
        {t('svc.saveDraft')}
      </Button>
      {canPublish ? (
        <Button loading={busy} disabled={!!r.counts.unresolved || !publishable} onPress={() => finish('publish')}>
          {t('imp.publish', { count: publishable })}
        </Button>
      ) : (
        <Button loading={busy} disabled={!!r.counts.unresolved || !publishable} onPress={() => finish('submit')}>
          {t('imp.submit')}
        </Button>
      )}
    </View>
  );
  return (
    <StaffScreen title={t('imp.reviewTitle')} back={back} aside={actions}>
      <View style={styles.tiles}>
        {([['new', 'imp.kind.new'], ['changed', 'imp.kind.changed'], ['duplicate', 'imp.duplicates']] as const).map(([k, label]) => (
          <View key={k} style={styles.tile}>
            <Card accessibilityLabel={`${t(label)}: ${r.counts[k]}`}>
              <Text variant="caption" tone="inkMuted">
                {t(label)}
              </Text>
              <Text variant="headline">{String(r.counts[k])}</Text>
            </Card>
          </View>
        ))}
      </View>
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
              <Badge tone={KIND_TONE[row.kind]}>{t(`imp.kind.${row.kind}`)}</Badge>
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
  tiles: { flexDirection: 'row', gap: space['2'] },
  tile: { flex: 1 },
  rowFoot: { gap: space['2'], paddingHorizontal: space['4'], paddingBottom: space['3'] },
  actions: { gap: space['2'] },
});
