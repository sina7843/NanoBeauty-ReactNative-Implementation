# AsyncStatus

The full-screen result of anything that moves money, time or value: pending, success, failed or timeout (PAY 04–09, BOOK 07, WALT 11).

**Props:** `state`, `title`, `children` (what happened, whether money moved, what happens next), `reference`, `actions`.

**Truth rules**
- `pending` shows only while the request is really open; it never pretends to finish early and never extends itself.
- `success` renders **only** after the authoritative system confirms (booking provider, payment provider, ledger). No confetti, counters or celebration.
- `failed` always says whether anything was charged and whether the slot is still held.
- `timeout` tells the person not to retry payment; the idempotent retry is "Check again".
- Always show a reference the customer can quote to support (SUP 04).

**Motion:** icon/title cross-fade `duration-state`; Reduce Motion = instant; the spinner slows under Reduce Motion rather than disappearing.
