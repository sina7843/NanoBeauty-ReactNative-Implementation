import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIVATE_PREFIX } from '../lib/private-cache';

const KEY = `${PRIVATE_PREFIX}payment`;
/** PAY-03: "If the app closes during payment, we'll check the result next time you open it." */
export const PAYMENT_RESUME_MS = 24 * 3600_000;

export interface PendingPayment {
  attemptId: string;
  orderId: string;
  startedAt: number;
}

export async function savePendingPayment(p: PendingPayment) {
  await AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => undefined);
}

export async function loadPendingPayment(now = Date.now()): Promise<PendingPayment | null> {
  try {
    const p = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null') as Partial<PendingPayment> | null;
    if (!p || typeof p.attemptId !== 'string' || typeof p.orderId !== 'string' || typeof p.startedAt !== 'number') return null;
    return p.startedAt <= now && now - p.startedAt <= PAYMENT_RESUME_MS ? (p as PendingPayment) : null;
  } catch {
    return null;
  }
}

export async function clearPendingPayment() {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
