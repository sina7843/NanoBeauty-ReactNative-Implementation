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
