import type { Permission } from '@nano/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate, type AuthContext } from '../auth/session';
import type { Queryable } from '../db';
import { HttpError } from '../errors';

export const iso = (ms: number) => new Date(ms).toISOString();

/** Shared staff plumbing: permission gate (before the body is read), audit writer and the 409 used everywhere. */
export function staffKit(app: FastifyInstance, now: () => number) {
  const { db } = app;
  const auth = (request: FastifyRequest) => request.auth as AuthContext;
  const can =
    (...permissions: Permission[]) =>
    async (request: FastifyRequest) => {
      request.auth = await authenticate(db, request.headers.authorization, now());
      const missing = permissions.find((p) => !request.auth!.permissions.includes(p));
      if (missing) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: missing });
    };
  const pre = (...permissions: Permission[]) => ({ onRequest: can(...permissions) });
  const audit = (tx: Queryable, request: FastifyRequest, item: string, field: string | null, oldValue: string | null, newValue: string | null, reason: string | null) => {
    const ctx = auth(request);
    return tx.query(
      `INSERT INTO audit_entries (actor_id, actor_roles, item, field, old_value, new_value, reason, device, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ctx.customerId, ctx.roles.join(','), item, field, oldValue?.slice(0, 4000) ?? null, newValue?.slice(0, 4000) ?? null, reason, String(request.headers['user-agent'] ?? '').slice(0, 200), iso(now())],
    );
  };
  const conflict = () => new HttpError(409, 'conflict', 'Someone else changed this. Load the latest version to continue.');
  const requirePermission = (request: FastifyRequest, p: Permission) => {
    if (!auth(request).permissions.includes(p)) throw new HttpError(403, 'forbidden', 'Your role can’t do this.', { missingPermission: p });
  };
  return { auth, can, pre, audit, conflict, requirePermission };
}

/** Field-level differences for the audit trail (before → after). */
export function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const text = (v: unknown) => (v === null || v === undefined ? null : typeof v === 'string' ? v : JSON.stringify(v));
  return Object.keys(after)
    .filter((k) => !before || JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: k, old: before ? text(before[k]) : null, new: text(after[k]) }));
}
