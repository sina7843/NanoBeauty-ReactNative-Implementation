import { visitsResponseSchema, type LateOutcome, type Settings, type Visit, type VisitStatus, type VisitsResponse } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { loadCached, type Cached } from '../content/cache';
import { t } from '../i18n';
import { clinicDay, clinicTime, money } from '../i18n/format';
import { PRIVATE_PREFIX } from '../lib/private-cache';
import { addToCalendar, type CalendarResult } from '../platform/calendar';

const MAX_OFFLINE_AGE = 7 * 24 * 3600_000;

export function useVisits() {
  const { status, session } = useAuth();
  return useQuery({
    queryKey: ['visits'],
    // One key, not per customer: `/v1/me` may be unreachable offline, and sign-out wipes every private key.
    queryFn: () =>
      loadCached(`${PRIVATE_PREFIX}visits`, '/v1/visits', visitsResponseSchema, AsyncStorage, (path, init) => session.authed(path, init), undefined, MAX_OFFLINE_AGE),
    enabled: status === 'signedIn',
    staleTime: (q) => ((q.state.data as Cached<unknown> | undefined)?.source === 'cache' ? 0 : 60_000),
    retry: (count, error) => !(error instanceof ApiError && (error.code === 'not_found' || error.code === 'unauthorized')) && count < 2,
  });
}

export const findVisit = (data: { upcoming: Visit[]; past: Visit[] } | undefined, id: string | undefined) =>
  data ? [...data.upcoming, ...data.past].find((v) => v.id === id) : undefined;

/** A2: inside the free-change window, changes go to the clinic (VIS-02 late, VIS-06). */
export function isLate(visit: Pick<Visit, 'startsAt'>, freeChangeHours: number, now: number): boolean {
  const start = Date.parse(visit.startsAt);
  return start > now && start - now < freeChangeHours * 3600_000;
}

/** What happens to the deposit, from settings and the visit's own deposit, never a hard-coded rule. */
export function outcomeText(outcome: LateOutcome, deposit: number | null): string {
  if (outcome === 'none' || deposit === 0) return t('late.outcome.none');
  if (outcome === 'keepDeposit') return t('late.outcome.keep');
  return deposit ? t('late.outcome.credit', { deposit: money(deposit) }) : t('late.outcome.creditNoAmount');
}

export function lateBannerText(settings: Pick<Settings, 'lateCancelOutcome'>, deposit: number | null): string {
  const o = settings.lateCancelOutcome;
  if (o === 'none' || deposit === 0) return t('visit.late.none');
  if (o === 'keepDeposit') return t('visit.late.keep');
  return deposit ? t('visit.late.credit', { deposit: money(deposit) }) : t('visit.late.creditNoAmount');
}

/** One key per user intent: a retry after a lost response gets the same server record, never a duplicate. */
export const newIdempotencyKey = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);

/** Hands the visit to the OS calendar sheet; the person saves or cancels there (no broad calendar permission). */
export function addVisitToCalendar(visit: Visit, address: string): Promise<CalendarResult> {
  const start = new Date(visit.startsAt);
  return addToCalendar({
    title: t('visit.calendarTitle', { service: visit.serviceName }),
    start,
    end: new Date(start.getTime() + (visit.durationMin ?? 60) * 60_000),
    location: address,
    notes: `${visit.detail ?? ''}${visit.detail ? ' · ' : ''}${visit.ref}`,
  });
}

/** BV-2: an open request to the clinic shows as "Change requested" until the clinic acts; ended visits keep their status. */
export function passStatus(visit: Pick<Visit, 'status' | 'openRequest'>): VisitStatus {
  return visit.openRequest && (visit.status === 'confirmed' || visit.status === 'pending') ? 'changed' : visit.status;
}

/**
 * BV-7: the "Synced from Fresha" note, from the server's own `syncedAt`. Nothing when the list is a saved copy
 * (offline) or Fresha was never read; a sync older than 10 minutes names its time instead of "a few minutes ago".
 */
export function syncNote(data: Pick<VisitsResponse, 'syncedAt' | 'serverTime'>, fromCache: boolean, zone: string): string | null {
  if (fromCache || !data.syncedAt) return null;
  const age = Date.parse(data.serverTime) - Date.parse(data.syncedAt);
  if (age < 10 * 60_000) return t('vis.syncNote');
  const day = clinicDay(data.syncedAt, zone, Date.parse(data.serverTime));
  const time = day === clinicDay(data.serverTime, zone, Date.parse(data.serverTime)) ? clinicTime(data.syncedAt, zone) : `${day}, ${clinicTime(data.syncedAt, zone)}`;
  return t('vis.syncNoteAt', { time });
}

type CarePhase = 'before' | 'day' | 'after';
// ponytail: phase read from the clinic's "when" wording ("2 days before", "Day of visit", anything else = after);
// add a structured offset to careStepSchema if the clinic writes steps that don't follow that wording.
const carePhase = (when: string): CarePhase => (/before/i.test(when) ? 'before' : /day of/i.test(when) ? 'day' : 'after');
const ORDER: CarePhase[] = ['before', 'day', 'after'];

/** BV-6: care steps that happen before or on the day of the visit ("2 steps before your visit"). */
export const careBeforeCount = (steps: { when: string }[]) => steps.filter((s) => carePhase(s.when) !== 'after').length;

const ymd = (ms: number, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));

/**
 * BV-17: done / now progress for CAR-01. Steps from earlier phases (before → day of visit → after, by clinic-zone
 * calendar day) are done; the first step of the current phase is "now".
 */
export function careProgress<S extends { when: string }>(steps: S[], startsAt: string, timeZone: string, now: number): (S & { state?: 'done' | 'now' })[] {
  const today = ymd(now, timeZone);
  const visitDay = ymd(Date.parse(startsAt), timeZone);
  const current = ORDER.indexOf(today < visitDay ? 'before' : today === visitDay ? 'day' : 'after');
  let nowGiven = false;
  return steps.map((s) => {
    const phase = ORDER.indexOf(carePhase(s.when));
    if (phase < current) return { ...s, state: 'done' as const };
    if (phase === current && !nowGiven) {
      nowGiven = true;
      return { ...s, state: 'now' as const };
    }
    return s;
  });
}
