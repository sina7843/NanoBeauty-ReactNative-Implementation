import { balanceHelpResponseSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { AsyncStatus, Banner, Button, Icon, Screen, Skeleton, Text, TextField } from '../../components';
import { newIdempotencyKey } from '../../booking/visits';
import { t } from '../../i18n';
import { shown } from '../../payments/InstrumentView';
import { useWallet } from '../../payments/queries';
import { useTheme } from '../../theme/ThemeProvider';

/** `/wallet/help?id=` — WAL-12 (form, sent; WALT 11). The clinic checks; the balance doesn't change meanwhile. */
export default function BalanceHelp() {
  return (
    <>
      <Stack.Screen options={{ title: t('help.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SignInGate>
          <Form />
        </SignInGate>
      </KeyboardAvoidingView>
    </>
  );
}

function Form() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const wallet = useWallet();
  const owned = wallet.data?.data.instruments.filter((i) => i.role === 'owner') ?? [];
  const [chosen, setChosen] = useState<string | null>(params.id ?? null);
  const [expected, setExpected] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [key] = useState(newIdempotencyKey);
  const selected = chosen ?? owned[0]?.id ?? null;

  async function send() {
    if (expected.trim().length < 3) {
      setError(t('req.error'));
      return;
    }
    if (!selected) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await session.authed('/v1/wallet/help', { method: 'POST', body: { instrumentId: selected, expected: expected.trim(), idempotencyKey: key } });
      setSent(balanceHelpResponseSchema.parse(res.body).reference);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Screen topInset={false}>
        <AsyncStatus state="success" title={t('help.sentTitle')} reference={sent} actions={<Button size="lg" fullWidth onPress={() => router.dismissTo('/wallet')}>{t('help.back')}</Button>}>
          {t('help.sentBody', { reference: sent })}
        </AsyncStatus>
      </Screen>
    );
  }
  if (!wallet.data) {
    return (
      <Screen topInset={false}>
        <Skeleton lines={3} media={false} />
      </Screen>
    );
  }
  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth loading={busy} disabled={!selected} onPress={send}>
          {t('help.send')}
        </Button>
      }
    >
      <Text variant="label">{t('help.which')}</Text>
      <View style={styles.list} accessibilityRole="radiogroup">
        {owned.map((i) => {
          const on = selected === i.id;
          const value = i.sessions ? t('wal.sessionsLeft', { remaining: i.sessions.remaining, total: i.sessions.total }) : shown(i);
          return (
            <Pressable
              key={i.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${i.label}, ${t('help.shows', { value })}`}
              onPress={() => setChosen(i.id)}
              style={[styles.row, { borderColor: on ? colors.primary : colors.lineStrong, borderWidth: on ? 2 : 1 }]}
            >
              <Icon name={on ? 'check-circle' : 'wallet'} size={22} tone={on ? 'primary' : 'inkMuted'} fill={on} />
              <View style={styles.flex}>
                <Text variant="body" strong>
                  {i.kind === 'gift_card' && i.last4 ? `${i.label} •••• ${i.last4}` : i.label}
                </Text>
                <Text variant="caption" tone="inkMuted">
                  {t('help.shows', { value })}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label={t('help.expected')}
        value={expected}
        onChangeText={(v) => {
          setExpected(v);
          if (error) setError(undefined);
        }}
        error={error}
        helper={t('privacy.noMedical')}
        maxLength={500}
        multiline
      />
      <Text variant="caption" tone="inkMuted">
        {t('help.note')}
      </Text>
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space['2'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space['3'], minHeight: 64, paddingHorizontal: space['4'], paddingVertical: space['3'], borderRadius: 12 },
});
