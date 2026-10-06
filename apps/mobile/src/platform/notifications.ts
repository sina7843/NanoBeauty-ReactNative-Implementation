import * as Notifications from 'expo-notifications';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** OS notification permission only. Push token registration and delivery are NANO-09 (vendor E5). */
export async function getNotificationPermission(): Promise<PermissionState> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}
