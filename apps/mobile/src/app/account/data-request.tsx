import { privacyRequestSchema, type PrivacyRequest } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useDataRequest } from '../../account/queries';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Badge, Banner, Button, Screen, Skeleton, Text, TextField } from '../../components';
import { newIdempotencyKey } from '../../booking/visits';
import { t } from '../../i18n';
import { clinicDate } from '../../i18n/format';
import { useIsOnline } from '../../lib/network';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `/account/data-request` — ACC-07 (PRIV 08). A tracked request with a reference; nothing is claimed as sent. */
export default function DataRequest() {
  return (
    <>
      <Stack.Screen options={{ title: t('dr.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SignInGate>
          <Form />
        </SignInGate>
      </KeyboardAvoidingView>
    </>
  );
}

function Form() {
  const { me, session } = useAuth();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const current = useDataRequest();
  const [email, setEmail] = useState(me?.customer.email ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [idempotencyKey] = useState(newIdempotencyKey);

  async function submit() {
    if (!EMAIL.test(email.trim())) {
      setError(t('aut.profile.emailInvalid'));
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed('/v1/me/data-requests', { method: 'POST', body: { email: email.trim(), idempotencyKey } });
      queryClient.setQueryData(['dataRequest'], { latest: privacyRequestSchema.parse(res.body) });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (!current.data) {
    return (
      <Screen topInset={false}>
        {current.isError ? (
          <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => current.refetch()}>{t('error.retry')}</Button>}>
            {t('error.body')}
          </Banner>
        ) : (
          <Skeleton lines={3} media={false} />
        )}
      </Screen>
    );
  }
  const latest: PrivacyRequest | null = current.data.latest;
  if (latest?.status === 'received') {
    return (
      <Screen topInset={false}>
        <AsyncStatus state="success" title={t('dr.sentTitle')} reference={latest.reference}>
          {t('dr.sentBody', { reference: latest.reference })}
        </AsyncStatus>
        <Badge tone="info">{`${t('dr.requested')} ${clinicDate(latest.createdAt, 'America/Vancouver')}`}</Badge>
      </Screen>
    );
  }
  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth loading={busy} disabled={online === false} onPress={submit}>
          {t('dr.submit')}
        </Button>
      }
    >
      <Text variant="displayMd" accessibilityRole="header">
        {t('dr.heading')}
      </Text>
      <Text variant="body" tone="inkMuted">
        {t('dr.body')}
      </Text>
      {latest?.status === 'completed' && latest.completedAt ? (
        <Badge tone="success">{`${t('dr.completed')} ${clinicDate(latest.completedAt, 'America/Vancouver')}`}</Badge>
      ) : null}
      <TextField
        label={t('dr.sendTo')}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(undefined);
        }}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={254}
      />
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
