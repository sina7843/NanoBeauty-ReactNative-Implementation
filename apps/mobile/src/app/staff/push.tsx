import { pushListSchema, pushMessageSchema } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { newIdempotencyKey } from '../../booking/visits';
import { Banner, Button, Card, ListGroup, ListRow, Skeleton, Text, TextField, useToast } from '../../components';
import { t } from '../../i18n';
import { clinicDateTime } from '../../i18n/format';
import { useSettings } from '../../settings/useSettings';
import { problemText, useStaffQuery } from '../../staff/api';
import { DEFAULT_PUSH_OPENS, validPushOpens } from '../../staff/pushLink';
import { StaffScreen } from '../../staff/StaffScreen';
import { WallTimeField } from '../../staff/WallTimeField';
import { analytics, sizeBand } from '../../lib/analytics';

/** `/staff/push` — STF-35. Only people who said yes to offers; delivery (quiet hours, devices) is the notification service. */
export default function Push() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const settings = useSettings();
  const tz = settings.data?.data.clinic.timezone ?? 'America/Vancouver';
  const list = useStaffQuery(['push'], '/v1/staff/push', pushListSchema);
  const [text, setText] = useState('');
  const [opens, setOpens] = useState(DEFAULT_PUSH_OPENS);
  const [dateOk, setDateOk] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mode = settings.data?.data.settings.bookingMode;
  const opensOk = validPushOpens(opens, mode);
  const [sendAt, setSendAt] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const [busy, setBusy] = useState(false);
  const audience = list.data?.audience ?? 0;

  async function schedule() {
    setBusy(true);
    setError(null);
    try {
      const p = pushMessageSchema.parse((await session.authed('/v1/staff/push', { method: 'POST', body: { text: text.trim(), opens: opens.trim(), sendAt, scheduled: sendAt !== null, idempotencyKey: key } })).body);
      toast({ tone: 'success', message: t('push.scheduled', { count: p.audienceCount }) });
      const offer = /^\/offers\/([^/?]+)/.exec(p.opens)?.[1];
      analytics.track('push_sent', { audience_size_band: sizeBand(p.audienceCount), ...(offer ? { offer_id: offer } : {}) });
      setText('');
      setKey(newIdempotencyKey());
      queryClient.invalidateQueries({ queryKey: ['staff', 'push'] });
    } catch (e) {
      setError(problemText(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string, version: number) {
    try {
      await session.authed(`/v1/staff/push/${id}/cancel`, { method: 'POST', body: { version } });
      queryClient.invalidateQueries({ queryKey: ['staff', 'push'] });
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
    }
  }

  return (
    <StaffScreen
      title={t('push.title')}
      aside={
        list.data ? (
          <>
            <Card>
              <Text variant="overline" tone="inkMuted">
                {t('push.preview')}
              </Text>
              <Text variant="label">{t('push.previewFrom')}</Text>
              <Text variant="body">{text.trim() || t('push.previewEmpty')}</Text>
              <Text variant="caption" tone="inkMuted">
                {t('push.previewOpens', { path: opens.trim() || '—' })}
              </Text>
            </Card>
            <Button loading={busy} disabled={!audience || text.trim().length < 5 || !opensOk || !dateOk} onPress={schedule}>
              {t('push.schedule')}
            </Button>
          </>
        ) : null
      }
    >
      {list.data ? (
        <>
          <Banner tone={audience ? 'info' : 'warning'} title={audience ? t('push.audience', { count: audience }) : t('push.audienceNone')}>
            {t('push.delivery')}
          </Banner>
          <TextField label={t('push.text')} value={text} onChangeText={setText} maxLength={110} helper={`${text.length}/110`} />
          <TextField label={t('push.opens')} value={opens} onChangeText={setOpens} autoCapitalize="none" error={opensOk ? undefined : t('push.opensInvalid')} />
          <WallTimeField label={t('push.when')} iso={sendAt} tz={tz} onChange={setSendAt} onValidity={setDateOk} />
          {error ? (
            <Banner tone="danger" title={t('push.notScheduled')}>
              {error}
            </Banner>
          ) : null}
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
