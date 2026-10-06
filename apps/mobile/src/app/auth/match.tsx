import { matchDecisionResponseSchema, matchResultSchema, type MatchResult } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthProvider';
import { AccountMatch, Banner, Button, Text } from '../../components';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

type Decision = 'looks_right' | 'something_missing' | 'ask_clinic' | 'new_client' | 'had_account';

const CHOICES: Record<Exclude<MatchResult['state'], 'unavailable'>, [Decision, Decision]> = {
  matched: ['looks_right', 'something_missing'],
  mismatch: ['ask_clinic', 'new_client'],
  notfound: ['new_client', 'had_account'],
};

/**
 * `/auth/match` — AUT-05 matched, AUT-06 mismatch, AUT-07 not found. Read-only: nothing is merged or moved
 * here; the clinic confirms first (AUTH 11). Cases needing the clinic continue to support with a reference.
 */
export default function MatchScreen() {
  const { colors } = useTheme();
  const { status, session, refreshMe } = useAuth();
  const [result, setResult] = useState<MatchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<'primary' | 'secondary' | null>(null);

  const load = useCallback(
    () =>
      session.authed('/v1/me/legacy-match', { method: 'POST', body: {} }).then(
        (res) => {
          const parsed = matchResultSchema.parse(res.body);
          if (parsed.state === 'unavailable') router.dismissTo('/home');
          else setResult(parsed);
        },
        () => setFailed(true),
      ),
    [session],
  );

  useEffect(() => {
    if (status === 'signedIn') load();
  }, [status, load]);

  if (status === 'guest') return <Redirect href="/auth/phone" />;

  async function decide(which: 'primary' | 'secondary') {
    if (!result || result.state === 'unavailable') return;
    const decision = CHOICES[result.state][which === 'primary' ? 0 : 1];
    setBusy(which);
    try {
      const res = await session.authed('/v1/me/legacy-match/decision', { method: 'POST', body: { decision } });
      const { reference } = matchDecisionResponseSchema.parse(res.body);
      await refreshMe();
      // AUT-05 'Looks right' → Home (HOM-02); the clinic confirms before any value appears. Other cases need the
      // clinic, so the customer continues to support with the case reference (SUP 04).
      router.dismissTo(reference && decision !== 'looks_right' ? { pathname: '/support/contact', params: { reference } } : '/home');
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.body}>
        {failed ? (
          <Banner tone="danger" title={t('error.title')} action={<Button variant="secondary" size="sm" onPress={() => { setFailed(false); load(); }}>{t('error.retry')}</Button>}>
            {t('error.body')}
          </Banner>
        ) : null}
        {!result && !failed ? (
          <View style={styles.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary} />
            <Text variant="body" tone="inkMuted">
              {t('common.loading')}
            </Text>
          </View>
        ) : null}
        {result?.state === 'mismatch' ? (
          <Text variant="displayMd" accessibilityRole="header">
            {t('aut.match.mismatch.heading')}
          </Text>
        ) : null}
        {result && result.state !== 'unavailable' ? (
          <AccountMatch result={result} busy={busy} onPrimary={() => decide('primary')} onSecondary={() => decide('secondary')} />
        ) : null}
        {result?.state === 'mismatch' ? (
          <Text variant="caption" tone="inkMuted">
            {t('aut.match.mismatch.note')}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flexGrow: 1, gap: space['4'], paddingHorizontal: space['5'], paddingTop: space['8'], paddingBottom: space['6'] },
  loading: { flexDirection: 'row', gap: space['2'], alignItems: 'center' },
});
