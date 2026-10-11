import {
  historyResponseSchema,
  instrumentDetailSchema,
  methodsResponseSchema,
  orderSchema,
  receiptSchema,
  walletSchema,
  type HistoryItem,
} from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import type { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { loadCached, type Cached } from '../content/cache';
import { money } from '../i18n/format';
import { PRIVATE_PREFIX } from '../lib/private-cache';

/** "$1,200.00" from integer cents (the API never sends floats for money). */
export const cents = (value: number) => money(value / 100);

const noRetry = (count: number, error: unknown) => !(error instanceof ApiError && ['not_found', 'unauthorized', 'forbidden', 'conflict'].includes(error.code)) && count < 2;

function useAuthed<T>(key: readonly unknown[], path: string, schema: z.ZodType<T>, enabled = true) {
  const { status, session } = useAuth();
  return useQuery({
    queryKey: key,
    queryFn: async () => schema.parse((await session.authed(path)).body),
    enabled: enabled && status === 'signedIn',
    retry: noRetry,
  });
}

/**
 * WAL-01. Server-confirmed balances only; an offline copy is labelled with its time (never edited locally) and
 * wiped on sign-out with the other `nano.private.*` keys.
 */
export function useWallet() {
  const { status, session } = useAuth();
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => loadCached(`${PRIVATE_PREFIX}wallet`, '/v1/wallet', walletSchema, AsyncStorage, (path, init) => session.authed(path, init), undefined, 7 * 24 * 3600_000),
    enabled: status === 'signedIn',
    staleTime: (q) => ((q.state.data as Cached<unknown> | undefined)?.source === 'cache' ? 0 : 30_000),
    retry: noRetry,
  });
}

/** WP-10: WAL-06 "Show" filter. The server ids are `order:…` (payments), `refund:…` and `ledger:…` (wallet moves). */
export type HistoryFilter = 'all' | 'payments' | 'refunds';
export function historyKind(h: Pick<HistoryItem, 'id'>): 'payment' | 'refund' | 'move' {
  return h.id.startsWith('order:') ? 'payment' : h.id.startsWith('refund:') ? 'refund' : 'move';
}
export function filterHistory<T extends Pick<HistoryItem, 'id'>>(items: T[], filter: HistoryFilter): T[] {
  if (filter === 'all') return items;
  const kind = filter === 'payments' ? 'payment' : 'refund';
  return items.filter((h) => historyKind(h) === kind);
}

export const useInstrument = (id: string | undefined) => useAuthed(['wallet', 'instrument', id], `/v1/wallet/instruments/${encodeURIComponent(id ?? '')}`, instrumentDetailSchema, !!id);
export const useHistory = () => useAuthed(['wallet', 'history'], '/v1/wallet/history', historyResponseSchema);
export const useOrder = (id: string | undefined) => useAuthed(['order', id], `/v1/orders/${encodeURIComponent(id ?? '')}`, orderSchema, !!id);
export const useMethods = (orderId: string | undefined) => useAuthed(['methods', orderId], `/v1/orders/${encodeURIComponent(orderId ?? '')}/methods?platform=${Platform.OS === 'ios' ? 'ios' : 'android'}`, methodsResponseSchema, !!orderId);
export const useReceipt = (orderId: string | undefined) => useAuthed(['receipt', orderId], `/v1/receipts/${encodeURIComponent(orderId ?? '')}`, receiptSchema, !!orderId);
