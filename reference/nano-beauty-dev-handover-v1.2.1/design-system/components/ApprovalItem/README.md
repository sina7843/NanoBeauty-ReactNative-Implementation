# ApprovalItem

One change waiting for approval: what changed (before → after), who asked, and approve or request changes (ADMIN 03, ADMIN 06, ADMIN 08, D18).

**Props:** `kind`, `title`, `changes` (`{field, from, to}`), `by`, `at`, `risk` (needs a second approver), `rejecting` (shows the required reason field), `hideActions` (leave the buttons out when the screen pins them in a bottom bar, as on a full review screen).

**Rules**
- Rejecting requires a reason; the reason is saved to the audit log and shown to the editor.
- The approver can't be the submitter for high-risk changes.
- Staff approval covers publishable content (services, prices, campaigns, support content), not patient clinical data.
- The server enforces permissions; the UI only reflects them.
