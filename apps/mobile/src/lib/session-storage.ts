import { tokenPairSchema, type TokenPair } from '@nano/contracts';
import * as SecureStore from 'expo-secure-store';

// The only place session credentials are persisted: Keychain (iOS) / Keystore-backed storage (Android).
// Never AsyncStorage (IMPLEMENTATION_DECISIONS §3).
const KEY = 'nano.session.v2';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

export type StoredSession = TokenPair;

export interface SessionStore {
  read(): Promise<StoredSession | null>;
  write(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

export const secureSessionStore: SessionStore = {
  async read() {
    const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
    if (!raw) return null;
    try {
      const parsed = tokenPairSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // fall through: a corrupt entry is cleared
    }
    await SecureStore.deleteItemAsync(KEY, OPTIONS);
    return null;
  },
  write: (session) => SecureStore.setItemAsync(KEY, JSON.stringify(session), OPTIONS),
  clear: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
};
