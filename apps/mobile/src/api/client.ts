import { errorEnvelopeSchema, REQUEST_ID_HEADER, type ErrorCode } from '@nano/contracts';
import { getEnv } from '../config/env';

const TIMEOUT_MS = 15_000;

/** Every failed call becomes one of these; screens map `code` to copy, never show raw messages. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode | 'network' | 'not_configured' | 'invalid_response',
    readonly status: number | null,
    readonly requestId: string | null,
  ) {
    super(`API ${code}${status ? ` (${status})` : ''}`);
    this.name = 'ApiError';
  }
}

export type ApiResponse = { status: number; headers: Headers; body: unknown };

export async function apiRequest(
  path: string,
  init: { headers?: Record<string, string> } = {},
  fetchImpl: typeof fetch = fetch,
  baseUrl: string | null = getEnv().apiUrl,
): Promise<ApiResponse> {
  if (!baseUrl) throw new ApiError('not_configured', null, null);
  let res: Response;
  let body: unknown = null;
  // One timeout covers headers and body, so a stalled response still fails over to the cache.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    res = await fetchImpl(`${baseUrl}${path}`, {
      headers: { accept: 'application/json', ...init.headers },
      signal: controller.signal,
    });
    if (res.status !== 304) body = await res.json().catch(() => null);
  } catch {
    throw new ApiError('network', null, null);
  } finally {
    clearTimeout(timer);
  }
  const requestId = res.headers.get(REQUEST_ID_HEADER);
  if (res.status === 304) return { status: 304, headers: res.headers, body: null };
  if (!res.ok) {
    const envelope = errorEnvelopeSchema.safeParse(body);
    throw new ApiError(envelope.success ? envelope.data.error.code : 'invalid_response', res.status, requestId);
  }
  return { status: res.status, headers: res.headers, body };
}
