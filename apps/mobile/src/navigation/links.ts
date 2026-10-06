import type { BookingMode } from '@nano/contracts';
import { isReachable } from './routes';

/** Web links the app answers for (text and email links, WEB-01 gift links). Domain to confirm (spec 3 "[short link]"). */
export const LINK_HOSTS = ['app.nanobeautystar.com'];
const SCHEME = /^nanobeauty(?:-dev|-staging)?:\/\/\/?/i;
const OLD_LINK = '/home?notice=oldlink';

/** Any supported link form → an in-app path (with query), or null when it isn't ours. */
export function toAppPath(input: string): string | null {
  const raw = input.trim();
  let path: string;
  if (raw.startsWith('/') && !raw.startsWith('//')) path = raw;
  else if (SCHEME.test(raw)) path = `/${raw.replace(SCHEME, '')}`;
  else {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' || !LINK_HOSTS.includes(url.hostname)) return null;
    path = `${url.pathname}${url.search}`;
  }
  // WEB-01: a gift link opens the in-app claim with the code (WAL-11 when the app is installed).
  const gift = /^\/gift\/([A-Za-z0-9-]{6,40})\/?$/.exec(path.split('?')[0]!);
  if (gift) return `/wallet/claim?code=${encodeURIComponent(gift[1]!)}`;
  return path;
}

/**
 * Safe destination for a notification tap, an offer CTA or an incoming link (LEG 07): only routes the app has, only
 * in the booking mode that applies (D33). Anything else lands on Home with "Link not found", never a dead end.
 */
export function resolveLink(input: string | null | undefined, bookingMode: BookingMode | undefined): string {
  if (!input) return OLD_LINK;
  const path = toAppPath(input);
  if (!path) return OLD_LINK;
  const pathname = path.split('?')[0]!.replace(/\/$/, '') || '/';
  return isReachable(pathname, bookingMode) ? path : OLD_LINK;
}
