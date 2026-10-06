import type { PaymentMethod } from '@nano/contracts';

/**
 * Client side of the payment provider (R03, E4 — vendor not chosen). Card details are turned into a provider token
 * ON THE DEVICE; only the token reaches the Nano Beauty API, which never sees or stores card data (PAY 01).
 *
 * This build ships the development provider: test card numbers map to deterministic tokens the API's dev
 * provider understands. A live provider replaces these two functions with its SDK (secure card field, Apple Pay /
 * Google Pay sheets) without changing any screen.
 */
const TEST_CARDS: Record<string, string> = {
  '4242': 'tok_visa', // succeeds
  '0002': 'tok_decline', // declined
  '9995': 'tok_insufficient', // declined: insufficient funds
  '3155': 'tok_3ds', // bank check (3-D Secure) opens
  '0341': 'tok_timeout', // bank never answers in time
};

export function tokenizeCard(card: { number: string; expiry: string; cvc: string; postal: string }): string | null {
  const digits = card.number.replace(/\D/g, '');
  const valid = digits.length >= 13 && digits.length <= 19 && /^(0[1-9]|1[0-2])\/?\d{2}$/.test(card.expiry.trim()) && /^\d{3,4}$/.test(card.cvc) && card.postal.trim().length >= 3;
  if (!valid) return null;
  return TEST_CARDS[digits.slice(-4)] ?? 'tok_unknown';
}

/** Apple Pay / Google Pay sheet. Development: approves with the test token; `null` = the person closed the sheet. */
export async function presentWalletPay(_method: Extract<PaymentMethod, 'apple_pay' | 'google_pay'>): Promise<string | null> {
  return 'tok_visa';
}
