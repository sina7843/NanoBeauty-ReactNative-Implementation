import type { Offer } from '@nano/contracts';
import { useEffect, useState } from 'react';

/**
 * PROMO 09: offer state is the server's, captured with its clock. Between fetches the app only moves an offer
 * toward "expired" (using the server-time offset); anything that would open it (upcoming → live) waits for the
 * server, so a purchase can never start on the device's say-so.
 */
export function effectiveState(offer: Offer, serverNow: number): Offer['state'] {
  if (serverNow >= Date.parse(offer.endsAt)) return 'expired';
  return offer.state;
}

/** Server "now" from a payload's serverTime and when it was fetched, ticking every 30 s. */
export function useServerNow(serverTime: string | undefined, fetchedAt: string | undefined): number {
  const offset = serverTime && fetchedAt ? Date.parse(serverTime) - Date.parse(fetchedAt) : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now + offset;
}
