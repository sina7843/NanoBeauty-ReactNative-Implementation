import { meSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthProvider';
import { goToNext } from '../../auth/flow';
import { Banner, Button, Text, TextField } from '../../components';
import { t } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** AUT-04 — name and optional email only (NFR 06). Validates on blur/submit, not per keystroke. */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { status, me, session, refreshMe } = useAuth();
  const [first, setFirst] = useState(me?.customer.firstName ?? '');
  const [last, setLast] = useState(me?.customer.lastName ?? '');
  const [email, setEmail] = useState(me?.customer.email ?? '');
  const [emailError, setEmailError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (status === 'guest') return <Redirect href="/auth/phone" />;

  const checkEmail = () => {
    const bad = email.trim() !== '' && !EMAIL.test(email.trim());
    setEmailError(bad ? t('aut.profile.emailInvalid') : undefined);
    return !bad;
  };

  async function submit() {
    if (!checkEmail()) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed('/v1/me/profile', {
        method: 'PUT',
        body: { firstName: first.trim(), lastName: last.trim(), email: email.trim() || null },
      });
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text variant="displayMd" accessibilityRole="header">
              {t('aut.profile.title')}
            </Text>
            <Text variant="body" tone="inkMuted">
              {t('aut.profile.body')}
            </Text>
          </View>
          <TextField label={t('aut.profile.first')} value={first} onChangeText={setFirst} textContentType="givenName" autoComplete="given-name" />
          <TextField label={t('aut.profile.last')} value={last} onChangeText={setLast} textContentType="familyName" autoComplete="family-name" />
          <TextField
            label={t('aut.profile.email')}
            optional
            value={email}
            onChangeText={setEmail}
            onBlur={checkEmail}
            error={emailError}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
          />
          {failed ? (
            <Banner tone="danger" title={t('error.title')}>
              {t('error.body')}
            </Banner>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button size="lg" fullWidth loading={busy} disabled={!first.trim() || !last.trim()} onPress={submit}>
            {t('aut.profile.finish')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: space['4'], paddingHorizontal: space['5'], paddingTop: space['2'], paddingBottom: space['6'] },
  heading: { gap: space['2'] },
  footer: { paddingHorizontal: space['5'], paddingTop: space['3'], paddingBottom: space['3'] },
});
