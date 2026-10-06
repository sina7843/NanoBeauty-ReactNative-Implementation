import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIVATE_PREFIX } from '../lib/private-cache';

const KEY = `${PRIVATE_PREFIX}handoff`;
/** After this, a relaunch no longer reopens the return check; Visits shows whatever Fresha shared. */
export const RESUME_WINDOW_MS = 2 * 3600_000;

export interface PendingHandoff {
  id: string;
  openedAt: number;
}

/**
 * The hand-off the person left for Fresha from. If the app is killed while Fresha is open, the next launch
 * resumes the return check (BOOK 16) instead of losing the booking intent. Holds an id only, no booking data.
 */
export async function savePendingHandoff(p: PendingHandoff): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => undefined);
}

export async function loadPendingHandoff(now = Date.now()): Promise<PendingHandoff | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Partial<PendingHandoff>) : null;
    if (!p || typeof p.id !== 'string' || typeof p.openedAt !== 'number') return null;
    return now - p.openedAt <= RESUME_WINDOW_MS && p.openedAt <= now ? { id: p.id, openedAt: p.openedAt } : null;
  } catch {
    return null;
  }
}

export async function clearPendingHandoff(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
