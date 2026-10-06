import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SessionManager } from '../auth/session';
import { getNotificationPermission } from './notifications';

/** Kept on the phone so sign-out can remove it after an app restart. Not secret (a push address). */
const TOKEN_KEY = 'nano.push.token';

/**
 * Registers this phone for pushes (NANO-09) once the person has allowed notifications. Needs the EAS project ID for
 * an Expo push token; without one (no EAS project yet) the app simply doesn't register — the inbox still works.
 */
export async function registerPushDevice(session: SessionManager): Promise<'registered' | 'denied' | 'unavailable'> {
  if ((await getNotificationPermission()) !== 'granted') return 'denied';
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return 'unavailable';
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await session.authed('/v1/me/devices', { method: 'POST', body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => undefined);
    return 'registered';
  } catch {
    return 'unavailable';
  }
}

/** Sign-out: this phone stops getting the person's pushes. Best effort; the server also moves a re-used token. */
export async function unregisterPushDevice(session: SessionManager): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
  await session.authed('/v1/me/devices/remove', { method: 'POST', body: { token } }).catch(() => undefined);
}
