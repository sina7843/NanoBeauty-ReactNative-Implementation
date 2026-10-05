# PublishState

The lifecycle state of a service, campaign or content item (PROMO 02, ADMIN 03).

**Props:** `state` (`draft`, `review`, `scheduled`, `live`, `paused`, `expired`, `rejected`, `archived`, `deleted`), `detail` (a date or who). Archived items are hidden from customers and restorable; deleted applies to drafts only (D36).

Each state has its own icon and word. Scheduled and expiry times show the timezone. Expired campaigns can't transact (ADMIN 10).
