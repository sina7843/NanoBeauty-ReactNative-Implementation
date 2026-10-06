import { approvalsResponseSchema } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { AsyncStatus, Banner, Button, Card, Skeleton, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { problemOf, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/approvals/[id]` — STF-09 (approve, reject). Sending back needs a reason; never decide your own submission. */
export default function ApprovalDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useStaffQuery(['approvals'], '/v1/staff/approvals', approvalsResponseSchema);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const back = { to: '/staff/approvals' as Href, label: t('appr.title') };

  if (!q.data) return <StaffScreen title={t('appr.detail')} back={back}>{<Skeleton lines={4} media={false} />}</StaffScreen>;
  const a = q.data.waiting.find((x) => x.id === id);
  if (!a && !done) return <Redirect href="/staff/approvals" />;

  async function decide(decision: 'approve' | 'reject') {
    if (decision === 'reject' && reason.trim().length < 3) {
      setError(t('appr.reason'));
      return;
    }
    setBusy(true);
    try {
      await session.authed(`/v1/staff/approvals/${id}/decide`, { method: 'POST', body: decision === 'approve' ? { decision } : { decision, reason: reason.trim() } });
      setDone(decision === 'approve' ? 'approved' : 'rejected');
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch (e) {
      problemOf(e);
      setError(t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <StaffScreen title={t('appr.detail')} back={back}>
        <AsyncStatus state="success" title={done === 'approved' ? t('svc.published') : t('appr.reject')} actions={<Button fullWidth onPress={() => router.replace('/staff/approvals')}>{t('appr.done')}</Button>} />
      </StaffScreen>
    );
  }
  return (
    <StaffScreen title={t('appr.detail')} back={back}>
      <Card>
        <Text variant="titleLg">{a!.itemName}</Text>
        <Text variant="body">{a!.summary}</Text>
        <Text variant="caption" tone="inkMuted">
          {t('appr.by', { name: a!.submittedBy })}
        </Text>
      </Card>
      <Button variant="tertiary" onPress={() => router.push(`/staff/services/${a!.itemId}` as Href)}>
        {t('svc.preview')}
      </Button>
      {a!.submittedByMe ? (
        <Banner tone="info" title={t('appr.notYours')} />
      ) : (
        <>
          <Text variant="caption" tone="inkMuted">
            {t('svc.publishBody')}
          </Text>
          <Button loading={busy && !rejecting} onPress={() => decide('approve')}>
            {t('appr.approve')}
          </Button>
          {rejecting ? (
            <TextField label={t('appr.reason')} value={reason} onChangeText={(v) => (setReason(v), setError(undefined))} error={error} multiline maxLength={500} />
          ) : null}
          <Button variant="secondary" loading={busy && rejecting} onPress={() => (rejecting ? decide('reject') : setRejecting(true))}>
            {t('appr.reject')}
          </Button>
        </>
      )}
    </StaffScreen>
  );
}
