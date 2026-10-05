# Toast

A brief message after a small, reversible action; it appears above the tab bar and leaves after ~4 s.

**Props:** `tone` (`neutral`, `success`, `warning`, `danger`, `info`), `children`, `action` (one verb: Undo, Retry, View).

Never use a toast for booking, payment or balance outcomes: those need a full `AsyncStatus` screen with a reference. Toasts are announced politely and don't steal focus.

**Motion:** enters with `duration-reveal`/`ease-enter` (8px rise); Reduce Motion = fade only.
