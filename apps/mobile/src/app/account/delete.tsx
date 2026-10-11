import { deletionStatusSchema, otpStartResponseSchema, type DeletionPreview, type OtpStartResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CodeStep } from '../../account/CodeStep';
import { forgetDeletionToken, loadDeletionToken, saveDeletionToken, useDeletionPreview, useDeletionStatus } from '../../account/queries';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Badge, Banner, Button, ListGroup, ListRow, Screen, Skeleton, Text } from '../../components';
import { t } from '../../i18n';
import { clinicDate, money } from '../../i18n/format';
import { analytics } from '../../lib/analytics';
import { useIsOnline } from '../../lib/network';
import { useSettings } from '../../settings/useSettings';

/**
 * `/account/delete` — ACC-08 explanation → ACC-09 identity check → ACC-10 requested / completed (AUTH 06, PRIV 04).
 * The status comes from the server; the app never claims the account is gone before the server says so.
 */
export default function DeleteAccount() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    loadDeletionToken().then(setToken);
  }, []);
  return (
    <>
      <Stack.Screen options={{ title: t('del.title') }} />
      <Screen topInset={false}>
        {token === undefined ? null : token ? (
          <Status token={token} />
        ) : (
          <SignInGate>
            <Flow onRequested={setToken} />
          </SignInGate>
        )}
      </Screen>
    </>
  );
}

function Flow({ onRequested }: { onRequested: (token: string) => void }) {
  const router = useRouter();
  const online = useIsOnline();
  const { session, signOut } = useAuth();
  const preview = useDeletionPreview();
  const [challenge, setChallenge] = useState<OtpStartResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    setBusy(true);
    setFailed(false);
    try {
      setChallenge(otpStartResponseSchema.parse((await session.authed('/v1/me/deletion/start', { method: 'POST', body: {} })).body));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (challenge) {
    return (
      <>
        <Text variant="titleLg" accessibilityRole="header">
          {t('del.confirmHeading')}
        </Text>
        <Text variant="body" tone="inkMuted">
          {t('del.confirmBody', { sentTo: challenge.sentTo })}
        </Text>
        <CodeStep
          initial={challenge}
          resend={() => session.authed('/v1/me/deletion/start', { method: 'POST', body: {} })}
          confirm={async (challengeId, code) => {
            const res = await session.authed('/v1/me/deletion', { method: 'POST', body: { challengeId, code } });
            const status = deletionStatusSchema.parse(res.body);
            await saveDeletionToken(status.token);
            analytics.track('account_deletion_requested', { route: 'app' });
            // The server has already ended every session; this clears the device (tokens, private caches).
            await signOut();
            onRequested(status.token);
          }}
          describe={(e) => (e.code === 'conflict' ? t('del.lastOwner') : undefined)}
          submit={{ label: t('del.confirm'), variant: 'destructive' }}
        />
        <Button variant="tertiary" fullWidth onPress={() => router.back()}>
          {t('del.keep')}
        </Button>
      </>
    );
  }

  if (!preview.data) {
    return preview.isError ? (
      <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => preview.refetch()}>{t('error.retry')}</Button>}>
        {t('error.body')}
      </Banner>
    ) : (
      <Skeleton lines={4} media={false} />
    );
  }
  return (
    <>
      <Explain preview={preview.data} />
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
      {/* ACC-08: "Talk to the clinic first" is secondary; the destructive "Continue to delete" is the large footer action. */}
      <View style={styles.actions}>
        <Button variant="secondary" icon="chat-circle-text" fullWidth onPress={() => router.push({ pathname: '/support/contact', params: { topic: t('del.title') } })}>
          {t('del.talk')}
        </Button>
        <Button variant="destructive" size="lg" fullWidth loading={busy} disabled={online === false} onPress={start}>
          {t('del.continue')}
        </Button>
      </View>
    </>
  );
}

/** ACC-08: what happens, from the person's own data and the server's deletion plan. */
function Explain({ preview }: { preview: DeletionPreview }) {
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const { upcomingVisits: v } = preview;
  const warn = Boolean(v.count || preview.balances.length);
  return (
    <>
      {/* "Before you go" once: as the Banner title when there is something to warn about, else as the heading (WP-24). */}
      {warn ? null : (
        <Text variant="displayMd" accessibilityRole="header">
          {t('del.before')}
        </Text>
      )}
      {warn ? (
        <Banner tone="warning" title={t('del.before')}>
          {[
            v.count && v.next ? (v.count === 1 ? t('del.visitsOne', { date: clinicDate(v.next, zone) }) : t('del.visitsMany', { count: v.count, date: clinicDate(v.next, zone) })) : '',
            v.count ? t('del.visitsNote') : '',
            ...preview.balances.map((b) => (b.amountCAD > 0 ? t('del.balance', { amount: money(b.amountCAD), label: b.label }) : t('del.sessionsLeft', { label: b.label }))),
          ]
            .filter(Boolean)
            .join(' ')}
        </Banner>
      ) : null}
      {preview.sample ? <Badge tone="sample">{t('badge.sample')}</Badge> : null}
      <ListGroup header={t('del.whatDelete')}>
        {preview.delete.map((line) => (
          <ListRow key={line} icon="trash" title={line} chevron={false} />
        ))}
      </ListGroup>
      <ListGroup header={t('del.whatDeidentify')}>
        {preview.deidentify.map((line) => (
          <ListRow key={line} icon="eye" title={line} chevron={false} />
        ))}
      </ListGroup>
      <ListGroup header={t('del.whatRetain')}>
        {preview.retain.map((line) => (
          <ListRow key={line} icon="archive" title={line} chevron={false} />
        ))}
      </ListGroup>
      <Text variant="caption" tone="inkMuted">
        {t('del.grace', { days: preview.graceDays })}
      </Text>
    </>
  );
}

/** ACC-10 (requested, completed) — and cancelled, if the person signed back in and kept the account. */
function Status({ token }: { token: string }) {
  const router = useRouter();
  const status = useDeletionStatus(token);
  const days = useSettings().data?.data.settings.deletionGraceDays ?? 30;
  const s = status.data;
  const finished = s?.status === 'completed' || s?.status === 'cancelled';
  const done = async () => {
    if (finished || status.isError) await forgetDeletionToken();
    router.dismissTo('/home');
  };
  if (!s) {
    return status.isError ? (
      <AsyncStatus state="failed" title={t('error.title')} actions={<Button fullWidth onPress={done}>{t('del.done')}</Button>}>
        {t('error.body')}
      </AsyncStatus>
    ) : (
      <Skeleton lines={3} media={false} />
    );
  }
  const action = (
    <Button size="lg" fullWidth onPress={done}>
      {t('del.done')}
    </Button>
  );
  if (s.status === 'completed') {
    return (
      <AsyncStatus state="success" title={t('del.completedTitle')} reference={s.reference} actions={action}>
        {t('del.completedBody')}
      </AsyncStatus>
    );
  }
  if (s.status === 'cancelled') {
    return (
      <AsyncStatus state="success" title={t('del.cancelledTitle')} reference={s.reference} actions={action}>
        {t('del.cancelledBody')}
      </AsyncStatus>
    );
  }
  return (
    <AsyncStatus state="timeout" title={t('del.requestedTitle')} reference={s.reference} actions={action}>
      {t('del.requestedBody', { days })}
    </AsyncStatus>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space['2'] },
});
