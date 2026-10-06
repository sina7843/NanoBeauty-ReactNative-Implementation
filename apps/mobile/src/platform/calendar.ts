import * as Calendar from 'expo-calendar';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  notes?: string;
}

export type CalendarResult = 'opened' | 'denied' | 'unavailable';

/**
 * "Add to calendar" boundary (guideline 08). Hands the event to the OS UI; the person saves or cancels
 * there, so this never claims the event was saved.
 * - iOS: system event edit sheet with write-only access (iOS 17+), no full calendar read permission.
 * - Android: calendar insert intent, no permission at all.
 */
export async function addToCalendar(event: CalendarEvent): Promise<CalendarResult> {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
        data: 'content://com.android.calendar/events',
        extra: {
          title: event.title,
          beginTime: event.start.getTime(),
          endTime: event.end.getTime(),
          eventLocation: event.location ?? '',
          description: event.notes ?? '',
        },
      });
      return 'opened';
    }
    const permission = await Calendar.requestCalendarPermissions(true);
    if (!permission.granted) return 'denied';
    // With write-only access this is EventKit's virtual calendar: it can add, never read.
    await Calendar.getDefaultCalendarSync().addEventWithForm({
      title: event.title,
      startDate: event.start,
      endDate: event.end,
      location: event.location,
      notes: event.notes,
    });
    return 'opened';
  } catch {
    return 'unavailable';
  }
}
