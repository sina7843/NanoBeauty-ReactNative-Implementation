import { useSyncExternalStore } from 'react';

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
