import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptic roles (guideline 06). Android uses performHapticFeedback-style haptics, which respect the system
// setting and need no VIBRATE permission. Failures are ignored: haptics never gate an action.
const ignore = () => undefined;

export const haptics = {
  /** Selecting a time slot, toggling a switch. */
  selection() {
    if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick).catch(ignore);
    else Haptics.selectionAsync().catch(ignore);
  },
  /** Only when a booking or payment is CONFIRMED by the authoritative system. */
  confirmed() {
    if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(ignore);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
  },
  /** A failed payment. */
  failed() {
    if (Platform.OS === 'android') Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject).catch(ignore);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore);
  },
};
