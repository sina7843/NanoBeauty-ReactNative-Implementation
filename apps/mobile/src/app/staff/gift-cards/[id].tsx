import { staffGiftSchema, type StaffGift } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { newIdempotencyKey } from '../../../booking/visits';
import { Banner, Button, Dialog, ListGroup, ListRow, Skeleton, Switch, Text, TextField, useToast } from '../../../components';
import { t } from '../../../i18n';
import { money } from '../../../i18n/format';
import { problemOf, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

type Action = 'resend' | 'recipient' | 'void';

/** `/staff/gift-cards/[id]` — STF-18: resend (new code), change recipient before it's claimed, void (Owner). */
export default function GiftCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const gift = useStaffQuery(['gift', id], `/v1/staff/gifts/${id}`, staffGiftSchema, !!id);
  const [open, setOpen] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(true);
  const [key, setKey] = useState(newIdempotencyKey);
  const g = gift.data;
  const canVoid = !!me?.permissions.includes('giftcard.void');
  const canRefund = !!me?.permissions.includes('payments.refund');

  async function run(action: Action) {
    setBusy(true);
    try {
      const body = action === 'recipient' ? { idempotencyKey: key, recipientName: name, recipientPhone: phone } : action === 'void' ? { idempotencyKey: key, reason, refund: refund && canRefund } : { idempotencyKey: key };
      const next: StaffGift = staffGiftSchema.parse((await session.authed(`/v1/staff/gifts/${id}/${action}`, { method: 'POST', body })).body);
      queryClient.setQueryData(['staff', 'gift', id], next);
      queryClient.invalidateQueries({ queryKey: ['staff', 'gifts'] });
      toast({ tone: 'success', message: t('gift.done') });
      setOpen(null);
      setKey(newIdempotencyKey());
    } catch (e) {
      const p = problemOf(e);
      toast({ tone: 'warning', message: p.kind === 'conflict' ? t('stf.conflict') : t('error.body') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffScreen title={t('stf.giftCards')} back={{ to: '/staff/gift-cards', label: t('stf.giftCards') }}>
      {g ? (
        <>
          <Text variant="titleLg">{g.reference}</Text>
          {g.voided ? <Banner tone="warning" title={t('gift.voided')} /> : null}
          {g.delivery === 'failed' ? <Banner tone="warning" title={t('gift.delivery.failed')} /> : null}
          <ListGroup>
            <ListRow title={t('gift.remaining')} value={money(g.remainingCents / 100)} chevron={false} />
            <ListRow title={t('gift.original')} value={money(g.originalCents / 100)} chevron={false} />
            <ListRow title={t('gift.recipient')} value={[g.recipientName, g.recipientPhoneMasked].filter(Boolean).join(' · ')} chevron={false} />
            <ListRow title={t('gift.buyer')} value={g.buyerName ?? '—'} chevron={false} />
            <ListRow title={t('gift.delivery')} value={g.claimed ? t('gift.claimed') : g.delivery ? t(`gift.delivery.${g.delivery}`) : '—'} chevron={false} />
          </ListGroup>
          {!g.voided && !g.claimed ? (
            <View style={styles.actions}>
              <Button variant="secondary" onPress={() => setOpen('resend')}>
                {t('gift.resend')}
              </Button>
              <Button variant="secondary" onPress={() => setOpen('recipient')}>
                {t('gift.changeRecipient')}
              </Button>
            </View>
          ) : null}
          {!g.voided && canVoid ? (
            <Button variant="tertiary" onPress={() => setOpen('void')}>
              {t('gift.void')}
            </Button>
          ) : null}
        </>
      ) : gift.isError ? (
        <Banner tone="danger" title={t('error.title')}>
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={5} media={false} />
      )}

      <Dialog visible={open === 'resend'} title={t('gift.resend')} confirmLabel={t('gift.resend')} cancelLabel={t('common.cancel')} loading={busy} onConfirm={() => run('resend')} onCancel={() => setOpen(null)}>
        <Text variant="body" tone="inkMuted">
          {t('gift.resendBody')}
        </Text>
      </Dialog>
      <Dialog
        visible={open === 'recipient'}
        title={t('gift.changeRecipient')}
        confirmLabel={t('stf.save')}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onConfirm={() => (name.trim() && phone.trim() ? run('recipient') : undefined)}
        onCancel={() => setOpen(null)}
      >
        <TextField label={t('gift.newName')} value={name} onChangeText={setName} maxLength={60} />
        <TextField label={t('gift.newPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" />
        <Text variant="caption" tone="inkMuted">
          {t('gift.resendBody')}
        </Text>
      </Dialog>
      <Dialog
        visible={open === 'void'}
        title={t('gift.voidTitle')}
        confirmLabel={t('gift.void')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy}
        onConfirm={() => (reason.trim().length >= 3 ? run('void') : undefined)}
        onCancel={() => setOpen(null)}
      >
        <Text variant="body" tone="inkMuted">
          {t('gift.voidBody')}
        </Text>
        <TextField label={t('gift.reason')} value={reason} onChangeText={setReason} maxLength={200} />
        {g && g.refundableCents > 0 && canRefund ? <Switch label={t('gift.voidRefund', { amount: money(g.refundableCents / 100) })} value={refund} onValueChange={setRefund} /> : null}
      </Dialog>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] } });
