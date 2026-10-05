# Staff workspace

Clinic staff use the same app. The workspace is role-gated and visually distinct.

## Entry and identity

- Reached from Account → "Staff workspace", visible only after the server confirms a staff role (ADMIN 01). Never a customer tab.
- Every staff screen starts with `StaffBar`: the deep plum `staff` band, role, and environment. Non-production environments show an amber tag (ADMIN 07).
- Strong authentication for staff (NFR 04); sessions time out sooner than customer sessions.

## Roles (proposed; clinic to confirm)

| Role | Can |
|---|---|
| Content editor | Draft services, campaigns, FAQ and support content; submit for review |
| Approver (clinic lead) | Approve or request changes with a reason; publish, pause, roll back |
| Support | Look up bookings and value by reference; log a resolution; no price edits |
| Finance | Review value discrepancies, refunds and adjustments; approve adjustments |
| Administrator | Manage roles and settings |

## Workflows

- **Manual catalogue entry** (ADMIN 02, D14): service name, aliases, category, concerns, duration, price kind, eligible professionals, preparation/aftercare text, image rights, visibility. `PublishState` shows the lifecycle.
- **Campaigns** (PROMO 01–06, ADMIN 03): schedule with timezone, eligibility, terms, exact destination, preview as a customer, pause, roll back. Expired campaigns can't transact (ADMIN 10).
- **Approval** (ADMIN 08, D18): `ApprovalItem` shows before → after. High-risk changes (price, policy, campaign terms) need a second approver who isn't the submitter. Rejecting requires a reason.
- **Audit** (ADMIN 06): every sensitive change is an `AuditEntry` with actor, previous and new value, reason, time.
- **Concurrent edits:** `EditConflict` on version mismatch; no silent overwrite, no force-save.
- **Permission failures:** `PermissionNotice`. The server enforces every permission; hiding a button is not security.
- **Customer-value support** (ADMIN 09): look up by reference, see the ledger trail, propose an adjustment for finance approval.

Staff approval covers publishable content and operational records. It never authorises collecting or displaying clinical patient data.
