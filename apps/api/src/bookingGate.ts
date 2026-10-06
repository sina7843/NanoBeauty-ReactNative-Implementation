import type { BookingMode } from '@nano/contracts';
import type { Integrations } from './integrations';

/**
 * D33: the booking mode that actually applies. `inapp` needs a formally selected booking provider; without one the
 * stored value (e.g. a hand edit of the settings row) falls back to the Fresha hand-off, so in-app booking can't
 * switch on by accident.
 */
export function effectiveBookingMode(stored: BookingMode, integrations: Pick<Integrations, 'booking'>): BookingMode {
  return stored === 'inapp' && !integrations.booking.selected() ? 'handoff' : stored;
}
