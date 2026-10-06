import { visitsResponseSchema, type LateOutcome, type Settings, type Visit } from '@nano/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { loadCached, type Cached } from '../content/cache';
import { t } from '../i18n';
import { money } from '../i18n/format';
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
