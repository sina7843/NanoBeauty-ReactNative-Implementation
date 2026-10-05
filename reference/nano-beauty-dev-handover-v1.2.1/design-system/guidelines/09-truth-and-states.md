# Truth, states and sample data

## Every screen has these states

Loading, empty, content, offline, error with retry. Transactional screens add: pending, provider hand-off, provider return, declined, expired, timeout, duplicate callback, insufficient permission and data mismatch. Design them all; "happy path only" is not done.

## Truth rules

1. **Confirmed means confirmed.** Booking, payment, refund, gift claim and balance changes show success only after the authoritative system (booking provider, payment provider, ledger) responds. Use `AsyncStatus`.
2. **Say whether money moved.** Every failure message states if anything was charged and whether the time slot is still held.
3. **No double actions.** After a timeout, offer "Check again" (idempotent), never "Pay again".
4. **Server time.** Countdowns, holds and expiries use server time and a named timezone.
5. **Balances reconcile.** If the ledger is reconciling, show "Checking your balance" and a dash, not a cached number.
6. **Prices from the catalogue.** Never type a price into a design as if final. Use `PriceTag` kinds so "From" and "Consultation required" can't be mistaken for fixed prices.

## Sample data

Anything authenticated (appointments, balances, member tiers, staff names, approval items) is **simulated** until real records are connected. Mark it with `Badge tone="sample"` in designs, demos and review builds. Staff names in previews come from the public website and are placeholders.

## Conditional flows

These depend on unverified systems and are designed as targets, not signed-off transactions:

| Flow | Depends on | Owner |
|---|---|---|
| Time selection, booking confirmation, reschedule, cancel | Fresha API vs controlled hand-off (D13) | Operations + engineering |
| Debit, Klarna, Affirm checkout and refunds | Merchant contracts and integration (D15) | Finance + engineering |
| Wallet balances, packages, gift cards, credit | Legacy ledger export/access (D15, D16) | Operations + finance |
| Account match and recovery | Legacy customer identifiers (D16) | Engineering |
| Member status | Reconciled tiers and benefits (D17) | Operations + finance |

If Fresha remains a hand-off, the design uses a `Banner tone="info"` before leaving ("Booking continues with Fresha") and an `AsyncStatus` on return that reads the real result or says it can't confirm yet.
