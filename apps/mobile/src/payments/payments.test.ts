import type { Instrument } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { customGiftCents, giftCodeTooShort } from './giftDraft';
import { packageState, sentGiftLine, sentGiftStatus } from './InstrumentView';
import { clearPendingPayment, loadPendingPayment, PAYMENT_RESUME_MS, resumablePayment, savePendingPayment } from './pendingPayment';
import { cardErrors, tokenizeCard } from './provider';
import { cents, filterHistory } from './queries';

describe('device-side card tokenising (PAY 01)', () => {
  const card = { number: '4242 4242 4242 4242', expiry: '12/29', cvc: '123', postal: 'V3L 5H1' };
  it('maps test cards to tokens and refuses incomplete details', () => {
    expect(tokenizeCard(card)).toBe('tok_visa');
    expect(tokenizeCard({ ...card, number: '4000000000000002' })).toBe('tok_decline');
    expect(tokenizeCard({ ...card, number: '4000000000003155' })).toBe('tok_3ds');
    expect(tokenizeCard({ ...card, expiry: '13/29' })).toBeNull();
    expect(tokenizeCard({ ...card, cvc: '1' })).toBeNull();
    expect(tokenizeCard({ ...card, number: '4242' })).toBeNull();
  });
});

describe('money from cents', () => {
  it('formats integer cents without float drift', () => {
    expect(cents(120000)).toBe('$1,200.00');
    expect(cents(5714)).toBe('$57.14');
  });
});

describe('pending payment (relaunch)', () => {
  beforeEach(() => AsyncStorage.clear());
  it('resumes within a day only', async () => {
    const startedAt = Date.parse('2026-10-06T17:00:00Z');
    await savePendingPayment({ attemptId: 'a', orderId: 'o', startedAt });
    expect(await loadPendingPayment(startedAt + 1000)).toEqual({ attemptId: 'a', orderId: 'o', startedAt });
    expect(await loadPendingPayment(startedAt + PAYMENT_RESUME_MS + 1)).toBeNull();
    await clearPendingPayment();
    expect(await loadPendingPayment(startedAt)).toBeNull();
  });
});

describe('WP-1 relaunch resumes only processing payments', () => {
  beforeEach(() => AsyncStorage.clear());
  const marker = { attemptId: 'a', orderId: 'o', startedAt: Date.now() - 1000 };
  it('resumes processing, drops anything else, keeps the marker when the server is unreachable', async () => {
    await savePendingPayment(marker);
    expect(await resumablePayment(async () => 'processing')).toEqual(marker);
    expect(
      await resumablePayment(async () => {
        throw new Error('offline');
      }),
    ).toBeNull();
    expect(await loadPendingPayment()).toEqual(marker);
    expect(await resumablePayment(async () => 'requires_action')).toBeNull();
    expect(await loadPendingPayment()).toBeNull();
    await savePendingPayment(marker);
    expect(await resumablePayment(async () => null)).toBeNull();
    expect(await loadPendingPayment()).toBeNull();
  });
});

describe('WP-19 card field errors', () => {
  it('names each wrong field', () => {
    expect(cardErrors({ number: '4242 4242 4242', expiry: '08 / 28', cvc: '123', postal: 'V3M 0A1' })).toEqual({ number: 'pay.card.err.numberShort' });
    expect(cardErrors({ number: '4242424242424242', expiry: '13/28', cvc: '1', postal: '' })).toEqual({ expiry: 'pay.card.err.expiry', cvc: 'pay.card.err.cvc', postal: 'pay.card.err.postal' });
  });
});

describe('WP-10 history filter', () => {
  const items = [{ id: 'order:1' }, { id: 'refund:2' }, { id: 'ledger:3' }];
  it('splits payments and refunds by the server id', () => {
    expect(filterHistory(items, 'all')).toHaveLength(3);
    expect(filterHistory(items, 'payments')).toEqual([{ id: 'order:1' }]);
    expect(filterHistory(items, 'refunds')).toEqual([{ id: 'refund:2' }]);
  });
});

describe('gift helpers (WP-12, WP-14)', () => {
  it('custom amount and code length', () => {
    expect(customGiftCents('75', 25, 500)).toBe(7500);
    expect(customGiftCents('', 25, 500)).toBeNull();
    expect(customGiftCents('600', 25, 500)).toBeNull();
    expect(giftCodeTooShort('NB-7Q4K')).toBe(true);
    expect(giftCodeTooShort('ABCD-EFGH-4821')).toBe(false);
  });
});

describe('wallet states (WP-3, WP-6)', () => {
  const base = { id: 'g', kind: 'gift_card', label: 'Gift card', source: 'gift', status: 'active', balanceCents: 10000, sessions: null, expiresAt: null, last4: null, role: 'sender' } as const;
  const gift = (delivery: 'scheduled' | 'sent' | 'failed' | 'cancelled', claimedAt: string | null = null): Instrument => ({
    ...base,
    gift: { recipientName: 'Sara', recipientPhoneMasked: '', message: null, design: 'love', delivery, sendAt: null, sentAt: null, claimedAt },
  });
  it('sent gift status and line follow delivery', () => {
    expect(sentGiftStatus(gift('failed'))).toBeUndefined();
    expect(sentGiftStatus(gift('cancelled'))).toBe('refunded');
    expect(sentGiftStatus(gift('sent', '2026-10-01T00:00:00Z'))).toBe('claimed');
    expect(sentGiftLine(gift('failed'), 'America/Vancouver')).toBe('Couldn’t text Sara');
  });
  it('package state', () => {
    const now = Date.parse('2026-10-11T00:00:00Z');
    const pkg = (remaining: number, expiresAt: string | null): Instrument => ({ ...base, kind: 'package', role: 'owner', gift: null, balanceCents: null, sessions: { total: 6, used: 6 - remaining, remaining }, expiresAt });
    expect(packageState(pkg(0, null), now)).toBe('used');
    expect(packageState(pkg(2, '2026-10-01T00:00:00Z'), now)).toBe('expired');
    expect(packageState(pkg(2, '2026-10-20T00:00:00Z'), now)).toBe('expiring');
    expect(packageState(pkg(2, '2027-02-28T00:00:00Z'), now)).toBe('active');
  });
});
