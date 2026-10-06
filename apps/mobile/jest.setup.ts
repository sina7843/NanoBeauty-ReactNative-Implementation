// Official Jest mocks for native modules that jest-expo doesn't cover.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
// In-memory secure store so session persistence can be exercised in tests.
jest.mock('expo-secure-store', () => {
  const data = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
    getItemAsync: jest.fn(async (key: string) => data.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void data.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void data.delete(key)),
  };
});
// expo-notifications: permission undetermined, no push token, and a tap can be simulated from a test.
jest.mock('expo-notifications', () => {
  const listeners = new Set<(mockResponse: unknown) => void>();
  return {
    getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
    getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
    setNotificationHandler: jest.fn(),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    addNotificationResponseReceivedListener: jest.fn((fn: (mockResponse: unknown) => void) => {
      listeners.add(fn);
      return { remove: () => listeners.delete(fn) };
    }),
    __tap: (href: string, recipient?: string) => listeners.forEach((fn) => fn({ notification: { request: { identifier: `n-${Math.random()}`, content: { data: { href, ...(recipient ? { recipient } : {}) } } } } })),
  };
});
