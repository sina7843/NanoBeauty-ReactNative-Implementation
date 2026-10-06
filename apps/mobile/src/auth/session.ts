import { tokenPairSchema, type TokenPair } from '@nano/contracts';
import { ApiError, apiRequest, type ApiResponse, type RequestInit } from '../api/client';
import type { SessionStore } from '../lib/session-storage';

type Request = (path: string, init: RequestInit) => Promise<ApiResponse>;

/**
 * Owns the signed-in session (AUTH 05): persists tokens only in secure storage, attaches the access token,
 * refreshes once on `token_expired` (single-flight, so parallel calls never replay a refresh token) and
 * ends the session when the server says it's over. Offline keeps the session; it doesn't sign people out.
 */
export class SessionManager {
  private session: TokenPair | null = null;
  private refreshing: Promise<TokenPair | null> | null = null;
  private signingOut = false;

  constructor(
    private readonly store: SessionStore,
    private readonly onExpired: () => void,
    private readonly request: Request = apiRequest,
  ) {}

  get signedIn() {
    return this.session !== null;
  }

  async load(): Promise<boolean> {
    this.session = await this.store.read();
    return this.session !== null;
  }

  async start(tokens: TokenPair) {
    this.session = tokens;
    await this.store.write(tokens);
  }

  /** A request on behalf of the signed-in person. */
  async authed(path: string, init: RequestInit = {}): Promise<ApiResponse> {
    const current = this.session;
    if (!current) throw new ApiError('unauthorized', 401, null);
    try {
      return await this.request(path, { ...init, token: current.accessToken });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === 'token_expired') {
        const renewed = await this.refresh();
        if (!renewed) throw new ApiError('session_expired', 401, error.requestId);
        return this.request(path, { ...init, token: renewed.accessToken });
      }
      if (error.code === 'session_expired' || error.code === 'unauthorized') await this.expire();
      throw error;
    }
  }

  /** Single-flight: concurrent callers share one refresh, so a refresh token is presented exactly once. */
  refresh(): Promise<TokenPair | null> {
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<TokenPair | null> {
    const current = this.session;
    if (!current) return null;
    try {
      const res = await this.request('/v1/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } });
      const next = tokenPairSchema.parse(res.body);
      await this.start(next);
      return next;
    } catch (error) {
      // Network trouble keeps the session (NFR 09); only an authoritative "no" ends it.
      if (error instanceof ApiError && (error.code === 'session_expired' || error.code === 'unauthorized')) {
        await this.expire();
        return null;
      }
      throw error;
    }
  }

  private async expire() {
    if (!this.session) return;
    this.session = null;
    await this.store.clear();
    if (!this.signingOut) this.onExpired();
  }

  /** Revokes the session on the server when reachable; always forgets it locally. */
  async signOut() {
    this.signingOut = true;
    try {
      // Goes through authed() so an expired access token is refreshed first and the server revoke happens.
      if (this.session) await this.authed('/v1/auth/logout', { method: 'POST', body: {} });
    } catch {
      // Offline or already expired: the local copy is still removed below.
    } finally {
      this.signingOut = false;
      this.session = null;
      await this.store.clear();
    }
  }
}
