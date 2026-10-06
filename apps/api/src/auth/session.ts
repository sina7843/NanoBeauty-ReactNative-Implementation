import { createHash, randomBytes } from 'node:crypto';
import type { NextStep, Permission, TokenPair } from '@nano/contracts';
import type { Db, Queryable } from '../db';
import { HttpError } from '../errors';

export const LIMITS = {
  /** AUT-02 code lifetime. */
  codeTtlMs: 5 * 60_000,
  /** AUT-02 "Resend code in 0:30". */
  resendCooldownMs: 30_000,
  /** Codes per phone number per hour before a pause. */
  maxSendsPerHour: 5,
  /** Tries per code ("You have 2 tries left" after the first miss). */
  maxAttempts: 3,
  /** AUT-08 limited: "codes are paused for 10 minutes". */
  lockMs: 10 * 60_000,
  accessTtlMs: 15 * 60_000,
  /** AUT-08 expired: "signed out after 30 days". */
  customerSessionMs: 30 * 24 * 3600_000,
  /** Staff sessions time out sooner (phase-7 roles). ponytail: 12 h assumption until E3 sets the number. */
  staffSessionMs: 12 * 3600_000,
  /** A lost refresh response may be retried once within this window instead of revoking the session. */
  refreshGraceMs: 30_000,
} as const;

/** Server-stamped consent versions. ponytail: constants until STF-33 versioned policies exist (NANO-08). */
export const CONSENT_VERSIONS = {
  terms: 'terms-draft-2026-09',
  transactional: 'sms-v1',
  marketing: 'offers-v1',
} as const;

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const iso = (ms: number) => new Date(ms).toISOString();

export interface AuthContext {
  customerId: string;
  sessionId: string;
  sessionExpiresAt: string;
  roles: string[];
  permissions: Permission[];
}

export async function loadAccess(db: Queryable, customerId: string): Promise<{ roles: string[]; permissions: Permission[] }> {
  const rows = await db.query<{ role: string; permission: string | null }>(
    `SELECT sr.role, rp.permission
       FROM staff_roles sr LEFT JOIN role_permissions rp ON rp.role = sr.role
      WHERE sr.customer_id = $1`,
    [customerId],
  );
  const roles = [...new Set(rows.map((r) => r.role))].sort();
  const permissions = [...new Set(rows.flatMap((r) => (r.permission ? [r.permission as Permission] : [])))].sort();
  return { roles, permissions };
}

/** End of a session: staff (any role) never get more than the staff lifetime, even if granted mid-session. */
function sessionEnd(session: { created_at: Date; expires_at: Date }, isStaff: boolean): number {
  return isStaff
    ? Math.min(session.expires_at.getTime(), session.created_at.getTime() + LIMITS.staffSessionMs)
    : session.expires_at.getTime();
}

