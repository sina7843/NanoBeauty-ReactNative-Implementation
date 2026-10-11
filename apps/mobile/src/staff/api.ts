import { PERMISSIONS, type Permission } from '@nano/contracts';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import type { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { t, type StringKey } from '../i18n';
import { en } from '../i18n/en';

/** Staff permissions that open the workspace (D34). Customers have none, so the workspace never appears for them. */
export const STAFF_PERMISSIONS: Permission[] = PERMISSIONS.filter((p) => p !== 'value.adjust' && p !== 'payments.refund');
export const isStaff = (permissions: readonly string[] | undefined) => !!permissions?.some((p) => STAFF_PERMISSIONS.includes(p as Permission));

/**
 * Only a real missing permission (`missingPermission` on the 403) opens STF-14. Other 403s (for example "another staff
 * member must do this") are self-action refusals: callers show the server message inline (ST-7).
 */
export function goDenied(error: unknown) {
  if (error instanceof ApiError && error.code === 'forbidden' && error.info.missingPermission) {
    router.replace({ pathname: '/staff/denied', params: { permission: error.info.missingPermission } });
    return true;
  }
  return false;
}

/** The sentence the server uses for a stale version (409). Every other 409 is a business refusal with its own message. */
const VERSION_CONFLICT = /^Someone else changed this/;

/** Readable phrase for "Your role (X) can't …" (STF-14, ST-7). Falls back to a generic phrase, never the raw key. */
export const permissionPhrase = (key: string | undefined) => {
  const k = `perm.${key}`;
  return key && k in en ? t(k as StringKey) : t('perm.default');
};

/** Staff reads: always from the server (no offline copy of admin data); 403 → STF-14. */
export function useStaffQuery<T>(key: readonly unknown[], path: string, schema: z.ZodType<T>, enabled = true) {
  const { status, session } = useAuth();
  const q = useQuery({
    queryKey: ['staff', ...key],
    queryFn: async () => schema.parse((await session.authed(path)).body),
    enabled: enabled && status === 'signedIn',
    retry: (count, error) => !(error instanceof ApiError && ['forbidden', 'not_found', 'unauthorized', 'conflict'].includes(error.code)) && count < 2,
  });
  useEffect(() => {
    if (q.error) goDenied(q.error);
  }, [q.error]);
  return q;
}

/** `refused`: the server said no with its own sentence (completeness, self-action, business rule): show it in a Banner. */
export type SaveProblem = 'conflict' | 'offline' | 'failed' | 'invalid' | 'refused';
/** STF-03 shared states: conflict (someone else edited), offline (read only), savefailed (edits kept, nothing published). */
export function problemOf(error: unknown): { kind: SaveProblem; message: string | null } {
  if (goDenied(error)) return { kind: 'failed', message: null };
  if (error instanceof ApiError) {
    const message = error.info.serverMessage ?? null;
    if (error.code === 'conflict') return message && !VERSION_CONFLICT.test(message) ? { kind: 'refused', message } : { kind: 'conflict', message: null };
    if (error.code === 'forbidden') return { kind: 'refused', message };
    if (error.code === 'network') return { kind: 'offline', message: null };
    if (error.code === 'validation_failed') return { kind: 'invalid', message };
  }
  return { kind: 'failed', message: null };
}

/** One line for a toast or inline Banner: the stale-version sentence, else the server's own message (409/403/400), else the generic error. */
export function problemText(error: unknown): string {
  const p = problemOf(error);
  return p.kind === 'conflict' ? t('stf.conflict') : (p.message ?? t('error.body'));
}
