import { giftLookupSchema, type GiftLookup } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { apiRequest, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Banner, Button, Card, Screen, Text, TextField } from '../../components';
import { t } from '../../i18n';
import { analytics } from '../../lib/analytics';
import { cents } from '../../payments/queries';

/** `/wallet/claim?code=` — WAL-11 (valid, invalid, claimed, notfound). Claim links open here from the text. */
export default function Claim() {
  return (
    <>
      <Stack.Screen options={{ title: t('claim.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SignInGate>
          <ClaimForm />
        </SignInGate>
      </KeyboardAvoidingView>
    </>
  );
}

function ClaimForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(/^[A-Za-z0-9-]{6,40}$/.test(params.code ?? '') ? params.code! : '');
  const [found, setFound] = useState<GiftLookup | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function check() {
    if (code.trim().length < 6) {
      setError(t('claim.notfoundTitle'));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      setFound(giftLookupSchema.parse((await apiRequest('/v1/gifts/lookup', { method: 'POST', body: { code: code.trim() } })).body));
    } catch {
      setError(t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    try {
      await session.authed('/v1/gifts/claim', { method: 'POST', body: { code: code.trim() } });
      analytics.track('gift_claimed', { channel: 'app', kept_code: false });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') setFound((f) => (f ? { ...f, state: 'claimed' } : f));
      else setError(t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  const support = (reference: string) => (
    <Button variant="secondary" fullWidth onPress={() => router.push({ pathname: '/support/contact', params: { reference, topic: t('gc.title') } })}>
      {t('sup.contact')}
    </Button>
  );

  if (done) {
    return (
      <Screen topInset={false}>
        <AsyncStatus state="success" title={t('claim.added')} actions={<Button size="lg" fullWidth onPress={() => router.dismissTo('/wallet')}>{t('help.back')}</Button>}>
          {found?.amountCents ? cents(found.amountCents) : undefined}
        </AsyncStatus>
      </Screen>
    );
  }
  if (found?.state === 'claimed' || found?.state === 'notfound') {
    const claimed = found.state === 'claimed';
    return (
      <Screen topInset={false}>
        <AsyncStatus
          state="failed"
          title={claimed ? t('claim.claimedTitle') : t('claim.notfoundTitle')}
          reference={found.reference}
          actions={
            <>
              {support(found.reference)}
              <Button variant="tertiary" fullWidth onPress={() => setFound(null)}>
                {t('claim.tryAgain')}
              </Button>
            </>
          }
        >
          {claimed ? t('claim.claimedBody') : t('claim.notfoundBody')}
        </AsyncStatus>
      </Screen>
    );
  }
  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth loading={busy} onPress={found ? claim : check}>
          {found ? t('claim.add') : t('claim.check')}
        </Button>
      }
    >
      {found ? (
        <Card tone="tint">
          <Text variant="displayMd">{found.amountCents !== null ? cents(found.amountCents) : ''}</Text>
          {found.message ? <Text variant="bodyLg">{`“${found.message}”`}</Text> : null}
          {found.fromName ? (
            <Text variant="body" tone="inkMuted">
              {t('claim.from', { name: found.fromName })}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <TextField
        label={t('claim.code')}
        value={code}
        onChangeText={(v) => {
          setCode(v);
          setFound(null);
          if (error) setError(undefined);
        }}
        helper={t('claim.codeHelp')}
        error={error}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={40}
      />
      {!found && error === t('error.body') ? <Banner tone="danger" title={t('error.title')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
