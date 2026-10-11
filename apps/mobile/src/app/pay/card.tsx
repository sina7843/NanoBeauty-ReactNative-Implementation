import { radius, space } from '@nano/design-tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Badge, Banner, Button, Icon, Screen, Text, TextField } from '../../components';
import { t } from '../../i18n';
import { savePendingPayment } from '../../payments/pendingPayment';
import { cardErrors, tokenizeCard, type CardInput } from '../../payments/provider';
import { cents, useOrder } from '../../payments/queries';
import { useTheme } from '../../theme/ThemeProvider';

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
  const { colors } = useTheme();
  const order = useOrder(orderId).data;
  const [card, setCard] = useState<CardInput>({ number: '', expiry: '', cvc: '', postal: '' });
  const [errors, setErrors] = useState<ReturnType<typeof cardErrors>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const set = (k: keyof CardInput) => (v: string) => {
    setCard((c) => ({ ...c, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const empty = Object.values(card).some((v) => !v.trim());
  const err = (k: keyof CardInput) => {
    const key = errors[k];
    return key ? t(key) : undefined;
  };

  async function pay() {
    const token = tokenizeCard(card);
    if (!token) {
      setErrors(cardErrors(card));
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      // WP-1: the payment is submitted from here on, so a relaunch checks it; leaving this form unpaid saves nothing.
      await savePendingPayment({ attemptId, orderId, startedAt: Date.now() });
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
        <Button size="lg" fullWidth icon="lock" loading={busy} loadingLabel={t('pay.card.paying')} disabled={empty} onPress={pay}>
          {order ? t('pay.card.pay', { amount: cents(order.amountCents) }) : t('pay.continue')}
        </Button>
      }
    >
      {order ? (
        <View style={[styles.summary, { backgroundColor: colors.surfaceTint }]} accessible>
          <Text variant="overline" tone="onTint">
            {order.kind === 'package' ? t('pkg.title') : t('gc.title')}
          </Text>
          <Text variant="amount">{cents(order.amountCents)}</Text>
          <Text variant="body">{order.detail ? `${order.title} · ${order.detail}` : order.title}</Text>
        </View>
      ) : null}
      <Badge tone="sample">{t('badge.sample')}</Badge>
      <Text variant="caption" tone="inkMuted">
        {t('pay.card.test')}
      </Text>
      <View style={styles.group}>
        <TextField label={t('pay.card.number')} icon="credit-card" value={card.number} onChangeText={set('number')} keyboardType="number-pad" autoComplete="cc-number" textContentType="creditCardNumber" maxLength={23} error={err('number')} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label={t('pay.card.expiry')} placeholder="MM / YY" value={card.expiry} onChangeText={set('expiry')} keyboardType="number-pad" autoComplete="cc-exp" maxLength={7} error={err('expiry')} />
          </View>
          <View style={styles.flex}>
            <TextField label={t('pay.card.cvc')} placeholder={t('pay.card.cvcPlaceholder')} value={card.cvc} onChangeText={set('cvc')} keyboardType="number-pad" autoComplete="cc-csc" secureTextEntry maxLength={4} error={err('cvc')} />
          </View>
        </View>
        <TextField label={t('pay.card.postal')} placeholder="V3M 0A1" value={card.postal} onChangeText={set('postal')} autoCapitalize="characters" autoComplete="postal-code" textContentType="postalCode" maxLength={7} error={err('postal')} />
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
      <View style={styles.secure}>
        <Icon name="lock" size={16} tone="inkMuted" />
        <Text variant="caption" tone="inkMuted" style={styles.flex}>
          {t('pay.secure')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space['4'] },
  row: { flexDirection: 'row', gap: space['3'] },
  summary: { gap: space['1'], padding: space['4'], borderRadius: radius.lg },
  secure: { flexDirection: 'row', gap: space['2'], alignItems: 'flex-start' },
});
