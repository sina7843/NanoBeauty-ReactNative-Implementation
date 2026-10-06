import { requestDetailSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { Badge, Banner, Button, Dialog, ListGroup, ListRow, Skeleton, Text, TextField, useToast } from '../../../components';
import { t } from '../../../i18n';
import { clinicDate, clinicTime } from '../../../i18n/format';
import { useSettings } from '../../../settings/useSettings';
import { problemOf, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

type To = 'in_progress' | 'approved' | 'declined' | 'call_needed' | 'done';

/**
 * `/staff/requests/[id]` — STF-24. Hand-off mode: the app can't move a Fresha booking, so staff move it in Fresha
 * and then mark the request done. The customer hears the outcome only after staff record it.
 */
export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const handoff = (settings.data?.data.settings.bookingMode ?? 'handoff') === 'handoff';
  const detail = useStaffQuery(['request', id], `/v1/staff/requests/${id}`, requestDetailSchema, !!id);
  const [busy, setBusy] = useState<To | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const r = detail.data;
  const open = r && !['declined', 'done'].includes(r.status);

  async function move(to: To) {
    setBusy(to);
    try {
      await session.authed(`/v1/staff/requests/${id}/transition`, { method: 'POST', body: to === 'declined' ? { to, reason } : { to } });
      await detail.refetch();
      queryClient.invalidateQueries({ queryKey: ['staff', 'today'] });
      setDeclining(false);
    } catch (e) {
      const p = problemOf(e);
      toast({ tone: 'warning', message: p.kind === 'conflict' ? t('stf.conflict') : t('error.body') });
    } finally {
      setBusy(null);
    }
  }

  return (
    <StaffScreen title={t('req.detail')} back={{ to: '/staff/today', label: t('stf.today') }}>
      {r ? (
        <>
          <View style={styles.row}>
            <Badge tone={r.status === 'done' ? 'success' : r.status === 'declined' ? 'neutral' : 'info'}>{t(`req.status.${r.status}`)}</Badge>
            {r.late ? <Badge tone="warning">{t('today.late')}</Badge> : null}
          </View>
          <Text variant="titleLg">{t(r.type === 'cancel' ? 'req.cancel' : 'req.change')}</Text>
          <Text variant="body">“{r.message}”</Text>
          {handoff && open ? <Banner tone="info" title={t('req.handoff')} /> : null}
          <Banner tone={r.late ? 'warning' : 'info'} title={r.lateRule} />
          <ListGroup>
            <ListRow title={r.customer.name} subtitle={`${r.customer.phone} · ${t('req.pastVisits', { count: r.customer.pastVisits })}`} chevron={false} />
            <ListRow title={r.visit.service} subtitle={[`${clinicDate(r.visit.at, tz)} ${clinicTime(r.visit.at, tz)}`, r.visit.professional, r.visit.ref].filter(Boolean).join(' · ')} chevron={false} />
          </ListGroup>
          {open ? (
            <View style={styles.actions}>
              {r.status !== 'approved' ? (
                <Button loading={busy === 'approved'} onPress={() => move('approved')}>
                  {t('req.approve')}
                </Button>
              ) : null}
              {r.freshaUrl ? (
                <Button variant="secondary" icon="arrow-square-out" onPress={() => Linking.openURL(r.freshaUrl!)}>
                  {t('req.openFresha')}
                </Button>
              ) : null}
              <Button variant="secondary" loading={busy === 'done'} onPress={() => move('done')}>
                {t('req.markDone')}
              </Button>
              {r.status !== 'approved' ? (
                <>
                  <Button variant="tertiary" loading={busy === 'call_needed'} onPress={() => move('call_needed')}>
                    {t('req.callNeeded')}
                  </Button>
                  <Button variant="tertiary" onPress={() => setDeclining(true)}>
                    {t('req.decline')}
                  </Button>
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : detail.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
      <Dialog
        visible={declining}
        title={t('req.decline')}
        confirmLabel={t('req.decline')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy === 'declined'}
        onConfirm={() => (reason.trim().length >= 3 ? move('declined') : undefined)}
        onCancel={() => setDeclining(false)}
      >
        <TextField label={t('req.declineReason')} value={reason} onChangeText={setReason} multiline maxLength={500} />
      </Dialog>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space['2'], flexWrap: 'wrap' },
  actions: { gap: space['2'] },
});
