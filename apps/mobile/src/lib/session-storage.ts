import * as SecureStore from 'expo-secure-store';

// The only place session credentials are persisted: Keychain (iOS) / Keystore-backed storage (Android).
// Never AsyncStorage (IMPLEMENTATION_DECISIONS §3).
const KEY = 'nano.session';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export type StoredSession = { accessToken: string; refreshToken: string };

export async function readSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof value.accessToken === 'string' && typeof value.refreshToken === 'string') {
      return { accessToken: value.accessToken, refreshToken: value.refreshToken };
    }
  } catch {
    // fall through: corrupt entry is cleared
  }
  await clearSession();
  return null;
}

export function writeSession(session: StoredSession): Promise<void> {
  return SecureStore.setItemAsync(KEY, JSON.stringify(session), OPTIONS);
}

export function clearSession(): Promise<void> {
  return SecureStore.deleteItemAsync(KEY, OPTIONS);
}
