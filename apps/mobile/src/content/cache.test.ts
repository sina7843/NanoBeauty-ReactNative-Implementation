import { z } from 'zod';
import { ApiError } from '../api/client';
import { loadCached, type KeyValueStore } from './cache';

const schema = z.object({ v: z.number() });
const store = (initial: Record<string, string> = {}): KeyValueStore => {
  const data = { ...initial };
  return { getItem: async (k) => data[k] ?? null, setItem: async (k, v) => void (data[k] = v) };
};
const offline = async () => {
  throw new ApiError('network', null, null);
};
const saved = (savedAt: string) => ({ k: JSON.stringify({ etag: null, savedAt, data: { v: 1 } }) });

describe('loadCached', () => {
  it('serves a recent saved copy offline, labelled as cache', async () => {
    const now = () => Date.parse('2026-10-06T12:00:00Z');
    await expect(loadCached('k', '/x', schema, store(saved('2026-10-05T12:00:00Z')), offline, now, 7 * 864e5)).resolves.toMatchObject({ source: 'cache', data: { v: 1 } });
  });

  it('drops saved copies older than the maximum age', async () => {
    const now = () => Date.parse('2026-10-20T12:00:00Z');
    await expect(loadCached('k', '/x', schema, store(saved('2026-10-05T12:00:00Z')), offline, now, 7 * 864e5)).rejects.toMatchObject({ code: 'network' });
  });

  it('treats a 404 as an answer, not a reason to show the old copy', async () => {
    const gone = async () => {
      throw new ApiError('not_found', 404, null);
    };
    await expect(loadCached('k', '/x', schema, store(saved('2026-10-05T12:00:00Z')), gone)).rejects.toMatchObject({ code: 'not_found' });
  });
});
