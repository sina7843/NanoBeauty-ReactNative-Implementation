import type { BookingMode } from '@nano/contracts';
import table from './routes.json';

// `routes.json` is a verbatim snapshot of the handover export (a test fails if it drifts).
export interface RouteMeta {
  route: string;
  screens: string;
  signIn: boolean;
  staffRole: boolean;
  bookingMode: 'both' | BookingMode;
}

export const ROUTES = table as RouteMeta[];

/** `/(tabs)/home` → `/home`; groups don't appear in URLs. */
const toPath = (route: string) => route.replace(/\/\([^)]+\)/g, '') || '/';

const MATCHERS = ROUTES.map((meta) => ({
  meta,
  pattern: new RegExp(`^${toPath(meta.route).replace(/\[[^\]]+\]/g, '[^/]+')}/?$`),
}));

export function routeMeta(pathname: string): RouteMeta | undefined {
  return MATCHERS.find(({ pattern }) => pattern.test(pathname))?.meta;
}

/**
 * D33: routes marked `inapp` are unreachable in hand-off mode (and vice versa). With no settings yet the
 * documented default `handoff` applies, so in-app booking is never reachable on a guess.
 */
export function isReachable(pathname: string, bookingMode: BookingMode | undefined): boolean {
  const meta = routeMeta(pathname);
  if (!meta) return false;
  return meta.bookingMode === 'both' || meta.bookingMode === (bookingMode ?? 'handoff');
}

/** Where unknown, old or mode-blocked links land: Home with the "Link not found" note (HOM-01 oldlink). */
export const OLD_LINK_HREF = { pathname: '/home', params: { notice: 'oldlink' } } as const;
