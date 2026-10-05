# TabBar

The customer app's bottom navigation: four places, icon plus label, the selected one in a lavender pill.

**Approved destinations (D28, 25 Sep 2026):** Home, Treatments, Visits, Wallet. Booking is not a tab: every Home, Treatments and Visits screen carries one violet Book button. Account, support and privacy sit behind the profile button at the top of Home. Staff tools are never a tab. Rewards get no tab while they are in the backlog; a fifth slot stays free for a promoted feature.

**Props:** `items` (`{key, label, icon, badge}`; defaults to the four approved places), `value`, `onChange`.

**States:** selected = Fill icon + `on-tint` in `surface-tint` pill + `primary` label + bold; unselected = Regular icon + `ink-muted`. Labels are always shown. Guests see all four; Visits and Wallet then show a sign-in explanation.

**Motion:** selection changes colour and fill only, `duration-state`; no wobble or bounce.

**RN:** Expo Router `Tabs` with a custom `tabBar`, padded by the bottom safe-area inset; height `tabbar-height` above the inset.
