import type { TokenPair } from '@nano/contracts';
import { ApiError, type ApiResponse, type RequestInit } from '../api/client';
import type { SessionStore } from '../lib/session-storage';
import { SessionManager } from './session';

const pair = (n: number): TokenPair => ({
  accessToken: `a${n}`,
  refreshToken: `r${n}`,
  accessExpiresAt: '2026-10-06T17:15:00.000Z',
  sessionExpiresAt: '2026-11-05T17:00:00.000Z',
});
const ok = (body: unknown): ApiResponse => ({ status: 200, headers: new Headers(), body });

function memoryStore(initial: TokenPair | null = null): SessionStore & { value: TokenPair | null } {
  const store = {
    value: initial,
    read: async () => store.value,
    write: async (s: TokenPair) => {
      store.value = s;
    },
    clear: async () => {
      store.value = null;
    },
  };
  return store;
}

describe('SessionManager', () => {
  it('refreshes once on token_expired and retries with the new token', async () => {
    const calls: [string, RequestInit][] = [];
    const request = jest.fn(async (path: string, init: RequestInit) => {
      calls.push([path, init]);
      if (path === '/v1/auth/refresh') return ok(pair(2));
      if (init.token === 'a1') throw new ApiError('token_expired', 401, null);
      return ok({ me: true });
    });
    const store = memoryStore(pair(1));
    const manager = new SessionManager(store, jest.fn(), request);
    await manager.load();
    expect((await manager.authed('/v1/me')).body).toEqual({ me: true });
    expect(calls.map(([p, i]) => [p, i.token ?? null])).toEqual([
      ['/v1/me', 'a1'],
      ['/v1/auth/refresh', null],
      ['/v1/me', 'a2'],
    ]);
    expect(store.value).toEqual(pair(2));
  });

  it('shares one refresh between parallel calls (never replays a refresh token)', async () => {
    let refreshes = 0;
    const request = jest.fn(async (path: string, init: RequestInit) => {
      if (path === '/v1/auth/refresh') {
        refreshes++;
        await new Promise((r) => setTimeout(r, 5));
        return ok(pair(2));
      }
      if (init.token === 'a1') throw new ApiError('token_expired', 401, null);
      return ok(path);
    });
    const manager = new SessionManager(memoryStore(pair(1)), jest.fn(), request);
    await manager.load();
    await Promise.all([manager.authed('/x'), manager.authed('/y'), manager.authed('/z')]);
    expect(refreshes).toBe(1);
  });

  it('ends the session when the server says it is over', async () => {
    const onExpired = jest.fn();
    const request = jest.fn(async (path: string) => {
      if (path === '/v1/auth/refresh') throw new ApiError('session_expired', 401, null);
      throw new ApiError('token_expired', 401, null);
    });
    const store = memoryStore(pair(1));
    const manager = new SessionManager(store, onExpired, request);
    await manager.load();
    await expect(manager.authed('/v1/me')).rejects.toMatchObject({ code: 'session_expired' });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(store.value).toBeNull();
    expect(manager.signedIn).toBe(false);
  });

  it('keeps the session when offline', async () => {
    const onExpired = jest.fn();
    const request = jest.fn(async () => {
      throw new ApiError('network', null, null);
    });
    const store = memoryStore(pair(1));
    const manager = new SessionManager(store, onExpired, request);
    await manager.load();
    await expect(manager.authed('/v1/me')).rejects.toMatchObject({ code: 'network' });
    expect(onExpired).not.toHaveBeenCalled();
    expect(store.value).toEqual(pair(1));
  });

  it('sign-out forgets the session even when the server is unreachable', async () => {
    const store = memoryStore(pair(1));
    const manager = new SessionManager(store, jest.fn(), async () => {
      throw new ApiError('network', null, null);
    });
    await manager.load();
    await manager.signOut();
    expect(store.value).toBeNull();
    expect(manager.signedIn).toBe(false);
  });

  it('sign-out refreshes an expired access token so the server revoke happens, without the expired screen', async () => {
    const onExpired = jest.fn();
    const seen: string[] = [];
    const request = jest.fn(async (path: string, init: RequestInit) => {
      seen.push(`${path}:${init.token ?? '-'}`);
      if (path === '/v1/auth/refresh') return ok(pair(2));
      if (init.token === 'a1') throw new ApiError('token_expired', 401, null);
      return { status: 204, headers: new Headers(), body: null };
    });
    const manager = new SessionManager(memoryStore(pair(1)), onExpired, request);
    await manager.load();
    await manager.signOut();
    expect(seen).toEqual(['/v1/auth/logout:a1', '/v1/auth/refresh:-', '/v1/auth/logout:a2']);
    expect(onExpired).not.toHaveBeenCalled();
  });
});
