# ConsentRow

One checkbox per consent purpose: terms, transactional messages and marketing are always separate records (AUTH 09, PRIV 02).

**Props:** `label`, `required` (shows a Required/Optional tag), `checked` (always **false** by default for optional consent), `detail`, `linkLabel` (opens the maintained legal page, AUTH 10), `error`.

**Rules**
- Never pre-select, bundle or hide marketing consent (a Remove item from the legacy audit).
- Store version, timestamp, channel and purpose for each (PRIV 02).
- Legal links open real, maintained pages; placeholder links block release.
