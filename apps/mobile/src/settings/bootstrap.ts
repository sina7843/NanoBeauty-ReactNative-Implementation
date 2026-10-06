import { settingsBootstrapSchema, type SettingsBootstrap } from '@nano/contracts';
import type { ApiResponse, RequestInit } from '../api/client';
import { apiRequest } from '../api/client';
import { loadCached, type KeyValueStore } from '../content/cache';

export type { KeyValueStore } from '../content/cache';

export const SETTINGS_CACHE_KEY = 'nano.settings.v1';

export type SettingsResult = {
  data: SettingsBootstrap;
  /** `cache` = last known server copy shown because the network call failed. */
  source: 'network' | 'cache';
};

/**
 * Fetches settings + flags with a cached fallback (build-plan M0-5). There are no bundled defaults:
 * with no server copy and no cache this throws, so screens show an error/retry state instead of
 * guessing rules, prices or booking mode.
 */
export async function loadSettings(
  store: KeyValueStore,
  request: (path: string, init: RequestInit) => Promise<ApiResponse> = apiRequest,
): Promise<SettingsResult> {
  const { data, source } = await loadCached(SETTINGS_CACHE_KEY, '/v1/settings', settingsBootstrapSchema, store, request);
  return { data, source };
}
