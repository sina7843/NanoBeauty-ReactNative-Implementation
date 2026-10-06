import { PERMISSIONS, type Permission } from '@nano/contracts';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import type { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

/** Staff permissions that open the workspace (D34). Customers have none, so the workspace never appears for them. */
export const STAFF_PERMISSIONS: Permission[] = PERMISSIONS.filter((p) => p !== 'value.adjust' && p !== 'payments.refund');
export const isStaff = (permissions: readonly string[] | undefined) => !!permissions?.some((p) => STAFF_PERMISSIONS.includes(p as Permission));

/** A 403 from the server opens STF-14 with the missing permission; the app never assumes access. */
export function goDenied(error: unknown) {
  if (error instanceof ApiError && error.code === 'forbidden') {
    router.replace({ pathname: '/staff/denied', params: { permission: error.info.missingPermission ?? '' } });
    return true;
  }
  return false;
}

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

export type SaveProblem = 'conflict' | 'offline' | 'failed' | 'invalid';
/** STF-03 shared states: conflict (someone else edited), offline (read only), savefailed (edits kept, nothing published). */
export function problemOf(error: unknown): { kind: SaveProblem; message: string | null } {
  if (goDenied(error)) return { kind: 'failed', message: null };
  if (error instanceof ApiError) {
    if (error.code === 'conflict') return { kind: 'conflict', message: null };
    if (error.code === 'network') return { kind: 'offline', message: null };
    if (error.code === 'validation_failed') return { kind: 'invalid', message: null };
  }
  return { kind: 'failed', message: null };
}
