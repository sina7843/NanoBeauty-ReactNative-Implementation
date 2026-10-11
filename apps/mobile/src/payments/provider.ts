import type { PaymentMethod } from '@nano/contracts';
import type { StringKey } from '../i18n';

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

export interface CardInput {
  number: string;
  expiry: string;
  cvc: string;
  postal: string;
}

/** WP-19: which card fields are wrong (i18n keys under `pay.card.err.*`), so each error shows under its own field. */
export function cardErrors(card: CardInput): Partial<Record<keyof CardInput, StringKey>> {
  const digits = card.number.replace(/\D/g, '');
  const errors: Partial<Record<keyof CardInput, StringKey>> = {};
  if (digits.length < 13) errors.number = 'pay.card.err.numberShort';
  else if (digits.length > 19) errors.number = 'pay.card.err.number';
  if (!/^(0[1-9]|1[0-2]) ?\/? ?\d{2}$/.test(card.expiry.trim())) errors.expiry = 'pay.card.err.expiry';
  if (!/^\d{3,4}$/.test(card.cvc)) errors.cvc = 'pay.card.err.cvc';
  if (card.postal.trim().length < 3) errors.postal = 'pay.card.err.postal';
  return errors;
}

export function tokenizeCard(card: CardInput): string | null {
  if (Object.keys(cardErrors(card)).length) return null;
  return TEST_CARDS[card.number.replace(/\D/g, '').slice(-4)] ?? 'tok_unknown';
}

/** Apple Pay / Google Pay sheet. Development: approves with the test token; `null` = the person closed the sheet. */
export async function presentWalletPay(_method: Extract<PaymentMethod, 'apple_pay' | 'google_pay'>): Promise<string | null> {
  return 'tok_visa';
}
