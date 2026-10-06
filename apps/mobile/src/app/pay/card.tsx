import { space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Badge, Banner, Button, Screen, Text, TextField } from '../../components';
import { t } from '../../i18n';
import { tokenizeCard } from '../../payments/provider';
import { cents, useOrder } from '../../payments/queries';

/**
 * `/pay/card` — PAY-02 (filled, empty, error; verify continues on PAY-04). The card is tokenised on the device;
 * only the token is sent (PAY 01). Typed details are never stored and leave this screen with it.
 */
export default function PayCard() {
  const { attempt, order } = useLocalSearchParams<{ attempt: string; order: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('pay.card.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SignInGate>
          <CardForm attemptId={attempt} orderId={order} />
        </SignInGate>
      </KeyboardAvoidingView>
    </>
  );
}

function CardForm({ attemptId, orderId }: { attemptId: string; orderId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const order = useOrder(orderId).data;
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', postal: '' });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const set = (k: keyof typeof card) => (v: string) => {
    setCard((c) => ({ ...c, [k]: v }));
    if (error) setError(undefined);
  };

  async function pay() {
    const token = tokenizeCard(card);
    if (!token) {
      setError(t('pay.card.invalid'));
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      await session.authed(`/v1/payments/attempts/${attemptId}/confirm`, { method: 'POST', body: { paymentToken: token } });
      router.replace({ pathname: '/pay/status', params: { attempt: attemptId, order: orderId } });
    } catch {
      // The provider may still have the payment: the status screen asks it rather than guessing.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth loading={busy} loadingLabel={t('pay.card.paying')} onPress={pay}>
          {order ? t('pay.card.pay', { amount: cents(order.amountCents) }) : t('pay.continue')}
        </Button>
      }
    >
      {order ? (
        <Text variant="titleLg" accessibilityRole="header">
          {order.title}
        </Text>
      ) : null}
      <Badge tone="sample">{t('badge.sample')}</Badge>
      <Text variant="caption" tone="inkMuted">
        {t('pay.card.test')}
      </Text>
      <View style={styles.group}>
        <TextField label={t('pay.card.number')} value={card.number} onChangeText={set('number')} keyboardType="number-pad" autoComplete="cc-number" textContentType="creditCardNumber" maxLength={23} error={error} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label={t('pay.card.expiry')} placeholder="MM/YY" value={card.expiry} onChangeText={set('expiry')} keyboardType="number-pad" autoComplete="cc-exp" maxLength={5} />
          </View>
          <View style={styles.flex}>
            <TextField label={t('pay.card.cvc')} value={card.cvc} onChangeText={set('cvc')} keyboardType="number-pad" autoComplete="cc-csc" secureTextEntry maxLength={4} />
          </View>
        </View>
        <TextField label={t('pay.card.postal')} value={card.postal} onChangeText={set('postal')} autoCapitalize="characters" autoComplete="postal-code" textContentType="postalCode" maxLength={7} />
      </View>
      {failed ? (
        <Banner
          tone="danger"
          title={t('error.title')}
          action={
            <Button variant="secondary" size="sm" onPress={() => router.replace({ pathname: '/pay/status', params: { attempt: attemptId, order: orderId } })}>
              {t('pay.checkAgain')}
            </Button>
          }
        >
          {t('pay.checking.body')}
        </Banner>
      ) : null}
      <Text variant="caption" tone="inkMuted">
        {t('pay.secure')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space['4'] },
  row: { flexDirection: 'row', gap: space['3'] },
});
