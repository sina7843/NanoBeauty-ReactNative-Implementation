import { meSchema } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthProvider';
import { goToNext } from '../../auth/flow';
import { Banner, Button, ConsentRow, Text } from '../../components';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

/** AUT-03 — three separate choices; offers is optional and starts unchecked (AUTH 09). */
export default function ConsentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, session, refreshMe } = useAuth();
  const [terms, setTerms] = useState(false);
  const [texts, setTexts] = useState(false);
  const [offers, setOffers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (status === 'guest') return <Redirect href="/auth/phone" />;

  async function submit() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed('/v1/me/consents', { method: 'POST', body: { terms, transactional: texts, marketing: offers } });
      await refreshMe();
      goToNext(meSchema.parse(res.body).next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.heading}>
          <Text variant="displayMd" accessibilityRole="header">
            {t('aut.consents.title')}
          </Text>
          <Text variant="body" tone="inkMuted">
            {t('aut.consents.body')}
          </Text>
        </View>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <ConsentRow
            required
            label={t('aut.consents.terms')}
            linkLabel={t('aut.consents.termsLink')}
            onLink={() => router.push('/legal/terms')}
            checked={terms}
            onChange={setTerms}
          />
          <ConsentRow required label={t('aut.consents.texts')} detail={t('aut.consents.textsDetail')} checked={texts} onChange={setTexts} />
          <ConsentRow label={t('aut.consents.offers')} detail={t('aut.consents.offersDetail')} checked={offers} onChange={setOffers} />
        </View>
        {failed ? (
          <Banner tone="danger" title={t('error.title')}>
            {t('error.body')}
          </Banner>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button size="lg" fullWidth loading={busy} disabled={!terms || !texts} onPress={submit}>
          {t('aut.consents.continue')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: space['4'], paddingHorizontal: space['5'], paddingTop: space['2'], paddingBottom: space['6'] },
  heading: { gap: space['2'] },
  group: { paddingHorizontal: space['4'], paddingVertical: space['1'], borderRadius: radius.md, borderWidth: 1 },
  footer: { paddingHorizontal: space['5'], paddingTop: space['3'], paddingBottom: space['3'] },
});
