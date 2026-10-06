import { space } from '@nano/design-tokens';
import { normalizePhone } from '@nano/contracts';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, IconButton, Logo, Text, TextField } from '../../components';
import { startCode } from '../../auth/flow';
import { t } from '../../i18n';
import { phoneInputProps } from '../../platform/otp';
import { useTheme } from '../../theme/ThemeProvider';

/** AUT-01 — states: empty, filled, invalid, sending, network. */
export default function PhoneScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [network, setNetwork] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    setNetwork(false);
    if (!normalizePhone(phone)) {
      setError(t('aut.phone.invalid'));
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await startCode(phone);
    setBusy(false);
    if (result.ok) {
      const { challengeId, sentTo, resendAvailableAt } = result.challenge;
      router.push({ pathname: '/auth/code', params: { challengeId, sentTo, resendAt: resendAvailableAt, phone } });
    } else if (result.kind === 'invalid') setError(t('aut.phone.invalid'));
    else if (result.kind === 'network') setNetwork(true);
    else if (result.kind === 'limited') router.push({ pathname: '/auth/code', params: { reason: 'limited' } });
    else setError(t('aut.retryIn', { seconds: result.seconds ?? 0 }));
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.close}>
          <IconButton icon="x" label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Logo height={72} />
          </View>
          <View style={styles.heading}>
            <Text variant="displayMd" accessibilityRole="header" style={styles.center}>
              {t('aut.phone.title')}
            </Text>
            <Text variant="body" tone="inkMuted" style={styles.center}>
              {t('aut.phone.body')}
            </Text>
          </View>
          <TextField
            {...phoneInputProps}
            label={t('aut.phone.label')}
            icon="phone"
            placeholder={t('aut.phone.placeholder')}
            helper={t('aut.phone.helper')}
            error={error}
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (error) setError(undefined);
            }}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Button size="lg" fullWidth loading={busy} loadingLabel={t('aut.phone.sending')} disabled={!phone.trim()} onPress={send}>
            {t('aut.phone.send')}
          </Button>
          {network ? (
            <Banner tone="danger" title={t('aut.phone.networkTitle')}>
              {t('aut.phone.networkBody')}
            </Banner>
          ) : null}
          <Text variant="caption" tone="inkMuted">
            {t('aut.phone.smsNote')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  close: { alignItems: 'flex-end', paddingHorizontal: space['3'] },
  body: { gap: space['5'], paddingHorizontal: space['5'], paddingVertical: space['6'] },
  logo: { alignItems: 'center', paddingTop: space['4'], paddingBottom: space['6'] },
  heading: { gap: space['2'], alignItems: 'center' },
});
