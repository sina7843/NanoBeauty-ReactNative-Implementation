import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { analytics } from '../lib/analytics';
import { resolveLink } from '../navigation/links';
import { useSettings } from '../settings/useSettings';
import { registerPushDevice } from './push';

// Foreground pushes still show a banner; the inbox keeps the copy either way (NOTIF 05).
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
} catch {
  // unavailable (tests, web)
}

/**
 * App-wide notification and analytics wiring (NANO-09): registers this phone for pushes once signed in, applies the
 * analytics consent from the server, and opens a tapped notification at a safe destination (unknown or mode-blocked
 * links land on Home with "Link not found").
 */
export function NotificationBridge() {
  const router = useRouter();
  const { status, me, ready, session } = useAuth();
  const mode = useSettings().data?.data.settings.bookingMode;
  const handled = useRef(new Set<string>());
  // Taps wait here until auth is ready, so a cold-start tap isn't checked against a `me` that hasn't loaded (WP-2).
  const pending = useRef<Notifications.NotificationResponse[]>([]);
  const latest = useRef({ ready, status, me, mode, router });

  const flush = useCallback(() => {
    const { ready, status, me, mode, router } = latest.current;
    if (!ready) return;
    const recipient = status === 'signedIn' ? (me?.customer.id ?? null) : null;
    for (const response of pending.current.splice(0)) {
      const id = response.notification.request.identifier;
      if (id && handled.current.has(id)) continue; // the cold-start response is reported again on remount
      if (id) handled.current.add(id);
      const data = response.notification.request.content.data ?? {};
      // A tap opens personal screens only for the person it was sent to (shared phone, signed out since).
      if (typeof data.recipient === 'string' && data.recipient !== recipient) continue;
      const href = data.href;
      if (typeof href === 'string' && href) router.push(resolveLink(href, mode) as Href);
    }
  }, []);

  useEffect(() => {
    analytics.setConsent(!!me?.consents.find((c) => c.purpose === 'analytics')?.granted);
  }, [me]);

  useEffect(() => {
    if (status === 'signedIn') registerPushDevice(session).catch(() => undefined);
  }, [status, session]);

  useEffect(() => {
    const queue = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      pending.current.push(response);
      flush();
    };
    let sub: { remove(): void } | undefined;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(queue);
      // Cold start from a tapped notification.
      Notifications.getLastNotificationResponseAsync().then(queue, () => undefined);
    } catch {
      // unavailable (tests, web)
    }
    return () => sub?.remove();
  }, [flush]);

  // Keep the latest auth/mode for the listener; once auth is ready, route whatever was tapped before.
  useEffect(() => {
    latest.current = { ready, status, me, mode, router };
    flush();
  }, [ready, status, me, mode, router, flush]);

  return null;
}
