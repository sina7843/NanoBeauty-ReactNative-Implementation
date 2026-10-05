# SearchField

A rounded search input for treatments, concerns and approved aliases (DISC 03).

**Props:** `value`, `placeholder` (default "Search treatments or concerns"), `onClear`.

**Behaviour:** results update after a short pause; search matches canonical names, approved aliases ("botox" → the approved injectable name), categories and concerns. No-result states use `EmptyState` with reset, spelling help, concern suggestions and a consultation route (DISC 10).
