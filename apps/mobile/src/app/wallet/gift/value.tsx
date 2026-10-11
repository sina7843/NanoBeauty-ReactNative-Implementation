import { radius, space } from '@nano/design-tokens';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BookingStepper, Button, GiftCard, Screen, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { customGiftCents, GIFT_STEPS, giftDraft, useGiftDraft } from '../../../payments/giftDraft';
import { useSettings } from '../../../settings/useSettings';
import { useTheme } from '../../../theme/ThemeProvider';

/** `/wallet/gift/value` — WAL-08 (preset, custom, error). Amounts and range are settings (A7); no expiry (BC). */
export default function GiftValue() {
  const router = useRouter();
  const { colors } = useTheme();
  const draft = useGiftDraft();
  const gift = useSettings().data?.data.settings.gift;
  const presets = gift?.presetsCAD ?? [];
  const [custom, setCustom] = useState(() => (draft.amountCents && !presets.includes(draft.amountCents / 100) ? String(draft.amountCents / 100) : ''));
  const [error, setError] = useState<string>();
  if (!draft.design) return <Redirect href="/wallet/gift/design" />;
  const [min, max] = gift?.customRangeCAD ?? [25, 500];
  const typed = custom.trim() ? customGiftCents(custom, min, max) : null;

  const next = () => {
    if (custom.trim()) {
      if (typed === null) {
        setError(t('gift.customError', { min, max }));
        return;
      }
      giftDraft.set({ amountCents: typed });
    }
    router.push('/wallet/gift/recipient');
  };
  // WP-12: the amount is the preset picked or the typed one; a cleared field leaves nothing chosen.
  const amountCents = custom.trim() ? typed : draft.amountCents;

  return (
    <>
      <Stack.Screen options={{ title: t('gift.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          topInset={false}
          footer={
            <Button size="lg" fullWidth disabled={!!error || (!custom.trim() && !draft.amountCents)} onPress={next}>
              {t('pay.continue')}
            </Button>
          }
        >
          <BookingStepper steps={GIFT_STEPS.map((step) => t(step))} current={1} />
          <GiftCard amount={(amountCents ?? 0) / 100} design={draft.design} code={t('gift.preview')} />
          <View style={styles.tiles} accessibilityRole="radiogroup" accessibilityLabel={t('gift.value')}>
            {presets.map((v) => {
              const on = !custom.trim() && draft.amountCents === v * 100;
              return (
                <Pressable
                  key={v}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    setCustom('');
                    setError(undefined);
                    giftDraft.set({ amountCents: v * 100 });
                  }}
                  style={[styles.tile, { backgroundColor: on ? colors.surfaceTint : colors.surface, borderColor: on ? colors.primary : colors.line, borderWidth: on ? 2 : 1.5 }]}
                >
                  <Text variant="headline">{`$${v}`}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label={t('gift.custom')}
            placeholder={t('gift.customPlaceholder', { min, max })}
            value={custom}
            onChangeText={(v) => {
              setCustom(v);
              // A typed amount replaces the preset; clearing it leaves nothing chosen (no hidden old amount).
              giftDraft.set({ amountCents: null });
              if (error) setError(undefined);
            }}
            error={error}
            helper={t('gift.noExpiry')}
            keyboardType="number-pad"
            maxLength={5}
            optional
          />
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: space['2'] },
  tile: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
});
