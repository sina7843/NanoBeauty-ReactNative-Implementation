# OTPInput

Six-digit phone verification for sign-in, registration and legacy account matching (AUTH 02–03, AUTH 11).

**Props:** `length` (6), `value`, `error`, `resendIn` (seconds until resend is allowed; 0 shows the Resend link), `sentTo` (masked number), `label`.

**Behaviour:** one real input with `autoComplete="one-time-code"` (iOS SMS autofill, Android SMS Retriever); the cells are visual only. Paste fills all cells. Auto-submit when the last digit arrives; on error keep the digits so the person can correct one.

**Copy:** say where the code went and how many tries remain. Rate limits read as time, not blame: "Try again in 10 minutes."

**Motion:** no shaking; the error appears immediately with text (6A).
