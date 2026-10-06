import { meSchema, type Me, type Permission, type TokenPair } from '@nano/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { secureSessionStore } from '../lib/session-storage';
import { SessionManager } from './session';

type Status = 'loading' | 'guest' | 'signedIn';

interface AuthValue {
  status: Status;
  /** `null` while signed in but not yet loaded (or offline). */
  me: Me | null;
  session: SessionManager;
  /** After a successful code check (AUT-02). */
  completeSignIn(tokens: TokenPair): Promise<Me | null>;
  /** Re-reads /v1/me (after consents, profile, match). */
  refreshMe(): Promise<Me | null>;
  signOut(): Promise<void>;
  /** Server-granted capability check (D34). Never compare role names. */
  can(permission: Permission): boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Guests browse freely (AUTH 01); sign-in is asked for only when something personal is needed. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [session] = useState(
    () =>
      new SessionManager(secureSessionStore, () => {
        // Server ended the session (30 days, sign-out elsewhere, replay): AUT-08 "Please sign in again".
        setMe(null);
        setStatus('guest');
        queryClient.removeQueries({ queryKey: ['me'] });
        router.push({ pathname: '/auth/code', params: { reason: 'expired' } });
      }),
  );

  const refreshMe = useCallback(async () => {
    try {
      const res = await session.authed('/v1/me');
      const next = meSchema.parse(res.body);
      setMe(next);
      return next;
    } catch {
      return null; // offline: keep the session, show what we have
    }
  }, [session]);

  useEffect(() => {
    session.load().then((signedIn) => {
      setStatus(signedIn ? 'signedIn' : 'guest');
      if (signedIn) refreshMe();
    });
  }, [session, refreshMe]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      me,
      session,
      async completeSignIn(tokens) {
        await session.start(tokens);
        setStatus('signedIn');
        return refreshMe();
      },
      refreshMe,
      async signOut() {
        await session.signOut();
        setMe(null);
        setStatus('guest');
        queryClient.clear();
      },
      can: (permission) => me?.permissions.includes(permission) ?? false,
    }),
    [status, me, session, refreshMe, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
