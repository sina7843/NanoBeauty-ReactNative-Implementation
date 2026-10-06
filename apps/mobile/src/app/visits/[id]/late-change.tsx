import { visitRequestSchema, type Visit, type VisitRequest, type VisitsResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { AsyncStatus, Banner, Button, ListGroup, ListRow, Screen, SegmentedControl, SupportContext, Text, TextField } from '../../../components';
import { VisitGate } from '../../../booking/VisitGate';
import { newIdempotencyKey, outcomeText } from '../../../booking/visits';
import { hoursLabel } from '../../../content/clinic';
import { t } from '../../../i18n';
import { useIsOnline } from '../../../lib/network';
import { useSettings } from '../../../settings/useSettings';

/**
 * `/visits/[id]/late-change` — VIS-06. Inside the free-change window changes go through the clinic: call/text,
 * or send a request to the clinic queue (BOOK 18). A request never moves or cancels the visit by itself.
 */
export default function LateChange() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('late.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen topInset={false}>
          <VisitGate id={id}>{(visit, data, offline) => <Late visit={visit} data={data} offline={offline} />}</VisitGate>
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

function Late({ visit, data, offline }: { visit: Visit; data: VisitsResponse; offline: boolean }) {
  const bootstrap = useSettings().data?.data;
  const settings = bootstrap?.settings;
  const hours = settings?.freeChangeHours ?? 48;
  const upcoming = data.upcoming.some((v) => v.id === visit.id);
  return (
    <>
      <Text variant="titleLg" accessibilityRole="header">
        {t('late.heading', { hours })}
      </Text>
      <Text variant="body" tone="inkMuted">
        {t('late.body')}
      </Text>
      {settings ? (
        <ListGroup>
          <ListRow icon="calendar-x" title={t('late.ifCancel')} subtitle={outcomeText(settings.lateCancelOutcome, visit.depositCAD)} chevron={false} />
          <ListRow icon="warning-circle" title={t('late.ifMiss')} subtitle={outcomeText(settings.noShowOutcome, visit.depositCAD)} chevron={false} />
        </ListGroup>
      ) : null}
      <SupportContext
        topic={t('visit.topic')}
        reference={visit.ref}
        hours={hoursLabel(settings?.clinicHours ?? null) ?? t('sup.hoursPending')}
        response={bootstrap?.clinic.supportReplyTime ? t('sup.replies', { time: bootstrap.clinic.supportReplyTime }) : undefined}
        phone={bootstrap?.clinic.phone ?? null}
      />
      {!upcoming ? null : visit.openRequest ? (
        <Banner tone="info" title={t('visit.requested.title')}>
          {t(visit.openRequest.type === 'cancel' ? 'visit.requested.cancel' : 'visit.requested.change')}
        </Banner>
      ) : (
        <Composer visit={visit} offline={offline} />
      )}
    </>
  );
}

function Composer({ visit, offline }: { visit: Visit; offline: boolean }) {
  const router = useRouter();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [type, setType] = useState<'change' | 'cancel'>('change');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<VisitRequest | null>(null);
  // One key per request as written: retrying the same text reuses it (no duplicate in the queue); editing the
  // text or type makes it a new request, so the server never answers with an older message.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  async function send() {
    if (message.trim().length < 3) {
      setError(t('req.error'));
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed(`/v1/visits/${visit.id}/requests`, { method: 'POST', body: { type, message: message.trim(), idempotencyKey } });
      setSent(visitRequestSchema.parse(res.body));
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    } catch {
      setFailed(true); // nothing confirmed as sent; the text stays for a safe retry
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AsyncStatus
        state="success"
        title={t('req.sent.title')}
        reference={sent.reference}
        actions={
          <Button size="lg" fullWidth onPress={() => router.back()}>
            {t('ret.done')}
          </Button>
        }
      >
        {t('req.sent.body', { reference: sent.reference })}
      </AsyncStatus>
    );
  }

  return (
    <View style={styles.group}>
      <SegmentedControl
        label={t('req.type')}
        options={[t('req.moveIt'), t('req.cancelIt')]}
        value={type === 'cancel' ? t('req.cancelIt') : t('req.moveIt')}
        onChange={(v) => {
          setType(v === t('req.cancelIt') ? 'cancel' : 'change');
          setIdempotencyKey(newIdempotencyKey());
        }}
      />
      <TextField
        label={t('req.label')}
        placeholder={type === 'cancel' ? t('req.placeholderCancel') : t('req.placeholderChange')}
        value={message}
        onChangeText={(v) => {
          setMessage(v);
          setIdempotencyKey(newIdempotencyKey());
          if (error) setError(undefined);
        }}
        error={error}
        maxLength={1000}
        multiline
        helper={t('privacy.noMedical')}
      />
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
      <Button size="lg" fullWidth loading={busy} loadingLabel={t('req.sending')} disabled={offline || online === false} onPress={send}>
        {t('req.send')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space['3'] },
});
