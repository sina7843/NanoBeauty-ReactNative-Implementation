import { toAppPath } from '../navigation/links';

/**
 * Incoming links (scheme, text/email web links, WEB-01 gift links) become in-app paths before routing. Unknown paths
 * fall through to +not-found (Home with "Link not found"); booking-mode gating stays in the route layouts (D33).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return toAppPath(path) ?? '/home?notice=oldlink';
  } catch {
    return '/home?notice=oldlink';
  }
}
