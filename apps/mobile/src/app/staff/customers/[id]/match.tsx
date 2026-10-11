import { matchCaseDetailSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../../auth/AuthProvider';
import { Banner, Button, Card, ListGroup, ListRow, Skeleton, Text, TextField, useToast } from '../../../../components';
import { t } from '../../../../i18n';
import { problemText, useStaffQuery } from '../../../../staff/api';
import { humanize } from '../../../../staff/readable';
import { StaffScreen } from '../../../../staff/StaffScreen';

/** `/staff/customers/[id]/match` — STF-28: compare with the old app's record and record the decision. Nothing moves here. */
export default function MatchReview() {
  const { id, case: caseId } = useLocalSearchParams<{ id: string; case: string }>();
  const toast = useToast();
  const { session } = useAuth();
  const detail = useStaffQuery(['match', caseId], `/v1/staff/match-cases/${caseId}`, matchCaseDetailSchema, !!caseId);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'confirmed' | 'rejected' | null>(null);
  const m = detail.data;
  const open = m?.status === 'awaiting_clinic';

  async function resolve(outcome: 'confirmed' | 'rejected') {
    setBusy(outcome);
    try {
      await session.authed(`/v1/staff/match-cases/${caseId}/resolve`, { method: 'POST', body: { outcome, reason } });
      await detail.refetch();
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <StaffScreen title={t('match.titleShort')} back={{ to: `/staff/customers/${id}` as Href, label: t('cust.title') }}>
      {m ? (
        <>
          <Text variant="caption" tone="inkMuted">
            {m.reference}
          </Text>
          <Card>
            <Text variant="overline" tone="inkMuted">
              {t('match.new')}
            </Text>
            <Text variant="headline">{m.newRecord.name ?? '—'}</Text>
            <Text variant="caption">{m.newRecord.phone}</Text>
          </Card>
          {m.oldRecord ? (
            <>
              <ListGroup header={t('match.old')}>
                <ListRow title={m.oldRecord.name} subtitle={m.oldRecord.phone} chevron={false} />
                {m.oldRecord.items.map((i, n) => (
                  <ListRow key={n} title={i.title} value={i.value ?? undefined} chevron={false} />
                ))}
              </ListGroup>
              <Banner tone={m.sameName ? 'success' : 'warning'} title={m.sameName ? t('match.sameName') : t('match.diffName')} />
            </>
          ) : (
            <Banner tone="info" title={t('match.notConnected')} />
          )}
          <Banner tone="info" title={t('match.noValue')} />
          {open ? (
            <>
              <TextField label={t('match.reason')} value={reason} onChangeText={setReason} maxLength={500} />
              <View style={styles.actions}>
                <Button disabled={reason.trim().length < 3} loading={busy === 'confirmed'} onPress={() => resolve('confirmed')}>
                  {t('match.confirm')}
                </Button>
                <Button variant="secondary" disabled={reason.trim().length < 3} loading={busy === 'rejected'} onPress={() => resolve('rejected')}>
                  {t('match.reject')}
                </Button>
              </View>
            </>
          ) : (
            <Text variant="body">{t('match.state', { status: humanize(m.status) })}</Text>
          )}
        </>
      ) : detail.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({ actions: { gap: space['2'] } });
