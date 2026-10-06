# Legacy migration plan (LEG 01–08, REWD 02, MEM 02–03)

Status: **plan and tooling ready; no data has been migrated.** The old app (Lead360 white-label) export does not exist yet
(open item C3). Nothing below may be reported as done until it has been run against the real export and signed off.

## Principles

- Truth first: a customer sees a migrated balance only after it is reconciled; until then the Wallet shows "reconciling"
  (WAL-01) and staff resolve questions through balance help (WAL-12) and STF-11/25.
- No automatic merge: legacy accounts are matched only on verified phone **and** full name (AUTH 11); everything else
  goes to staff review (STF-28). Matching never moves value by itself.
- Every import is idempotent: ledger entries of kind `import` carry the legacy reference as their idempotency key, so a
  re-run adds nothing.

## LEG 01 — Data inventory (to fill from the export)

| Domain | Legacy source | Record count | Owner | Identifier | Balances / active states | Consent provenance | Quality notes | Export available |
|---|---|---|---|---|---|---|---|---|
| Customers | Lead360 contacts | _tbd_ | Clinic owner | phone (E.164) | — | marketing opt-in date? | duplicates, shared numbers | C3 |
| Appointments | Fresha | — | Clinic | Fresha booking id | upcoming / past | — | stays in Fresha | Fresha read-back E2 |
| Packages | Lead360 | _tbd_ | Clinic | package id | sessions left, expiry | — | | C3 |
| Gift cards | Lead360 / paper | _tbd_ | Clinic | code | balance | — | codes may be plain text | C3 |
| Clinic credit | Lead360 | _tbd_ | Clinic | customer | balance | — | | C3 |
| Memberships | Lead360 | _tbd_ | Clinic | tier | status, banked value | — | tier names conflict (MEM 03) | C3 |
| Rewards / points | Lead360 | _tbd_ | Clinic | customer | points | — | | C3 |
| Marketing consent | Lead360 | _tbd_ | Clinic | customer | opt-in state | source and date required | | C3 |

## LEG 02 — Domain disposition

| Domain | Disposition | Rule |
|---|---|---|
| Customers | Integrate (match on sign-in) | AUT-05–07 decision + STF-28 review; unmatched = new client |
| Appointments | Integrate (Fresha stays the source) | Fresha read-back when available (E2) |
| Packages, gift cards, clinic credit | Migrate into the ledger | `import` entries per instrument after reconciliation |
| Memberships | Read-only, behind `features.legacyMembership` | Honour through support until tiers are reconciled (MEM 02/03) |
| Rewards / points | Settle or retire with notice (REWD 02) | Owner decision; convert to clinic credit or honour through support |
| Marketing consent | Do not migrate without provenance | Without source and date, customers are asked again (AUT-03) |
| Everything else (notes, photos, medical) | Archive in the clinic's records, not the app | NFR 06 / PRIV 07 |

## LEG 03 — Reconciliation

1. **Before cutover:** export totals per domain (count, sum of balances, sum of sessions) from the old system; sign by
   the clinic owner.
2. **Import:** one ledger instrument per legacy item, opening entry `kind = 'import'`, `idempotency_key = 'legacy:<ref>'`.
3. **After import:** `npm run reconcile -w @nano/api` must print `Ledger reconciles.`; then compare per-domain totals with
   the signed export totals. Any difference is a discrepancy row with an owner.
4. **Discrepancy procedure:** the instrument stays `reconciling` (customer sees "We're confirming this balance"); staff
   resolve via adjustments (Owner, audited) or balance help; the customer is told the outcome.
5. Repeat after the delta migration at cutover.

## LEG 04 — Identity mapping

- Verified phone (OTP) + exact full name → `matched`, customer confirms (AUT-05).
- Same phone, different name → `mismatch` → staff review (STF-28), customer contacted.
- Shared or changed numbers → never auto-matched; staff confirm with the client; the audit keeps the decision.
- No match → new client; legacy value is reachable through support until claimed.

## LEG 05 — Cutover runbook

| Step | Owner | Notes |
|---|---|---|
| Go / no-go meeting | Clinic owner + tech lead | reconciliation sign-off, store builds approved |
| Freeze old-app value changes | Clinic | counter staff use the new app from freeze time |
| Delta export + import | Tech lead | idempotent; run reconcile |
| Turn on `legacyMembership` if members exist | Owner (STF-32) | settings change, no release |
| Support staffing for first 2 weeks | Clinic | balance help queue monitored daily |
| Rollback | Tech lead | old app stays readable; new-app ledger entries made after cutover are exported for manual entry; customers notified |
| Rollback window | Clinic owner | 30 days (to confirm) |

Rehearse once on a copy of the export before the real cutover.

## LEG 06 — Customer communication (templates to approve)

- **Before:** "Nano Beauty has a new app. Your balances move over on <date>. You don't need to do anything."
- **After:** "Your Nano Beauty balance is in the new app's Wallet. If anything looks wrong, tap Help in Wallet."
- **Membership / rewards:** per the REWD 02 / MEM 02 decision.
- **Consent:** customers whose marketing consent can't be proven are asked again in the app (no message).

## LEG 07 — Route transition

Done in the app: unknown, old and expired links land on Home with "Link not found" (`navigation/links.ts`,
`+not-found.tsx`). Web redirects for old campaign URLs need the domain (NANO-11).

## LEG 08 — Decommission evidence (checklist)

- [ ] Reconciliation signed off (before and after delta)
- [ ] Contract with the old vendor reviewed (data return, deletion)
- [ ] Records retained per the retention schedule (legal to confirm)
- [ ] Old-app credentials revoked
- [ ] Monitoring on balance-help volume for the rollback window
- [ ] Rollback window closed without rollback
