import AsyncStorage from '@react-native-async-storage/async-storage';

/** Personal data cached for offline reads (VIS-01 offline). Every `nano.private.*` key is wiped on sign-out. */
export const PRIVATE_PREFIX = 'nano.private.';

export async function clearPrivateCache(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PRIVATE_PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // best effort; nothing else to do
  }
}
