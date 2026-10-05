import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

let wired = false;

/** Lets TanStack Query pause/resume on real connectivity and refetch when the app returns to foreground. */
export function wireQueryToDevice() {
  if (wired) return;
  wired = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
  );
  AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
}

/** `null` while unknown. Booking, payment and balance changes require `true` (NFR 09). */
export function useIsOnline(): boolean | null {
  const { isConnected, isInternetReachable } = useNetInfo();
  if (isConnected === null) return null;
  return isConnected && isInternetReachable !== false;
}
