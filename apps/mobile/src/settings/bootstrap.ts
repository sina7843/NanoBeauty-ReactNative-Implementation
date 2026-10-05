import { settingsBootstrapSchema, type SettingsBootstrap } from '@nano/contracts';
import { ApiError, apiRequest, type ApiResponse } from '../api/client';

export const SETTINGS_CACHE_KEY = 'nano.settings.v1';

/** Settings are public, non-secret config, so plain key-value storage is fine (never for tokens). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

type Cached = { etag: string | null; data: SettingsBootstrap };

export type SettingsResult = {
  data: SettingsBootstrap;
  /** `cache` = last known server copy shown because the network call failed. */
  source: 'network' | 'cache';
};

async function readCache(store: KeyValueStore): Promise<Cached | null> {
  try {
    const raw = await store.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { etag?: unknown; data?: unknown };
    const data = settingsBootstrapSchema.safeParse(parsed.data);
    return data.success ? { etag: typeof parsed.etag === 'string' ? parsed.etag : null, data: data.data } : null;
  } catch {
    return null;
  }
}

/**
 * Fetches settings + flags with a cached fallback (build-plan M0-5). There are no bundled defaults:
 * with no server copy and no cache this throws, so screens show an error/retry state instead of
 * guessing rules, prices or booking mode.
 */
export async function loadSettings(
  store: KeyValueStore,
  request: (path: string, init: { headers?: Record<string, string> }) => Promise<ApiResponse> = apiRequest,
): Promise<SettingsResult> {
  const cached = await readCache(store);
  try {
    const res = await request('/v1/settings', cached?.etag ? { headers: { 'if-none-match': cached.etag } } : {});
    if (res.status === 304 && cached) return { data: cached.data, source: 'network' };
    const parsed = settingsBootstrapSchema.safeParse(res.body);
    if (!parsed.success) throw new ApiError('invalid_response', res.status, res.headers.get('x-request-id'));
    const next: Cached = { etag: res.headers.get('etag'), data: parsed.data };
    await store.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next)).catch(() => undefined);
    return { data: parsed.data, source: 'network' };
  } catch (error) {
    if (cached) return { data: cached.data, source: 'cache' };
    throw error;
  }
}
