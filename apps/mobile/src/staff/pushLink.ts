import type { BookingMode } from '@nano/contracts';
import { isReachable, routeMeta } from '../navigation/routes';

/** Where a tapped push opens when staff don't choose: a real customer route (FE-8). */
export const DEFAULT_PUSH_OPENS = '/home';

/** The "Opens" path must be a customer route in the route table that is reachable in the current booking mode (FE-8). */
export function validPushOpens(value: string, bookingMode: BookingMode | undefined): boolean {
  const path = value.trim().split(/[?#]/)[0] ?? '';
  if (!path.startsWith('/')) return false;
  const meta = routeMeta(path);
  return !!meta && !meta.staffRole && isReachable(path, bookingMode);
}
