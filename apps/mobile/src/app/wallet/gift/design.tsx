import { Stack, useRouter } from 'expo-router';
import { BookingStepper, Button, GiftCard, GiftDesignPicker, Screen, Text } from '../../../components';
import { t } from '../../../i18n';
import { designName, GIFT_STEPS, giftDraft, useGiftDraft } from '../../../payments/giftDraft';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/gift/design` — WAL-13 (selected, loading; WALT 13). Designs come from settings; guests may start a gift. */
export default function GiftDesign() {
  const router = useRouter();
  const draft = useGiftDraft();
  const gift = useSettings().data?.data.settings.gift;
  const designs = (gift?.designs ?? []).map((key) => ({ key, name: designName(key) }));
  // The preview shows the chosen face with the value picked so far, or the first preset until one is picked.
  const previewCents = draft.amountCents ?? (gift?.presetsCAD[0] ?? 0) * 100;
  return (
    <>
      <Stack.Screen options={{ title: t('gift.designTitle'), headerBackTitle: t('wal.title') }} />
      <Screen
        topInset={false}
        footer={
          <Button size="lg" fullWidth disabled={!draft.design || !gift} onPress={() => router.push('/wallet/gift/value')}>
            {t('pay.continue')}
          </Button>
        }
      >
        <BookingStepper steps={GIFT_STEPS.map((step) => t(step))} current={0} />
        <Text variant="titleMd" accessibilityRole="header">
          {t('gift.design')}
        </Text>
        <Text variant="body" tone="inkMuted">
          {t('gift.designBody')}
        </Text>
        <GiftDesignPicker
          designs={gift ? designs : [{ key: 'a', name: '' }, { key: 'b', name: '' }, { key: 'c', name: '' }]}
          selected={draft.design}
          loading={!gift}
          onSelect={(key) => giftDraft.set({ design: key })}
        />
        {draft.design && gift ? <GiftCard amount={previewCents / 100} design={draft.design} code={t('gift.preview')} sample /> : null}
      </Screen>
    </>
  );
}
