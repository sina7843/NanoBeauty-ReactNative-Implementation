# AccountMatch

The returning-customer check after phone verification: matched, mismatch or not found (AUTH 11, LEG 04, WALT 12).

**Props:** `state` (`matched`, `mismatch`, `notfound`), `items` (what was found).

**Rules:** never merge on a partial match; route mismatches to assisted recovery with the clinic. "Something's missing" opens support with the customer's reference, not a form asking them to re-type balances. Records shown are from migration or integration, labelled `Sample` until real.
