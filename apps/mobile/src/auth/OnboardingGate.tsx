import { router, useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { useAuth } from './AuthProvider';
import { onboardingRedirect } from './flow';

/**
 * FE-1: on launch, on every signed-in entry (Home, deep link) and after an `onboarding_required` refusal, a person
 * whose sign-up isn't finished is taken back to the pending step (AUT-03 → AUT-04 → AUT-05…07).
 */
export function OnboardingGate() {
  const { status, me } = useAuth();
  const pathname = usePathname();
  const next = status === 'signedIn' ? me?.next : undefined;
  useEffect(() => {
    const target = onboardingRedirect(next, pathname);
    if (!target) return;
    // Inside the sign-in modal swap the screen; elsewhere open the modal on the step.
    if (pathname.startsWith('/auth/')) router.replace(target);
    else router.push(target);
  }, [next, pathname]);
  return null;
}

/**
 * FE-1: AUT-03/AUT-04 can't be left half-done. Android (predictive) Back asks first; leaving signs the person out.
 * iOS has no Back on these steps (swipe and header back are off, docs/deviations.md).
 */
export function useLeaveSignUp() {
  const { signOut } = useAuth();
  const [asking, setAsking] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setAsking(true);
        return true;
      });
      return () => sub.remove();
    }, []),
  );
  return {
    asking,
    stay: () => setAsking(false),
    leave: () => {
      setAsking(false);
      void signOut(); // the step screens then send the guest to AUT-01, which can be closed
    },
  };
}
