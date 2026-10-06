import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
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
  const { status, me, session } = useAuth();
  const mode = useSettings().data?.data.settings.bookingMode;
  const modeRef = useRef(mode);
  const meRef = useRef<string | null>(null);
  const handled = useRef(new Set<string>());
  useEffect(() => {
    modeRef.current = mode;
    meRef.current = status === 'signedIn' ? (me?.customer.id ?? null) : null;
  }, [mode, status, me]);

  useEffect(() => {
    analytics.setConsent(!!me?.consents.find((c) => c.purpose === 'analytics')?.granted);
  }, [me]);

  useEffect(() => {
    if (status === 'signedIn') registerPushDevice(session).catch(() => undefined);
  }, [status, session]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (id && handled.current.has(id)) return; // the cold-start response is reported again on remount
      if (id) handled.current.add(id);
      const data = response.notification.request.content.data ?? {};
      // A tap opens personal screens only for the person it was sent to (shared phone, signed out since).
      if (typeof data.recipient === 'string' && data.recipient !== meRef.current) return;
      const href = data.href;
      if (typeof href === 'string' && href) router.push(resolveLink(href, modeRef.current) as Href);
    };
    let sub: { remove(): void } | undefined;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(open);
      // Cold start from a tapped notification.
      Notifications.getLastNotificationResponseAsync().then(open, () => undefined);
    } catch {
      // unavailable (tests, web)
    }
    return () => sub?.remove();
  }, [router]);

  return null;
}
