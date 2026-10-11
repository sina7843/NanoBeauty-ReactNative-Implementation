import { useSyncExternalStore } from 'react';
import { t, type StringKey } from '../i18n';
import { en } from '../i18n/en';

/** BookingStepper labels for WAL-13 → WAL-08 → WAL-09 → WAL-10 (ISSUE-2). */
export const GIFT_STEPS = ['gift.step.design', 'gift.step.value', 'gift.step.recipient', 'gift.step.review'] as const satisfies readonly StringKey[];

/** A settings design key's caption; an unknown key (added in settings later) shows as itself. */
export function designName(key: string): string {
  const k = `gift.design.${key}`;
  return k in en ? t(k as StringKey) : key;
}

/** WAL-11: codes are 12 letters and numbers; spaces and dashes don't count (the server ignores them too). */
export const GIFT_CODE_LENGTH = 12;
export const giftCodeTooShort = (code: string) => code.replace(/[\s-]/g, '').length < GIFT_CODE_LENGTH;

/** WAL-13 → WAL-08 → WAL-09 → WAL-10. Module state so a guest can start a gift and sign in before paying. */
export interface GiftDraft {
  design: string | null;
  amountCents: number | null;
  recipientName: string;
  recipientPhone: string;
  message: string;
  /** ISO time, or null = send as soon as the payment is confirmed. */
  sendAt: string | null;
}

const EMPTY: GiftDraft = { design: null, amountCents: null, recipientName: '', recipientPhone: '', message: '', sendAt: null };
let draft: GiftDraft = EMPTY;
const listeners = new Set<() => void>();

export const giftDraft = {
  get: () => draft,
  set(patch: Partial<GiftDraft>) {
    draft = { ...draft, ...patch };
    listeners.forEach((l) => l());
  },
  clear() {
    draft = EMPTY;
    listeners.forEach((l) => l());
  },
};

export function useGiftDraft(): GiftDraft {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}

/** WAL-08: a typed amount in whole dollars inside the settings range, as cents; anything else is null. */
export function customGiftCents(text: string, min: number, max: number): number | null {
  const dollars = Number(text.replace(/[$,\s]/g, ''));
  return text.trim() && Number.isInteger(dollars) && dollars >= min && dollars <= max ? dollars * 100 : null;
}
