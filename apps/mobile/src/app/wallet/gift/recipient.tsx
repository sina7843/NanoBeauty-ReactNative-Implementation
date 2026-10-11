import { normalizePhone } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { BookingStepper, Button, Screen, SegmentedControl, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { GIFT_STEPS, giftDraft, useGiftDraft } from '../../../payments/giftDraft';
import { SendTimePicker } from '../../../payments/SendTimePicker';
import { useSettings } from '../../../settings/useSettings';

/**
 * `/wallet/gift/recipient` — WAL-09 (now, later; WALT 02). Only what delivery needs: a name for the card and a number
 * to text (PRIV 09 — no other details about the recipient).
 */
export default function GiftRecipient() {
  const router = useRouter();
  const draft = useGiftDraft();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [later, setLater] = useState(!!draft.sendAt);
  const [when, setWhen] = useState(() => new Date(draft.sendAt ?? Date.now() + 24 * 3600_000));
  const [errors, setErrors] = useState<{ name?: string; phone?: string; time?: string }>({});
  if (!draft.design || !draft.amountCents) return <Redirect href="/wallet/gift/design" />;

  const next = () => {
    const e: typeof errors = {};
    if (!draft.recipientName.trim()) e.name = t('gift.nameError');
    if (!normalizePhone(draft.recipientPhone)) e.phone = t('aut.phone.invalid');
    if (later && when.getTime() <= Date.now()) e.time = t('gift.timeError');
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    giftDraft.set({ sendAt: later ? when.toISOString() : null });
    router.push('/wallet/gift/review');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('gift.title'), headerBackTitle: t('gift.step.value') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          topInset={false}
          footer={
            <Button size="lg" fullWidth onPress={next}>
              {t('gift.review')}
            </Button>
          }
        >
          <BookingStepper steps={GIFT_STEPS.map((step) => t(step))} current={2} />
          <View style={styles.group}>
            <TextField label={t('gift.name')} value={draft.recipientName} onChangeText={(v) => giftDraft.set({ recipientName: v })} error={errors.name} maxLength={60} autoComplete="off" />
            {/* WP-13: field order per WAL-09 — name, send it by, number, message, when. Text is the only channel. */}
            <Text variant="label">{t('gift.sendBy')}</Text>
            <Text variant="body">{t('gift.text')}</Text>
            <TextField
              label={t('gift.phone')}
              value={draft.recipientPhone}
              onChangeText={(v) => giftDraft.set({ recipientPhone: v })}
              error={errors.phone}
              icon="phone"
              keyboardType="phone-pad"
              maxLength={20}
              autoComplete="off"
            />
            <TextField label={t('gift.message')} value={draft.message} onChangeText={(v) => giftDraft.set({ message: v })} maxLength={200} multiline optional />
            <Text variant="label">{t('gift.when')}</Text>
            <SegmentedControl label={t('gift.when')} options={[t('gift.now'), t('gift.later')]} value={later ? t('gift.later') : t('gift.now')} onChange={(v) => setLater(v === t('gift.later'))} />
            {later ? <SendTimePicker label={t('gift.sendOn')} value={when} onChange={setWhen} zone={zone} /> : null}
            {errors.time ? (
              <Text variant="caption" tone="danger">
                {errors.time}
              </Text>
            ) : null}
          </View>
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space['4'] },
});
