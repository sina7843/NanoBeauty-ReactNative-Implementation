# TopBar

The screen header: native back, title and at most two trailing actions.

**Props:** `title`, `large` (serif `display-md` title under the bar, for top-level screens), `back`, `backLabel`, `trailing`, `platform` (`ios` | `android`).

**Platform:** iOS shows a chevron with a text label and supports edge-swipe back; Android shows an arrow and respects system Back/predictive back. Both keep the same title and actions. Top-level tab screens use `large`; pushed screens use the compact sans title.

**RN:** Expo Router `Stack` header options drive this; do not re-implement gestures.
