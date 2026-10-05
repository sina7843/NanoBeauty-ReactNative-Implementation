import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { loadSettings } from './bootstrap';

export const settingsQueryKey = ['settings'] as const;

/** Typed boundary for settings + feature flags. Screens read rules from here, never constants. */
export function useSettings() {
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => loadSettings(AsyncStorage),
    staleTime: 5 * 60_000,
    // A cached fallback is still "stale" — retry in the background when the app refocuses.
    refetchOnWindowFocus: true,
  });
}
