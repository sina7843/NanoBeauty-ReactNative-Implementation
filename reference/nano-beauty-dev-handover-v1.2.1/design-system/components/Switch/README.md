# Switch

An on/off preference row for notification and privacy settings (NOTIF 02, NOTIF 04).

**Props:** `label`, `detail`, `checked`, `disabled`, `locked` (shows "Always on" for required transactional messages instead of a switch that can't move).

Changes save immediately and are reversible; confirm with a toast only if saving can fail. Marketing starts off.

**RN:** native `Switch` with `trackColor={{true: primary}}`, `thumbColor` from `on-primary` on Android.
