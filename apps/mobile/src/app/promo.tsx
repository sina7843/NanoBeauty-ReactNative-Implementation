import { promoValidateResponseSchema, type PromoValidation } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, apiRequest } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Button, Screen, Text, TextField } from '../components';
import { useOffer } from '../content/queries';
import { t } from '../i18n';
import { clinicDate } from '../i18n/format';
import { useSettings } from '../settings/useSettings';
import { analytics } from '../lib/analytics';
import { resolveLink } from '../navigation/links';

/** Error copy for each OFR-03 state (PROMO 06). Dates come from the server. */
function messageFor(r: PromoValidation, zone: string): string | undefined {
  switch (r.state) {
    case 'valid':
      return undefined;
    case 'ended':
      return t('promo.err.ended', { date: r.endedAt ? clinicDate(r.endedAt, zone) : '' });
    case 'usedup':
      return t('promo.err.usedup');
    case 'noteligible':
      return t('promo.err.noteligible', { label: r.appliesLabel ?? '' });
    case 'alreadyused':
      return t('promo.err.alreadyused', { date: r.usedAt ? clinicDate(r.usedAt, zone) : '' });
    case 'notyet':
      return t('promo.err.notyet', { date: r.startsAt ? clinicDate(r.startsAt, zone) : '' });
    default:
      return t('promo.err.invalid');
  }
}

/** `/promo` — OFR-03. Checking a code changes nothing; the discount is applied and re-checked at payment. */
export default function PromoCode() {
  const router = useRouter();
  const { status, session } = useAuth();
  // FE-6: opened from an offer (OFR-01), the check says whether the code applies to that offer.
  const { offer } = useLocalSearchParams<{ offer?: string }>();
  const settings = useSettings().data?.data;
  const zone = settings?.clinic.timezone ?? 'America/Vancouver';
  const [code, setCode] = useState('');
  const [result, setResult] = useState<PromoValidation | null>(null);
  const [network, setNetwork] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const campaign = useOffer(result?.state === 'valid' ? (result.campaignId ?? undefined) : undefined);

  async function apply() {
    setBusy(true);
    setNetwork(false);
    setWaitSeconds(null);
    try {
      const init = { method: 'POST' as const, body: { code, ...(offer ? { appliesTo: `offer:${offer}` } : {}) } };
      // Signed in, the server can also say "already used"; anonymous checks skip that (the purchase re-checks).
      const res = status === 'signedIn' ? await session.authed('/v1/promo/validate', init) : await apiRequest('/v1/promo/validate', init);
      const parsed = promoValidateResponseSchema.parse(res.body);
      setResult(parsed);
      const RESULT: Record<string, string> = { valid: 'applied', ended: 'expired', usedup: 'used_up' };
      // The code itself never goes to analytics: it can be personal or single-use (spec 4 lists code_id; dropped).
      analytics.track('promo_code_result', { result: RESULT[parsed.state] ?? parsed.state });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'rate_limited') setWaitSeconds(e.info.retryAfterSeconds ?? 60);
      else setNetwork(true);
    } finally {
      setBusy(false);
    }
  }

  const error = waitSeconds !== null ? t('aut.retryIn', { seconds: waitSeconds }) : result ? messageFor(result, zone) : undefined;
  const cta = campaign.data?.data.offer.state === 'live' ? campaign.data.data.offer.cta : null;
  return (
    <>
      <Stack.Screen options={{ title: t('promo.title') }} />
      <Screen topInset={false}>
        <Text variant="body" tone="inkMuted">
          {t('promo.intro')}
        </Text>
        <TextField
          label={t('promo.title')}
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setResult(null);
          }}
          error={error}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={() => code.trim() && apply()}
        />
        {network ? (
          <Banner tone="danger" title={t('aut.phone.networkTitle')}>
            {t('error.body')}
          </Banner>
        ) : null}
        {result?.state === 'valid' ? (
          <Banner
            tone="success"
            title={t('promo.applied', { code: result.code })}
            action={
              cta ? (
                // FE-16: the same safe link handling as the offer page (unknown or mode-blocked links don't open blindly).
                <Button fullWidth onPress={() => router.push(resolveLink(cta.href, settings?.settings.bookingMode) as Href)}>
                  {cta.label}
                </Button>
              ) : undefined
            }
          >
            {t('promo.appliedBody', { description: result.description ?? '' })}
          </Banner>
        ) : (
          <View style={styles.actions}>
            <Button fullWidth loading={busy} disabled={!code.trim()} onPress={apply}>
              {t('promo.apply')}
            </Button>
            <Button variant="tertiary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}>
              {t('promo.seeOffers')}
            </Button>
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space['2'] },
});
