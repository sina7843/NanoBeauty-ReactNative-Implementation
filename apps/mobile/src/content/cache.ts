import type { z } from 'zod';
import { ApiError, apiRequest, type ApiResponse, type RequestInit } from '../api/client';

/** Public, non-secret content only (never tokens). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type Cached<T> = {
  data: T;
  /** `cache` = last server copy shown because the network call failed (NFR 09 offline reads). */
  source: 'network' | 'cache';
  /** When this copy was fetched from the server. */
  savedAt: string;
};

type Stored = { etag: string | null; savedAt: string; data: unknown };
type Request = (path: string, init: RequestInit) => Promise<ApiResponse>;

async function readStore<T>(store: KeyValueStore, key: string, schema: z.ZodType<T>): Promise<{ etag: string | null; savedAt: string; data: T } | null> {
  try {
    const raw = await store.getItem(key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Stored>;
    const data = schema.safeParse(stored.data);
    if (!data.success || typeof stored.savedAt !== 'string') return null;
    return { etag: typeof stored.etag === 'string' ? stored.etag : null, savedAt: stored.savedAt, data: data.data };
  } catch {
    return null;
  }
}

/**
 * Reads public content with a cached fallback: revalidates with the ETag, keeps the last server copy for
 * offline use, and never invents data — no server copy and no cache throws so screens show error/retry.
 */
export async function loadCached<T>(
  key: string,
  path: string,
  schema: z.ZodType<T>,
  store: KeyValueStore,
  request: Request = apiRequest,
  now: () => number = Date.now,
  /** Saved copies older than this are not shown offline (e.g. a withdrawn professional consent). */
  maxAgeMs: number = Number.POSITIVE_INFINITY,
): Promise<Cached<T>> {
  const stored = await readStore(store, key, schema);
  const cached = stored && now() - Date.parse(stored.savedAt) <= maxAgeMs ? stored : null;
  try {
    const res = await request(path, cached?.etag ? { headers: { 'if-none-match': cached.etag } } : {});
    if (res.status === 304 && cached) {
      const savedAt = new Date(now()).toISOString();
      await store.setItem(key, JSON.stringify({ etag: cached.etag, savedAt, data: cached.data } satisfies Stored)).catch(() => undefined);
      return { data: cached.data, source: 'network', savedAt };
    }
    const parsed = schema.safeParse(res.body);
    if (!parsed.success) throw new ApiError('invalid_response', res.status, res.headers.get('x-request-id'));
    const savedAt = new Date(now()).toISOString();
    await store.setItem(key, JSON.stringify({ etag: res.headers.get('etag'), savedAt, data: parsed.data } satisfies Stored)).catch(() => undefined);
    return { data: parsed.data, source: 'network', savedAt };
  } catch (error) {
    // A 404 is an answer (the item is gone), and an auth failure means the copy may not be this person's:
    // neither is a reason to show a stale copy.
    const answered = error instanceof ApiError && ['not_found', 'unauthorized', 'forbidden', 'session_expired'].includes(error.code);
    if (cached && !answered) return { data: cached.data, source: 'cache', savedAt: cached.savedAt };
    throw error;
  }
}
