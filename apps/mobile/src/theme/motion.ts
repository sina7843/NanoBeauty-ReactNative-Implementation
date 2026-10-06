import { duration, easing } from '@nano/design-tokens';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/** Live Reduce Motion (iOS) / Remove animations (Android), including changes while the app is open. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduced(value));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

const bezier = (curve: readonly [number, number, number, number]) => Easing.bezier(...curve);

export const motion = {
  duration,
  ease: { enter: bezier(easing.enter), exit: bezier(easing.exit), state: bezier(easing.state) },
} as const;
