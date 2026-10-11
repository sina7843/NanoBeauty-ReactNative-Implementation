import { inboxThreadSchema, type InboxThread } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { newIdempotencyKey } from '../../../booking/visits';
import { Badge, Banner, Button, Card, SegmentedControl, Skeleton, Text, TextField, useToast } from '../../../components';
import { t } from '../../../i18n';
import { calendarDate } from '../../../i18n/format';
import { problemText, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

const CHANNELS = ['text', 'email', 'app'] as const;

/** `/staff/inbox/[id]` — STF-30. A reply that didn't go out is shown as failed, never as sent (NTF-10). */
export default function InboxThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const thread = useStaffQuery(['inbox-thread', id], `/v1/staff/inbox/${id}`, inboxThreadSchema, !!id);
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<(typeof CHANNELS)[number] | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const [busy, setBusy] = useState(false);
  const m = thread.data;
  const via = channel ?? m?.channel ?? 'text';

  async function call(path: string, method: 'POST' | 'PUT', body: object) {
    setBusy(true);
    try {
      const next: InboxThread = inboxThreadSchema.parse((await session.authed(path, { method, body })).body);
      queryClient.setQueryData(['staff', 'inbox-thread', id], next);
      queryClient.invalidateQueries({ queryKey: ['staff', 'inbox'] });
      return next;
    } catch (e) {
      toast({ tone: 'danger', message: problemText(e) });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffScreen title={t('inbox.thread')} back={{ to: '/staff/inbox', label: t('stf.inbox') }}>
      {m ? (
        <>
          <View style={styles.row}>
            <Badge tone={m.status === 'done' ? 'success' : 'info'}>{t(`inbox.status.${m.status}`)}</Badge>
            <Text variant="caption" tone="inkMuted">
              {m.reference} · {calendarDate(m.createdAt.slice(0, 10))}
            </Text>
          </View>
          <Text variant="headline">{`${m.customer} · ${m.topic}`}</Text>
          {me?.permissions.includes('customers.view') ? (
            <Button variant="tertiary" size="sm" onPress={() => router.push(`/staff/customers/${m.customerId}` as Href)}>
              {t('inbox.openProfile')}
            </Button>
          ) : null}
          <Card>
            <Text variant="body">{m.message}</Text>
          </Card>
          {m.replies.map((r) => (
            <Card key={r.id}>
              <Text variant="caption" tone="inkMuted">
                {`${r.by} · ${t(`inbox.channel.${r.channel}`)}`}
              </Text>
              <Text variant="body">{r.message}</Text>
              {r.delivery === 'failed' ? <Banner tone="warning" title={t('inbox.failed')} /> : r.delivery === 'pending' ? <Banner tone="info" title={t('inbox.pending')} /> : null}
            </Card>
          ))}
          <SegmentedControl label={t('inbox.via')} options={CHANNELS.map((c) => t(`inbox.channel.${c}`))} value={t(`inbox.channel.${via}`)} onChange={(v) => setChannel(CHANNELS.find((c) => t(`inbox.channel.${c}`) === v)!)} />
          <TextField label={t('inbox.reply')} value={message} onChangeText={setMessage} multiline maxLength={2000} />
          <Button
            loading={busy}
            disabled={message.trim().length < 2}
            onPress={async () => {
              const next = await call(`/v1/staff/inbox/${id}/replies`, 'POST', { message: message.trim(), channel: via, idempotencyKey: key });
              if (next) {
                setMessage('');
                setKey(newIdempotencyKey());
              }
            }}
          >
            {t('inbox.send')}
          </Button>
          <Button variant="secondary" disabled={busy} onPress={() => call(`/v1/staff/inbox/${id}/status`, 'PUT', { status: m.status === 'done' ? 'in_progress' : 'done' })}>
            {m.status === 'done' ? t('inbox.reopen') : t('inbox.markDone')}
          </Button>
        </>
      ) : thread.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' } });
