# AuditEntry

One line of history: who did what, the previous and new value, the reason, and when (ADMIN 06).

**Props:** `actor`, `action`, `field`, `from`, `to`, `reason`, `at`.

Render inside `<ol className="nb-audit-list">`, newest first. Audit entries are read-only and can't be deleted from the app.
