import type { Channel, Settings } from '@nano/contracts';
import type { Db, Queryable } from '../db';
import type { Integrations } from '../integrations';
import { APP_LINK_BASE, DELIVERY, formatWhen, render, type DeliverySpec } from './templates';

const iso = (ms: number) => new Date(ms).toISOString();
const HOUR = 3600_000;
const BATCH = 100;
const STALE_PUSH_MS = 12 * HOUR;

type Note = { id: string; audience: 'customer' | 'staff'; customer_id: string | null; permission: string | null; template: string; data: Record<string, unknown> };
type Recipient = { id: string; phone: string | null; email: string | null; deleted: boolean };
type Ctx = { settings: Settings; tz: string };

async function context(db: Queryable): Promise<Ctx> {
  const [s] = await db.query<{ settings: Settings; clinic: { timezone?: string } }>('SELECT settings, clinic FROM app_settings WHERE id = 1');
  return { settings: s!.settings, tz: s!.clinic.timezone ?? 'America/Vancouver' };
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
function localMinutes(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  return Number(parts.find((p) => p.type === 'hour')!.value) * 60 + Number(parts.find((p) => p.type === 'minute')!.value);
}

/** Quiet hours in clinic time (spec 3: 9 pm–8 am). Returns when they end, or null when it isn't quiet now. */
export function quietUntil(now: number, { settings, tz }: Ctx): number | null {
  const { start, end } = settings.quietHours;
  const m = localMinutes(now, tz);
  const s = minutesOf(start);
  const e = minutesOf(end);
  const quiet = s <= e ? m >= s && m < e : m >= s || m < e;
  if (!quiet) return null;
  // From the start of the current minute, so a run at 07:59:30 doesn't land just before the end.
  return now - (now % 60_000) + (((e - m + 1440) % 1440) || 1440) * 60_000;
}

const str = (d: Record<string, unknown>) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]));

async function recipients(db: Queryable, n: Note): Promise<Recipient[]> {
  if (n.audience === 'customer') {
    const rows = await db.query<{ id: string; phone_e164: string; email: string | null; deleted_at: Date | null }>('SELECT id, phone_e164, email, deleted_at FROM customers WHERE id = $1', [n.customer_id]);
    return rows.map((c) => ({ id: c.id, phone: c.phone_e164, email: c.email, deleted: !!c.deleted_at }));
  }
  // Approval outcomes go to the person who submitted; other staff notices to everyone holding the permission (D34).
  const submitter = typeof n.data.submitter === 'string' ? n.data.submitter : null;
  const rows = submitter
    ? await db.query<{ id: string }>('SELECT DISTINCT customer_id AS id FROM staff_roles WHERE customer_id = $1', [submitter])
    : await db.query<{ id: string }>(
        'SELECT DISTINCT sr.customer_id AS id FROM staff_roles sr JOIN role_permissions rp ON rp.role = sr.role WHERE rp.permission = $1',
        [n.permission],
      );
  return rows.map((r) => ({ id: r.id, phone: null, email: null, deleted: false }));
}

/** Why a channel isn't used for this person, or null when it should go. */
async function skipReason(db: Queryable, spec: DeliverySpec, r: Recipient, ctx: Ctx): Promise<string | null> {
  if (r.deleted) return 'account_deleted';
  if (spec.kind === 'reminder') {
    // NOTIF 07: one sender. If Fresha sends reminders the app never does, even for rows queued before the switch.
    if (ctx.settings.reminderSender !== 'app') return 'fresha_sends_reminders';
    const [p] = await db.query<{ reminders: boolean }>('SELECT reminders FROM customer_preferences WHERE customer_id = $1', [r.id]);
    if (p && !p.reminders) return 'reminders_off';
  }
  return null;
}

