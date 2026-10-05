# PriceTag

Every price format looks different, so customers never mistake a starting price for a final one (DISC 07).

**Props:** `kind` (`fixed`, `from`, `range`, `perUnit`, `consultation`, `promo`), `amount`, `min`, `max`, `unit`, `was`, `endsAt`, `size` (`md` | `lg`).

**Rules**
- Currency is CAD; format with the locale formatter, never string concatenation (NFR 13).
- `consultation` shows no number at all.
- `promo` shows the offer price in `primary` and the regular price struck through with an accessible "was" label, plus the absolute end time from the server (PROMO 09).
- Prices come only from the canonical catalogue (DISC 02). Sample numbers in this system are illustrative.
