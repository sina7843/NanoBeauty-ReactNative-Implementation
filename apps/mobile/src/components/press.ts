import { Platform, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';

/** tokens.json `opacity-disabled` (not in the RN export). Fills and imagery only, never text contrast. */
export const OPACITY_DISABLED = 0.4;

/**
 * Platform press feedback (guideline 08): Android ripple in `surfacePressed`; iOS swaps the fill to the
 * pressed colour. No scale bounce. Returns props to spread onto a Pressable.
 */
export function pressFeedback(
  base: StyleProp<ViewStyle>,
  { pressedColor, rippleColor, borderless = false }: { pressedColor?: string; rippleColor: string; borderless?: boolean },
): Pick<PressableProps, 'style' | 'android_ripple'> {
  if (Platform.OS === 'android') {
    return { android_ripple: { color: rippleColor, borderless, foreground: true }, style: base };
  }
  return {
    style: ({ pressed }: PressableStateCallbackType) => [base, pressed && pressedColor ? { backgroundColor: pressedColor } : null],
  };
}

/** 48 dp touch target around controls that look smaller (control-sm 36). */
export const hitSlopFor = (visualHeight: number) => {
  const pad = Math.max(0, Math.ceil((48 - visualHeight) / 2));
  return { top: pad, bottom: pad, left: 0, right: 0 };
};
