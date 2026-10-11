import { formatPhone, normalizePhone } from '@nano/contracts';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { SignInGate } from '../../../auth/SignInGate';
import { Banner, BookingStepper, Button, GiftCard, ListGroup, ListRow, Screen, Text } from '../../../components';
import { newIdempotencyKey } from '../../../booking/visits';
import { t } from '../../../i18n';
import { clinicDateTime } from '../../../i18n/format';
import { createOrder } from '../../../payments/checkout';
import { GIFT_STEPS, useGiftDraft } from '../../../payments/giftDraft';
import { cents } from '../../../payments/queries';
import { useSettings } from '../../../settings/useSettings';

/** `/wallet/gift/review` — WAL-10. Sign-in happens here, before paying; nothing is sent until the payment is confirmed. */
export default function GiftReview() {
  const draft = useGiftDraft();
  if (!draft.design || !draft.amountCents || !draft.recipientName) return <Redirect href="/wallet/gift/design" />;
  return (
    <>
      <Stack.Screen options={{ title: t('gift.title'), headerBackTitle: t('gift.step.recipient') }} />
      <SignInGate>
        <Review />
      </SignInGate>
    </>
  );
}

function Review() {
  const router = useRouter();
  const { session } = useAuth();
  const draft = useGiftDraft();
  const zone = useSettings().data?.data.clinic.timezone ?? 'America/Vancouver';
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // One key per reviewed gift: a double tap or a retry returns the same order (no second gift).
  const [key] = useState(newIdempotencyKey);
  const phone = normalizePhone(draft.recipientPhone);

  async function pay() {
    setBusy(true);
    setFailed(false);
    try {
      const order = await createOrder(
        session,
        {
          kind: 'gift',
          gift: {
            design: draft.design,
            amountCents: draft.amountCents,
            recipientName: draft.recipientName.trim(),
            recipientPhone: draft.recipientPhone,
            message: draft.message.trim() || null,
            sendAt: draft.sendAt,
          },
        },
        key,
      );
      router.push({ pathname: '/pay/method', params: { order: order.id } });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth icon="lock" loading={busy} onPress={pay}>
          {t('gift.pay', { amount: cents(draft.amountCents!) })}
        </Button>
      }
    >
      <BookingStepper steps={GIFT_STEPS.map((step) => t(step))} current={3} />
      <GiftCard amount={draft.amountCents! / 100} recipient={draft.recipientName.trim()} design={draft.design!} code={t('gift.preview')} />
      <ListGroup>
        <ListRow title={t('gc.to')} subtitle={t('gift.recipient', { name: draft.recipientName, phone: phone ? formatPhone(phone) : draft.recipientPhone })} chevron={false} />
        {draft.message.trim() ? <ListRow title={t('gift.message')} subtitle={`“${draft.message.trim()}”`} chevron={false} /> : null}
        <ListRow title={t('gc.sends')} subtitle={draft.sendAt ? t('gift.sendsLater', { date: clinicDateTime(draft.sendAt, zone) }) : t('gift.sendsNow')} chevron={false} />
        <ListRow title={t('gift.expiry')} value={t('gift.none')} chevron={false} />
        <ListRow title={t('gift.total')} value={cents(draft.amountCents!)} chevron={false} />
      </ListGroup>
      <Text variant="caption" tone="inkMuted">
        {t('gift.howClaim', { name: draft.recipientName })}
      </Text>
      {failed ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : null}
    </Screen>
  );
}
