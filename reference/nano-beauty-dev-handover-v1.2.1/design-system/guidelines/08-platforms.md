# iOS and Android

One design, one semantic token set, one component library. Platforms differ only where the OS owns the behaviour.

| Area | iOS | Android |
|---|---|---|
| Back | Chevron + previous-title label; edge swipe | Arrow, system Back and predictive back gesture |
| Top-level titles | Large serif title that collapses on scroll | Same serif title; collapses to the compact bar |
| Sheets | Page sheet with detents, swipe to dismiss | Modal bottom sheet, drag handle, Back dismisses |
| Alerts | `Alert.alert` for simple yes/no | Same API; Material dialog appearance |
| Press feedback | Tint / opacity highlight | Ripple in `surface-pressed` |
| Switch | Native `Switch` tinted `primary` | Native `Switch`, `primary` track, `on-primary` thumb |
| Date/time | Our `TimeSlotGrid` for slots; native pickers only for birthdays | Same |
| System bars | Content under status bar, respect safe area | Edge-to-edge; dark/light system-bar icons follow theme |
| Dynamic colour | Not used | **Off.** Nano violet stays fixed regardless of wallpaper |
| Haptics | UIImpactFeedbackGenerator roles | `performHapticFeedback` equivalents; respect system setting |
| Text size | Dynamic Type | Font scale |
| Calendar | Event edit sheet (no full calendar permission) | Calendar insert intent (no permission) |
| OTP autofill | `textContentType="oneTimeCode"` | SMS Retriever / `autoComplete="sms-otp"` |

No Liquid Glass or live blur is required on either platform. Both themes follow the system appearance setting.
