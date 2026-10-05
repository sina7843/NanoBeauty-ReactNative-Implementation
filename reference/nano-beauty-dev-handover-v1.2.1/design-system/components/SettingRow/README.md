# SettingRow

One rule or switch on the clinic settings screens (D37, G16). Customer screens read these values; nothing is hard-coded.

**Props:** `label`, `detail`, `kind` (`toggle`, `value`, `stepper`), `value`, `checked`, `unit`, `locked` (true = Owner only, or a reason), `changed` (unsaved: amber dot and tint).

Changing a rule shows its impact before saving ("applies to new bookings only") and writes an audit entry.
