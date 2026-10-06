import { useNavigation, usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useState } from 'react';

/**
 * Sheets/screens holding unsaved transactional input ask before dismissal (Sheet README, motion 6A).
 * Catches swipe-down, the close button, iOS back swipe and Android (predictive) Back alike. The screen
 * renders its own `Dialog` with the board's copy while `asking` is true.
 */
export function useDismissGuard(dirty: boolean) {
  const navigation = useNavigation();
  const [pending, setPending] = useState<NavigationAction | null>(null);
  usePreventRemove(dirty, ({ data }) => setPending(data.action));
  return {
    asking: pending !== null,
    keepEditing: () => setPending(null),
    discard: () => {
      if (pending) navigation.dispatch(pending);
      setPending(null);
    },
  };
}
