import { useSyncExternalStore } from 'react';

export interface BasketItem {
  serviceId: string;
  /** Per-area treatments (laser): the chosen set and area names (BKG-10). */
  areas?: { set: 'women' | 'men'; names: string[] };
}

/**
 * The booking basket (BOOK 17). Module state, not screen state, so it survives the sign-in detour that
 * dismisses the booking modal. Never persisted: a relaunch starts a fresh basket.
 */
let items: BasketItem[] = [];
const listeners = new Set<() => void>();
const set = (next: BasketItem[]) => {
  items = next;
  listeners.forEach((l) => l());
};

export const basket = {
  get: () => items,
  has: (serviceId: string) => items.some((i) => i.serviceId === serviceId),
  toggle(serviceId: string) {
    set(basket.has(serviceId) ? items.filter((i) => i.serviceId !== serviceId) : [...items, { serviceId }]);
  },
  /** Adds the service (deep link / treatment page) without removing anything already picked. */
  ensure(serviceId: string) {
    if (!basket.has(serviceId)) set([...items, { serviceId }]);
  },
  setAreas(serviceId: string, areas: BasketItem['areas']) {
    set([...items.filter((i) => i.serviceId !== serviceId), { serviceId, areas }]);
  },
  clear: () => set([]),
};

export function useBasket(): BasketItem[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
  );
}
