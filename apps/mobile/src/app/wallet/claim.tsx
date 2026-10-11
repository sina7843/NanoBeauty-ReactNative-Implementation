import { giftLookupSchema, walletSchema, type GiftLookup } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { apiRequest, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Banner, Button, GiftCard, Screen, SupportContext, Text, TextField } from '../../components';
import { hoursLabel, isOpenNow } from '../../content/clinic';
import { t } from '../../i18n';
import { analytics } from '../../lib/analytics';
import { giftCodeTooShort } from '../../payments/giftDraft';
import { cents } from '../../payments/queries';
import { useSettings } from '../../settings/useSettings';

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
  const settings = useSettings().data?.data;
  const [now] = useState(() => Date.now());

  async function check() {
    // WP-14: a short or partly typed code is a field error, not "we couldn't find it".
    if (giftCodeTooShort(code)) {
      setError(t('claim.short'));
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
      // WP-14: open the card (WAL-04) once the server's Wallet has it; otherwise say it was added.
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      const wallet = await session
        .authed('/v1/wallet')
        .then((r) => walletSchema.parse(r.body))
        .catch(() => null);
      const last4 = code.replace(/[\s-]/g, '').slice(-4).toUpperCase();
      const card = wallet?.instruments.find((i) => i.kind === 'gift_card' && i.role === 'owner' && i.last4?.toUpperCase() === last4);
      if (card) router.replace({ pathname: '/wallet/gift-cards/[id]', params: { id: card.id } });
      else setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') setFound((f) => (f ? { ...f, state: 'claimed' } : f));
      else setError(t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  // WAL-11: claimed / not found carry the clinic's SupportContext with the reference to quote.
  const support = (reference: string) => (
    <SupportContext
      topic={t('gc.topic')}
      reference={reference}
      hours={hoursLabel(settings?.settings.clinicHours ?? null) ?? t('sup.hoursPending')}
      phone={settings?.clinic.phone ?? null}
      open={settings ? isOpenNow(settings.settings.clinicHours ?? null, settings.clinic.timezone, now) : null}
      onAsk={() => router.push('/support/ask')}
    />
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
  return (
    <Screen
      topInset={false}
      footer={
        found && found.state !== 'valid' ? (
          <Button size="lg" fullWidth onPress={() => setFound(null)}>
            {t('claim.tryAgain')}
          </Button>
        ) : (
          <Button size="lg" fullWidth loading={busy} onPress={found ? claim : check}>
            {found ? t('claim.add') : t('claim.check')}
          </Button>
        )
      }
    >
      {found?.state === 'valid' ? (
        <>
          <GiftCard
            amount={(found.amountCents ?? 0) / 100}
            recipient={found.fromName ? t('claim.youFrom', { name: found.fromName }) : null}
            code={code.trim().toUpperCase()}
            design={found.design ?? undefined}
          />
          {found.message ? <Text variant="bodyLg">{`“${found.message}”`}</Text> : null}
        </>
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
      {/* WP-14: claimed / not found stay on the form as a Banner with the support path (WAL-11). */}
      {found?.state === 'claimed' ? (
        <Banner tone="warning" title={t('claim.claimedTitle')}>
          {t('claim.claimedBody')}
        </Banner>
      ) : found?.state === 'notfound' ? (
        <Banner tone="danger" title={t('claim.notfoundTitle')}>
          {t('claim.notfoundBody')}
        </Banner>
      ) : null}
      {found && found.state !== 'valid' ? support(found.reference) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
