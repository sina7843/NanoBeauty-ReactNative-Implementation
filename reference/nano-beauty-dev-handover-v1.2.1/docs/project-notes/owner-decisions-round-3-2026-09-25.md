# Nano Beauty App — owner direction on D33–D40 and remaining fixes (round 3, 25 Sep 2026)

**Status (verified 25 Sep): round 3 done.** CR-56 to CR-58 are closed and logged in the Phase 0 register and the Phase 7 changelog. Nothing was removed; the canvas still has 158 boards. GLOW25 is in the promo-code list. HydraFacial is replaced with OxyGeneo facial in the sample data, and only the import-review duplicate example keeps it. Visit NB-19877 shows $70. NTF-01 to NTF-12 now show a preview for each channel (lock-screen push, text, email). Next: confirm D33, D34, D35 and D38 with the client, then benchmarking.

**Rule for this round: do not remove, park or restructure anything in the design.** The owner will confirm D33, D34, D35 and D38 with the client first. Until then, the canvas, flows, routes and fixtures stay as they are.

## Round 3 work (done)

1. **GLOW25** added to `promoCodes` and STF-19 (CR-56).
2. **HydraFacial** replaced by OxyGeneo facial in sample data, except the import-review duplicate example (CR-57).
3. **Past laser visit NB-19877** now $70 (CR-58).

## Owner direction, pending client confirmation (not applied to the design)

| ID | Owner direction | What would change after confirmation |
| --- | --- | --- |
| D33 | Booking happens in Fresha; the clinic accepts and manages bookings there. | Hand-off becomes the only launch path. The in-app booking screens are parked, not deleted. |
| D34 | One staff role: everyone with staff access gets the full admin panel; the audit log stays. | Role variants and role pickers are removed from staff screens. |
| D35 | No approval step; staff publish after a confirm step. | The approval screens (STF-08/09) and Submit states are parked. |
| D38 | Membership is not shown anywhere, including for old-app members; benefits are handled at the desk. | The WAL-01 membership row and WAL-05 are parked. |

Confirmed and unchanged: D36 archive-not-delete, D37 rules as settings, D39 tablet layout for staff, D40 import optional (manual entry and import both stay).

## Postponed

- The account-deletion web page for Google Play (WEB-03/04) is postponed. Keep the boards as they are. (Note for release: Google Play asks for a deletion URL at submission; see open-items.md.)
- The gift-claim web pages (WEB-01/02) stay as designed until the owner decides the host.
- Support stays as designed; social and website links are a later round.
