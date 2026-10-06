import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPendingPayment, loadPendingPayment, PAYMENT_RESUME_MS, savePendingPayment } from './pendingPayment';
import { tokenizeCard } from './provider';
import { cents } from './queries';

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
