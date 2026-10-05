# TimeSlotGrid

Available times for one day as a 3-column grid (BOOK 03–04).

**Props:** `date`, `slots` (`{time, state}` where state is `available`, `selected`, `unavailable`), `state` (`ready`, `checking`, `none`, `conflict`), `holdNote`.

**Truth rules:** slots come from the booking source of truth. The hold note appears only when the server has created a hold and states its real expiry; selecting a slot alone reserves nothing. On conflict, refresh and say nothing was charged. Unavailable slots are dashed and struck through (not colour alone) or hidden.

**Motion:** selection fill `duration-feedback`; "Checking availability…" is text plus spinner, no fake progress.

**Fresha dependency:** whether times render natively or hand off to Fresha is unverified (D13). This component is used only if a verified API supports it.
