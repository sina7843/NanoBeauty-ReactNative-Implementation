import { onlineManager } from '@tanstack/react-query';
import { errorEnvelopeSchema, REQUEST_ID_HEADER, type ErrorEnvelope } from '@nano/contracts';
import { getEnv } from '../config/env';

const TIMEOUT_MS = 15_000;
const ALWAYS_TRY = /^\/v1\/(auth\/|promo\/validate$|gifts\/lookup$|privacy\/deletion\/)/;

export type ApiErrorCode = ErrorEnvelope['error']['code'] | 'network' | 'not_configured' | 'invalid_response';

/** Every failed call becomes one of these; screens map `code` to copy, never show raw messages. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number | null,
    readonly requestId: string | null,
    readonly info: Pick<ErrorEnvelope['error'], 'retryAfterSeconds' | 'attemptsLeft' | 'missingPermission' | 'nextStep'> & { /** The server's own sentence (staff screens show it in a Banner; customer screens map `code` to copy). */ serverMessage?: string } = {},
  ) {
    super(`API ${code}${status ? ` (${status})` : ''}`);
    this.name = 'ApiError';
  }
}

export type ApiResponse = { status: number; headers: Headers; body: unknown };

export interface RequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  /** Bearer access token. */
  token?: string;
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
  baseUrl: string | null = getEnv().apiUrl,
): Promise<ApiResponse> {
  if (!baseUrl) throw new ApiError('not_configured', null, null);
  const method = init.method ?? (init.body === undefined ? 'GET' : 'POST');
  // NFR 09: a booking, payment, cancellation or balance change is never attempted while the device reports no
  // connection; cached screens stay readable but those writes fail fast with the offline state. Sign-in, refresh and
  // read-style POSTs always try (the connectivity probe can be wrong on captive or filtered networks).
  if (method !== 'GET' && !ALWAYS_TRY.test(path) && !onlineManager.isOnline()) throw new ApiError('network', null, null);
  let res: Response;
  let body: unknown = null;
  // One timeout covers headers and body, so a stalled response still fails over (cache / retry UI).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (res.status !== 304 && res.status !== 204) body = await res.json().catch(() => null);
  } catch {
    throw new ApiError('network', null, null);
  } finally {
    clearTimeout(timer);
  }
  const requestId = res.headers.get(REQUEST_ID_HEADER);
  if (res.status === 304 || res.status === 204) return { status: res.status, headers: res.headers, body: null };
  if (!res.ok) {
    const envelope = errorEnvelopeSchema.safeParse(body);
    if (!envelope.success) throw new ApiError('invalid_response', res.status, requestId);
    const { code, retryAfterSeconds, attemptsLeft, missingPermission, nextStep, message } = envelope.data.error;
    throw new ApiError(code, res.status, requestId, { retryAfterSeconds, attemptsLeft, missingPermission, nextStep, serverMessage: message });
  }
  return { status: res.status, headers: res.headers, body };
}
