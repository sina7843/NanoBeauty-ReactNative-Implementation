import {
  articleSchema,
  catalogSchema,
  homeContentSchema,
  offerResponseSchema,
  policySchema,
  supportHubSchema,
} from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import { ApiError } from '../api/client';
import { loadCached, type Cached } from './cache';

const FIVE_MIN = 5 * 60_000;
/** Offline copies are shown for up to a week; older ones are dropped (content and consent may have changed). */
const MAX_OFFLINE_AGE = 7 * 24 * 3600_000;

/** Public content: cached for offline reads, revalidated on focus; mutations never use these hooks. */
function useContent<T>(key: string, path: string, schema: z.ZodType<T>, enabled = true) {
  return useQuery({
    queryKey: ['content', key],
    queryFn: () => loadCached(`nano.content.${key}`, path, schema, AsyncStorage, undefined, undefined, MAX_OFFLINE_AGE),
    // A saved copy shown because the network failed is stale at once, so it's replaced as soon as possible.
    staleTime: (q) => ((q.state.data as Cached<T> | undefined)?.source === 'cache' ? 0 : FIVE_MIN),
    // A 404 is an answer (removed or unknown item), not a reason to keep retrying.
    retry: (count, error) => !(error instanceof ApiError && error.code === 'not_found') && count < 2,
    enabled,
  });
}

export const useCatalog = () => useContent('catalog', '/v1/catalog', catalogSchema);
export const useHomeContent = () => useContent('home', '/v1/content/home', homeContentSchema);
export const useOffer = (id: string | undefined) => useContent(`offer.${id}`, `/v1/offers/${encodeURIComponent(id ?? '')}`, offerResponseSchema, !!id);
export const useSupportHub = () => useContent('support', '/v1/support', supportHubSchema);
export const useArticle = (id: string | undefined) =>
  useContent(`article.${id}`, `/v1/support/articles/${encodeURIComponent(id ?? '')}`, articleSchema, !!id);
export const usePolicy = (id: string | undefined) => useContent(`policy.${id}`, `/v1/policies/${encodeURIComponent(id ?? '')}`, policySchema, !!id);
