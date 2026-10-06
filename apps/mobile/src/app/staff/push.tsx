import { pushListSchema, pushMessageSchema } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { newIdempotencyKey } from '../../booking/visits';
import { Banner, Button, ListGroup, ListRow, Skeleton, TextField, useToast } from '../../components';
import { t } from '../../i18n';
import { clinicDateTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';
import { problemOf, useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';
import { WallTimeField } from '../../staff/WallTimeField';

/** `/staff/push` — STF-35. Only people who said yes to offers; delivery (quiet hours, devices) is the notification service. */
export default function Push() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const list = useStaffQuery(['push'], '/v1/staff/push', pushListSchema);
  const [text, setText] = useState('');
  const [opens, setOpens] = useState('/offers');
  const [sendAt, setSendAt] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const [busy, setBusy] = useState(false);
  const audience = list.data?.audience ?? 0;

  async function schedule() {
    setBusy(true);
    try {
      const p = pushMessageSchema.parse((await session.authed('/v1/staff/push', { method: 'POST', body: { text: text.trim(), opens: opens.trim(), sendAt, idempotencyKey: key } })).body);
      toast({ tone: 'success', message: t('push.scheduled', { count: p.audienceCount }) });
      setText('');
      setKey(newIdempotencyKey());
      queryClient.invalidateQueries({ queryKey: ['staff', 'push'] });
    } catch (e) {
      problemOf(e);
      toast({ tone: 'warning', message: t('error.body') });
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string, version: number) {
    try {
      await session.authed(`/v1/staff/push/${id}/cancel`, { method: 'POST', body: { version } });
      queryClient.invalidateQueries({ queryKey: ['staff', 'push'] });
    } catch (e) {
      problemOf(e);
      toast({ tone: 'warning', message: t('error.body') });
    }
  }

  return (
    <StaffScreen title={t('stf.push')}>
      {list.data ? (
        <>
          <Banner tone={audience ? 'info' : 'warning'} title={audience ? t('push.audience', { count: audience }) : t('push.audienceNone')}>
            {t('push.delivery')}
          </Banner>
          <TextField label={t('push.text')} value={text} onChangeText={setText} maxLength={110} helper={`${text.length}/110`} />
          <TextField label={t('push.opens')} value={opens} onChangeText={setOpens} autoCapitalize="none" />
          <WallTimeField label={t('push.when')} iso={sendAt} tz={tz} onChange={setSendAt} />
          <Button loading={busy} disabled={!audience || text.trim().length < 5 || !opens.startsWith('/')} onPress={schedule}>
            {t('push.schedule')}
          </Button>
          <ListGroup>
            {list.data.messages.map((m) => (
              <ListRow
                key={m.id}
                title={m.text}
                subtitle={`${t(`push.status.${m.status}`)} · ${clinicDateTime(m.sendAt, tz)} · ${m.audienceCount}`}
                value={m.status === 'scheduled' ? t('push.cancel') : undefined}
                chevron={false}
                onPress={m.status === 'scheduled' ? () => cancel(m.id, m.version) : undefined}
              />
            ))}
          </ListGroup>
        </>
      ) : list.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={4} media={false} />
      )}
    </StaffScreen>
  );
}