async function send(integrations: Integrations, db: Queryable, channel: Channel, r: Recipient, template: string, msg: { title: string; body: string; href: string | null }) {
  const data = { title: msg.title, body: msg.body, href: msg.href ?? '', link: msg.href ? `${APP_LINK_BASE}${msg.href}` : '', recipient: r.id };
  if (channel === 'push') {
    const devices = await db.query<{ token: string }>('SELECT token FROM push_devices WHERE customer_id = $1', [r.id]);
    if (!devices.length) return { status: 'skipped' as const, reason: 'no_device' };
    let sent = 0;
    for (const d of devices) {
      await integrations.messages.send({ channel: 'push', to: d.token, template, data }).then(
        () => sent++,
        () => undefined,
      );
    }
    return sent ? { status: 'sent' as const, reason: null } : { status: 'failed' as const, reason: 'provider_error' };
  }
  const to = channel === 'sms' ? r.phone : r.email;
  if (!to) return { status: 'skipped' as const, reason: channel === 'sms' ? 'no_phone' : 'no_email' };
  return integrations.messages.send({ channel, to, template, data }).then(
    () => ({ status: 'sent' as const, reason: null }),
    () => ({ status: 'failed' as const, reason: 'provider_error' }),
  );
}

/**
 * Delivers one outbox row to every recipient and channel, once each (unique delivery rows make a retry safe).
 * Texts and non-urgent pushes wait for quiet hours to end; email doesn't. Failed sends are recorded, never retried
 * as "sent" — the inbox copy is always there (NOTIF 05).
 */
async function deliverOne(db: Db, integrations: Integrations, n: Note, ctx: Ctx, now: number) {
  const spec = DELIVERY[n.template];
  const msg = render(n.template, str(n.data));
  if (!spec || !msg) {
    await db.query('UPDATE notifications SET delivered_at = $2 WHERE id = $1', [n.id, iso(now)]);
    return;
  }
  const quiet = spec.urgent ? null : quietUntil(now, ctx);
  let waitUntil: number | null = null;
  for (const r of await recipients(db, n)) {
    const done = new Set((await db.query<{ channel: string }>('SELECT channel FROM notification_deliveries WHERE notification_id = $1 AND recipient_id = $2', [n.id, r.id])).map((x) => x.channel));
    const skip = await skipReason(db, spec, r, ctx);
    for (const channel of spec.channels) {
      if (done.has(channel)) continue;
      if (!skip && quiet && channel !== 'email') {
        waitUntil = quiet;
        continue;
      }
      // Claim first: whoever inserts the row sends; a parallel run (or a second instance) finds it and moves on.
      const [claim] = await db.query<{ id: string }>(
        `INSERT INTO notification_deliveries (notification_id, recipient_id, channel, status, reason, created_at) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (notification_id, recipient_id, channel) DO NOTHING RETURNING id`,
        [n.id, r.id, channel, skip ? 'skipped' : 'pending', skip, iso(now)],
      );
      if (!claim || skip) continue;
      const result = await send(integrations, db, channel, r, n.template, msg);
      await db.query('UPDATE notification_deliveries SET status = $2, reason = $3 WHERE id = $1', [claim.id, result.status, result.reason]);
    }
  }
  if (waitUntil) await db.query('UPDATE notifications SET next_attempt_at = $2 WHERE id = $1', [n.id, iso(waitUntil)]);
  else await db.query('UPDATE notifications SET delivered_at = $2, next_attempt_at = NULL WHERE id = $1', [n.id, iso(now)]);
}

/** Outbox rows that are due. One failing row is reported and the rest still go. */
export async function dispatchDue(db: Db, integrations: Integrations, now: number, onError?: (id: string, err: unknown) => void): Promise<number> {
  const ctx = await context(db);
  const due = await db.query<Note>(
    `SELECT id::text AS id, audience, customer_id, permission, template, data FROM notifications
      WHERE delivered_at IS NULL AND (next_attempt_at IS NULL OR next_attempt_at <= $1) ORDER BY id LIMIT ${BATCH}`,
    [iso(now)],
  );
  for (const n of due) {
    try {
      await deliverOne(db, integrations, n, ctx, now);
    } catch (err) {
      onError?.(n.id, err);
    }
  }
  return due.length;
}

