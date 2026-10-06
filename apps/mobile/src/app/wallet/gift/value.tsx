import { space } from '@nano/design-tokens';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Chip, Screen, Text, TextField } from '../../../components';
import { t } from '../../../i18n';
import { giftDraft, useGiftDraft } from '../../../payments/giftDraft';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/gift/value` — WAL-08 (preset, custom, error). Amounts and range are settings (A7); no expiry (BC). */
export default function GiftValue() {
  const router = useRouter();
  const draft = useGiftDraft();
  const gift = useSettings().data?.data.settings.gift;
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string>();
  if (!draft.design) return <Redirect href="/wallet/gift/design" />;
  const [min, max] = gift?.customRangeCAD ?? [25, 500];

  const next = () => {
    if (custom.trim()) {
      const dollars = Number(custom.replace(/[$,\s]/g, ''));
      if (!Number.isInteger(dollars) || dollars < min || dollars > max) {
        setError(t('gift.customError', { min, max }));
        return;
      }
      giftDraft.set({ amountCents: dollars * 100 });
    }
    router.push('/wallet/gift/recipient');
  };

  return (
    <>
      <Stack.Screen options={{ title: t('gift.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          topInset={false}
          footer={
            <Button size="lg" fullWidth disabled={!draft.amountCents && !custom.trim()} onPress={next}>
              {t('pay.continue')}
            </Button>
          }
        >
          <Text variant="displayMd" accessibilityRole="header">
            {t('gift.value')}
          </Text>
          <View style={styles.chips}>
            {(gift?.presetsCAD ?? []).map((v) => (
              <Chip
                key={v}
                selected={!custom && draft.amountCents === v * 100}
                onPress={() => {
                  setCustom('');
                  setError(undefined);
                  giftDraft.set({ amountCents: v * 100 });
                }}
              >
                {`$${v}`}
              </Chip>
            ))}
          </View>
          <TextField
            label={t('gift.custom')}
            placeholder={t('gift.customPlaceholder', { min, max })}
            value={custom}
            onChangeText={(v) => {
              setCustom(v);
              if (error) setError(undefined);
            }}
            error={error}
            helper={t('gift.noExpiry')}
            keyboardType="number-pad"
            maxLength={5}
          />
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
