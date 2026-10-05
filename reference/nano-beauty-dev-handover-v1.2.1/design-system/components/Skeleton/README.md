# Skeleton

A static placeholder in the shape of the content that is loading.

**Props:** `lines`, `media`.

No shimmer or pulse (6A): the shape alone tells people content is coming. Show it only after ~300 ms. On transactional screens (price, payment, balance) prefer a plain "Loading…" line over a skeleton that could be mistaken for a value. Never render stale or fabricated values as if personal.