/**
 * NTF-02 (NOTIF 02, 07). Only when the app is the reminder sender. Each visit gets the reminder for the nearest
 * configured timing it has reached; the dedupe key makes a repeated run (or two servers) queue it once.
 */
export async function queueReminders(db: Db, now: number): Promise<number> {
  const ctx = await context(db);
  if (ctx.settings.reminderSender !== 'app') return 0;
  const hours = [...ctx.settings.reminderHours].sort((a, b) => a - b);
  const visits = await db.query<{ id: string; customer_id: string; starts_at: Date; service_name: string }>(
    `SELECT v.id, v.customer_id, v.starts_at, v.service_name FROM visits v JOIN customers c ON c.id = v.customer_id
       LEFT JOIN customer_preferences p ON p.customer_id = v.customer_id
      WHERE v.status IN ('confirmed', 'pending', 'changed') AND v.starts_at > $1 AND v.starts_at <= $2 AND c.deleted_at IS NULL AND COALESCE(p.reminders, true)`,
    [iso(now), iso(now + hours[hours.length - 1]! * HOUR)],
  );
  let queued = 0;
  for (const v of visits) {
    const h = hours.find((x) => v.starts_at.getTime() - now <= x * HOUR)!;
    const when = formatWhen(v.starts_at, ctx.tz);
    const rows = await db.query(
      `INSERT INTO notifications (audience, customer_id, template, data, created_at, dedupe_key) VALUES ('customer', $1, 'NTF-02.reminder', $2, $3, $4)
       ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
      [v.customer_id, JSON.stringify({ visitId: v.id, service: v.service_name, when }), iso(now), `reminder:${v.id}:${h}:${v.starts_at.toISOString()}`],
    );
    queued += rows.length;
  }
  return queued;
}

/**
 * STF-35 marketing pushes at their time. The audience is re-checked now (latest marketing consent, not deleted);
 * quiet hours hold them back. Claimed before sending, so a message goes out at most once.
 */
export async function deliverPushMessages(db: Db, integrations: Integrations, now: number): Promise<number> {
  const ctx = await context(db);
  if (quietUntil(now, ctx)) return 0;
  // An offer push that couldn't go out within 12 hours of its time (outage, quiet hours) is dropped, not sent late.
  await db.query(`UPDATE push_messages SET status = 'cancelled', sent_count = 0, version = version + 1 WHERE status = 'scheduled' AND send_at <= $1`, [iso(now - STALE_PUSH_MS)]);
  const due = await db.query<{ id: string; text: string; opens: string }>(`SELECT id, text, opens FROM push_messages WHERE status = 'scheduled' AND send_at <= $1`, [iso(now)]);
  for (const m of due) {
    const [claimed] = await db.query(`UPDATE push_messages SET status = 'sent', sent_at = $2, version = version + 1 WHERE id = $1 AND status = 'scheduled' RETURNING id`, [m.id, iso(now)]);
    if (!claimed) continue;
    const devices = await db.query<{ token: string }>(
      `SELECT d.token FROM push_devices d JOIN customers c ON c.id = d.customer_id
        WHERE c.deleted_at IS NULL AND (SELECT granted FROM consents k WHERE k.customer_id = d.customer_id AND k.purpose = 'marketing' ORDER BY recorded_at DESC, id DESC LIMIT 1)`,
    );
    let sent = 0;
    for (const d of devices) {
      await integrations.messages.send({ channel: 'push', to: d.token, template: 'STF-35.offer', data: { title: 'Nano Beauty', body: m.text, href: m.opens, link: `${APP_LINK_BASE}${m.opens}` } }).then(
        () => sent++,
        () => undefined,
      );
    }
    await db.query('UPDATE push_messages SET sent_count = $2 WHERE id = $1', [m.id, sent]);
  }
  return due.length;
}
