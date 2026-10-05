# ServiceCard

A treatment in a list or grid: photo, category, name, duration and price format. The whole card opens service detail.

**Props:** `category`, `name` (canonical name only), `duration`, `price` (PriceTag props), `consultation`, `photo`, `layout` (`stacked`: 16:10 photo, for featured spots; `row`: 104px thumbnail, for dense lists, so four or more fit on one phone screen), `photoRatio` (stacked only, default `16 / 10`; use `2 / 1` in a list so two full cards fit on a phone screen), `onPress`.

Consultation-required treatments carry an info badge and their detail page leads with "Book a consultation". Names, categories, durations and prices come from the approved catalogue (DISC 02, DISC 09). No quantity steppers on treatments (BOOK 13).