export async function issueSession(db: Db, customerId: string, now: number): Promise<TokenPair> {
  const { roles } = await loadAccess(db, customerId);
  const lifetime = roles.length ? LIMITS.staffSessionMs : LIMITS.customerSessionMs;
  const access = newToken();
  const refresh = newToken();
  const accessExpiresAt = iso(Math.min(now + LIMITS.accessTtlMs, now + lifetime));
  const sessionExpiresAt = iso(now + lifetime);
  await db.query(
    `INSERT INTO sessions (customer_id, access_hash, access_expires_at, refresh_hash, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [customerId, hashToken(access), accessExpiresAt, hashToken(refresh), iso(now), sessionExpiresAt],
  );
  return { accessToken: access, refreshToken: refresh, accessExpiresAt, sessionExpiresAt };
}

const sessionExpired = () => new HttpError(401, 'session_expired', 'Please sign in again.');

async function revokeSessionTx(db: Queryable, sessionId: string, reason: string, now: number) {
  await db.query('UPDATE sessions SET revoked_at = $2, revoked_reason = $3 WHERE id = $1 AND revoked_at IS NULL', [
    sessionId,
    iso(now),
    reason,
  ]);
}

export function revokeSession(db: Db, sessionId: string, reason: string, now: number) {
  return revokeSessionTx(db, sessionId, reason, now);
}

type SessionRow = { id: string; customer_id: string; refresh_hash: string; created_at: Date; expires_at: Date; revoked_at: Date | null };
const SESSION_COLUMNS = 'id, customer_id, refresh_hash, created_at, expires_at, revoked_at';

/**
 * Single-use refresh tokens (AUTH 05). A token that was already rotated out is a replay: the whole session is
 * revoked. One exception: the most recently rotated token may be presented again within `refreshGraceMs`, which
 * covers a refresh response lost to a timeout or app kill (the client never stored the new pair).
 * Everything runs in one transaction with the session row locked, so rotation and replay records can't diverge.
 */
export async function rotateSession(db: Db, refreshToken: string, now: number): Promise<TokenPair> {
  const presented = hashToken(refreshToken);
  const outcome = await db.transaction(async (tx) => {
    const [used] = await tx.query<{ session_id: string; used_at: Date; latest: Date }>(
      `SELECT u.session_id, u.used_at,
              (SELECT max(x.used_at) FROM used_refresh_tokens x WHERE x.session_id = u.session_id) AS latest
         FROM used_refresh_tokens u WHERE u.hash = $1`,
      [presented],
    );
    const graceRetry =
      !!used && used.used_at.getTime() === used.latest.getTime() && now - used.used_at.getTime() <= LIMITS.refreshGraceMs;
    if (used && !graceRetry) {
      await revokeSessionTx(tx, used.session_id, 'refresh_replay', now);
      return null;
    }
    const [session] = used
      ? await tx.query<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = $1 FOR UPDATE`, [used.session_id])
      : await tx.query<SessionRow>(`SELECT ${SESSION_COLUMNS} FROM sessions WHERE refresh_hash = $1 FOR UPDATE`, [presented]);
    if (!session || session.revoked_at) return null;
    const { roles } = await loadAccess(tx, session.customer_id);
    const end = sessionEnd(session, roles.length > 0);
    if (end <= now) return null;

    const access = newToken();
    const refresh = newToken();
    const accessExpiresAt = iso(Math.min(now + LIMITS.accessTtlMs, end));
    await tx.query(
      'UPDATE sessions SET access_hash = $2, access_expires_at = $3, refresh_hash = $4, last_refreshed_at = $5 WHERE id = $1',
      [session.id, hashToken(access), accessExpiresAt, hashToken(refresh), iso(now)],
    );
    // The replaced token is recorded in the same transaction, so a later replay is always detected.
    await tx.query('INSERT INTO used_refresh_tokens (hash, session_id, used_at) VALUES ($1, $2, $3) ON CONFLICT (hash) DO NOTHING', [
      session.refresh_hash,
      session.id,
      iso(now),
    ]);
    return { accessToken: access, refreshToken: refresh, accessExpiresAt, sessionExpiresAt: iso(end) };
  });
  if (!outcome) throw sessionExpired();
  return outcome;
}

/** Resolves a bearer access token. Expired access → `token_expired` (refresh); ended session → `session_expired`. */
export async function authenticate(db: Db, authorization: string | undefined, now: number): Promise<AuthContext> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'unauthorized', 'Sign in to continue.');
  const [session] = await db.query<{
    id: string;
    customer_id: string;
    access_expires_at: Date;
    created_at: Date;
    expires_at: Date;
    revoked_at: Date | null;
  }>('SELECT id, customer_id, access_expires_at, created_at, expires_at, revoked_at FROM sessions WHERE access_hash = $1', [
    hashToken(token),
  ]);
  if (!session) throw new HttpError(401, 'unauthorized', 'Sign in to continue.');
  const access = await loadAccess(db, session.customer_id);
  const end = sessionEnd(session, access.roles.length > 0);
  if (session.revoked_at || end <= now) throw sessionExpired();
  if (session.access_expires_at.getTime() <= now) throw new HttpError(401, 'token_expired', 'Access token expired.');
  return { customerId: session.customer_id, sessionId: session.id, sessionExpiresAt: iso(end), ...access };
}

/** AUT-03 → AUT-04 → AUT-05…07 → done. Matching is only asked once the old-app records are connected. */
export async function nextStep(db: Db, customerId: string, legacyConnected: boolean): Promise<NextStep> {
  const consents = await db.query<{ purpose: string; granted: boolean }>(
    `SELECT DISTINCT ON (purpose) purpose, granted FROM consents
      WHERE customer_id = $1 AND purpose IN ('terms', 'transactional') ORDER BY purpose, recorded_at DESC, id DESC`,
    [customerId],
  );
  const granted = (p: string) => consents.some((c) => c.purpose === p && c.granted);
  if (!granted('terms') || !granted('transactional')) return 'consents';
  const [customer] = await db.query<{ first_name: string | null; match_checked_at: Date | null }>(
    'SELECT first_name, match_checked_at FROM customers WHERE id = $1',
    [customerId],
  );
  if (!customer?.first_name) return 'profile';
  if (legacyConnected && !customer.match_checked_at) return 'match';
  return 'done';
}
