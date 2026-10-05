# Screen index (generated from the canvas and routes.json)

One row per canvas board. `Board` is the file in `canvas/`; `Main` is HOM-01 (guest home). Tweaks lists the state switches on the board (theme and platform are on every screen). Mode: which booking mode uses the route (see decisions-and-flags.md). Roles: staff roles that can open it (server-checked).

## Entry

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| ENT-01 | Splash | `/` | both | — | — | — |
| ENT-02 | Update required | `/` | both | — | — | SUP-03 |
| ENT-03 | Maintenance | `/` | both | — | — | — |
| ENT-04 | Notification primer | `/` | both | — | — | Main |

## Sign-in

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| AUT-01 | Sign in: phone number | `/auth/phone` | both | — | state: filled/empty/invalid/sending/network | AUT-02 |
| AUT-02 | Sign in: verification code | `/auth/code` | both | — | state: entering/wrong/expired | AUT-01, AUT-03 |
| AUT-03 | Sign in: consents | `/auth/consents` | both | — | — | AUT-04 |
| AUT-04 | Sign in: name and email | `/auth/profile` | both | — | — | AUT-05 |
| AUT-05 | Account matched | `/auth/match` | both | — | — | HOM-02 |
| AUT-06 | Account details don't match | `/auth/match` | both | — | — | SUP-03 |
| AUT-07 | No past account found | `/auth/match` | both | — | — | AUT-03 |
| AUT-08 | Session expired | `/auth/code` | both | — | state: expired/limited | AUT-01, SUP-03 |

## Home

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| HOM-01 (Main) | Guest home | `/(tabs)/home` | both | — | state: ready/loading/offline/oldlink; rating: off/on | AUT-01, BKG-01, TRT-01, TRT-02 |
| HOM-02 | Home with next visit | `/(tabs)/home` | both | — | state: ready/offline; mode: handoff/inapp; sync: synced/notsynced | ACC-01, ACC-04, BKG-01, BKG-08, CAR-01, VIS-02, WAL-03, WAL-04 |
| HOM-03 | Home without a visit | `/(tabs)/home` | both | — | mode: handoff/inapp | ACC-01, ACC-04, BKG-03, BKG-12, OFR-01 |

## Treatments

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| TRT-01 | Treatments | `/(tabs)/treatments` | both | — | — | BKG-01, TRT-02, TRT-04 |
| TRT-02 | Skin tightening treatments | `/treatments/list` | both | — | state: loaded/empty/loading | BKG-01, TRT-02, TRT-03, TRT-05 |
| TRT-03 | Filters | `/treatments/list` | both | — | — | TRT-02 |
| TRT-04 | Search, no results | `/treatments/search` | both | — | state: noresults/typing/results | SUP-03, TRT-01, TRT-02, TRT-05 |
| TRT-05 | 12D HIFU | `/treatments/[id]` | both | — | price: from/fixed/range/perunit/consultation/promo; view: standard/faq/perarea; financing: off/on; mode: handoff/inapp | BKG-02, BKG-10, BKG-12, CAR-01, SUP-02, TRT-06 |
| TRT-06 | Professional profile | `/professionals/[id]` | both | — | — | BKG-03 |
| TRT-07 | Treatment unavailable | `/treatments/[id]` | both | — | state: unavailable/archived | SUP-03, TRT-05 |

## Offers

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| OFR-01 | Offer | `/offers/[id]` | both | — | state: live/upcoming/paused/returning | OFR-02, OFR-03, TRT-02, WAL-07 |
| OFR-02 | Offer terms | `/offers/[id]/terms` | both | — | — | ACC-11, OFR-01 |
| OFR-03 | Promo code | `/promo` | both | — | state: ended/invalid/usedup/noteligible/alreadyused/valid | OFR-01, OFR-03, WAL-07 |
| OFR-04 | Offer ended | `/offers/[id]` | both | — | — | TRT-02 |

## Booking

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| BKG-01 | BKG-01 Service | `/book/service` | both | — | state: one/several; mode: handoff/inapp | BKG-02, BKG-10, BKG-12, TRT-01 |
| BKG-02 | Book: choose a professional | `/book/professional` | inapp | — | — | BKG-01, BKG-03 |
| BKG-03 | Book: date and time | `/book/time` | inapp | — | state: ready/checking/none/conflict | BKG-04 |
| BKG-04 | Book: details | `/book/details` | inapp | — | state: ready/error | BKG-05 |
| BKG-05 | Book: review | `/book/review` | inapp | — | state: deposit/expiring/expired/package; basket: one/several | BKG-03, BKG-06, PAY-01 |
| BKG-06 | Booked | `/book/result` | inapp | — | — | CAR-01, HOM-02 |
| BKG-07 | Couldn’t book | `/book/result` | inapp | — | state: failed/offline | BKG-03 |
| BKG-08 | BKG-08 Fresha hand-off | `/book/fresha` | handoff | — | mode: handoff/inapp | BKG-09 |
| BKG-09 | Back from Fresha | `/book/fresha-return` | handoff | — | state: checking/confirmed/notyet/notvisible | HOM-02, VIS-01 |
| BKG-10 | BKG-10 Choose areas | `/book/areas` | both | — | state: some/none/max; set: women/men; mode: handoff/inapp | BKG-11, BKG-12 |
| BKG-11 | BKG-11 Your visit | `/book/basket` | inapp | — | state: several/one/toolong | BKG-01, BKG-02 |
| BKG-12 | BKG-12 How booking works | `/book/how-it-works` | handoff | — | state: first/dontshow | BKG-08 |

## Payment

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| PAY-01 | Payment: choose a method | `/pay/method` | both | — | ctx: deposit/package/none; wallets: on/off | PAY-02 |
| PAY-02 | Payment: card | `/pay/card` | both | — | state: filled/empty/error/verify | PAY-04 |
| PAY-03 | Leaving for Klarna | `/pay/provider` | both | — | — | PAY-01, PAY-04 |
| PAY-04 | Payment: waiting | `/pay/status` | both | — | — | — |
| PAY-05 | Payment: paid | `/pay/status` | both | — | — | BKG-06, PAY-09 |
| PAY-06 | Payment: declined | `/pay/status` | both | — | — | PAY-01, SUP-03 |
| PAY-07 | Payment: cancelled | `/pay/status` | both | — | — | HOM-02, PAY-01 |
| PAY-08 | Payment: still checking | `/pay/status` | both | — | — | SUP-03 |
| PAY-09 | Receipt | `/pay/receipt/[id]` | both | — | — | SUP-03 |

## Visits

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| VIS-01 | Visits | `/(tabs)/visits` | both | — | state: upcoming/past/empty/guest/offline; mode: handoff/inapp; sync: synced/notsynced | AUT-01, BKG-01, BKG-08, VIS-02, VIS-07 |
| VIS-02 | Visit detail | `/visits/[id]` | both | — | state: early/late/requested; mode: handoff/inapp | BKG-08, CAR-01, PAY-09, SUP-03, VIS-03, VIS-04, VIS-06 |
| VIS-03 | Reschedule | `/visits/[id]/reschedule` | inapp | — | state: ready/none/failed | VIS-02 |
| VIS-04 | Cancel visit | `/visits/[id]` | both | — | money: refund/package | — |
| VIS-05 | Visit cancelled | `/visits/[id]/cancelled` | both | — | — | BKG-03, PAY-09, VIS-01 |
| VIS-06 | Late change | `/visits/[id]/late-change` | both | — | — | — |
| VIS-07 | Past visit | `/visits/[id]` | both | — | state: completed/missed | BKG-03, CAR-01, PAY-09, SUP-03 |

## Care

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| CAR-01 | Preparation and aftercare | `/care/[visitId]` | both | — | — | — |

## Wallet

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| WAL-01 | Wallet | `/(tabs)/wallet` | both | — | state: full/reconciling/offline/empty/guest; member: no/yes | AUT-01, WAL-02, WAL-03, WAL-04, WAL-05, WAL-06, WAL-07, WAL-12, WAL-13 |
| WAL-02 | Clinic credit | `/wallet/credit` | both | — | state: available/expiring/reconciling | BKG-01, WAL-12 |
| WAL-03 | Package | `/wallet/packages/[id]` | both | — | state: active/expiring/expired/used | BKG-03, SUP-02, SUP-03, WAL-07 |
| WAL-04 | Gift card | `/wallet/gift-cards/[id]` | both | — | role: mine/sent | BKG-01, PAY-09, WAL-12 |
| WAL-05 | Membership | `/wallet/membership` | both | — | — | — |
| WAL-06 | Receipts and history | `/wallet/history` | both | — | — | PAY-09 |
| WAL-07 | Buy a package | `/wallet/buy-package` | both | — | — | PAY-01, SUP-02 |
| WAL-08 | Gift card: value | `/wallet/gift/value` | both | — | state: preset/custom/error | WAL-09 |
| WAL-09 | Gift card: recipient | `/wallet/gift/recipient` | both | — | state: now/later | WAL-10 |
| WAL-10 | Gift card: review | `/wallet/gift/review` | both | — | — | PAY-01 |
| WAL-11 | Claim a gift card | `/wallet/claim` | both | — | state: valid/invalid/claimed/notfound | WAL-04 |
| WAL-12 | Balance help | `/wallet/help` | both | — | state: form/sent | WAL-01, WAL-12 |
| WAL-13 | WAL-13 Gift design | `/wallet/gift/design` | both | — | state: selected/loading | WAL-08 |

## Account

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| ACC-01 | Account | `/account` | both | — | — | ACC-02, ACC-03, ACC-04, ACC-06, ACC-11, Main, STF-01, SUP-01 |
| ACC-02 | Profile | `/account/profile` | both | — | state: view/phone/error | ACC-01 |
| ACC-03 | Notifications | `/account/notifications` | both | — | — | — |
| ACC-04 | Messages | `/account/inbox` | both | — | state: list/empty | ACC-05, OFR-01, PAY-09, VIS-02, WAL-04 |
| ACC-05 | Message: visit tomorrow | `/account/inbox/[id]` | both | — | — | CAR-01, VIS-02 |
| ACC-06 | Privacy and data | `/account/privacy` | both | — | — | ACC-03, ACC-07, ACC-08, ACC-11 |
| ACC-07 | Request my data | `/account/data-request` | both | — | — | — |
| ACC-08 | Delete account | `/account/delete` | both | — | — | ACC-09, SUP-03 |
| ACC-09 | Confirm deletion | `/account/delete` | both | — | — | ACC-06, ACC-10 |
| ACC-10 | Deletion requested | `/account/delete` | both | — | state: requested/completed | Main |
| ACC-11 | Booking policy | `/legal/[doc]` | both | — | state: online/offline | — |

## Support

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| SUP-01 | Help and contact | `/support` | both | — | — | SUP-02, SUP-03, SUP-04, TRT-04 |
| SUP-02 | Help article: deposits | `/support/[article]` | both | — | — | SUP-03 |
| SUP-03 | Contact with reference | `/support/contact` | both | — | state: closed/open/sent | — |
| SUP-04 | SUP-04 Ask us | `/support/ask` | both | — | state: empty/filled/error/sending | SUP-05 |
| SUP-05 | SUP-05 Question sent | `/support/ask/sent` | both | — | — | ACC-04, SUP-01 |

## Staff workspace

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| STF-01 | STF-01 Staff home | `/staff` | both | Editor, Front desk, Owner | role: Owner/Editor/Front desk | STF-02, STF-04, STF-05, STF-08, STF-10, STF-11, STF-12, STF-13, STF-15, STF-17, STF-19, STF-21, STF-23, STF-25, STF-26, STF-29, STF-31, STF-32, STF-33, STF-34, STF-35, STF-36, STF-37, STF-40, STF-41 |
| STF-02 | STF-02 Services | `/staff/services` | both | Editor, Owner | view: all/archived; role: Owner/Editor | STF-01, STF-03, STF-39, STF-41 |
| STF-03 | STF-03 Service edit | `/staff/services/[id]` | both | Editor, Owner | state: ready/invalid/draft/conflict/offline/savefailed; role: Owner/Editor | STF-02, STF-07, STF-08, STF-09, STF-40 |
| STF-04 | STF-04 Categories and concerns | `/staff/taxonomy` | both | Editor, Owner | state: list/rename/move/blocked; role: Owner/Editor | STF-01, STF-39 |
| STF-05 | STF-05 Campaigns | `/staff/campaigns` | both | Editor, Owner | view: list/menu/calendar; role: Owner/Editor | STF-01, STF-06, STF-39 |
| STF-06 | STF-06 Campaign edit | `/staff/campaigns/[id]` | both | Editor, Owner | state: ready/invalid/conflict/offline/savefailed; role: Owner/Editor | OFR-01, STF-05, STF-08, STF-09 |
| STF-07 | Staff: customer preview | `/staff/campaigns/[id]/preview` | both | Editor, Owner | — | STF-06 |
| STF-08 | STF-08 Approvals | `/staff/approvals` | both | Owner | approver: off/on; role: Owner | STF-01, STF-09, STF-32 |
| STF-09 | STF-09 Approval detail | `/staff/approvals/[id]` | both | Owner | mode: review/rejecting/selfpublish; role: Owner | STF-08 |
| STF-10 | Staff: support content | `/staff/support-content` | both | Editor, Owner | — | STF-01 |
| STF-11 | STF-11 Value lookup | `/staff/lookup` | both | Front desk, Owner | state: phone/reference/notfound; role: Front desk/Owner | STF-01, STF-18, STF-25 |
| STF-12 | Staff: audit log | `/staff/audit` | both | Owner | — | STF-01 |
| STF-13 | STF-13 Team and roles | `/staff/team` | both | Owner | role: Owner | STF-01, STF-38 |
| STF-14 | Staff: no permission | `/staff/denied` | both | Editor, Front desk, Owner | — | STF-01 |
| STF-15 | STF-15 Packages | `/staff/packages` | both | Editor, Owner | view: all/archived/empty; role: Owner/Editor | STF-01, STF-16, STF-39 |
| STF-16 | STF-16 Package edit | `/staff/packages/[id]` | both | Editor, Owner | state: ready/invalid/live/conflict/offline/savefailed; role: Owner/Editor | STF-08, STF-09, STF-15, WAL-07 |
| STF-17 | STF-17 Gift-card settings | `/staff/gift-cards/settings` | both | Owner | state: ready/saved/invalid/conflict/offline/savefailed; role: Owner | STF-01, WAL-08 |
| STF-18 | STF-18 Gift-card actions | `/staff/gift-cards/[id]` | both | Front desk, Owner | state: found/sent/voided; role: Owner/Front desk | STF-11, STF-39 |
| STF-19 | STF-19 Promo codes | `/staff/promo-codes` | both | Editor, Owner | view: all/archived; role: Owner/Editor | STF-01, STF-20, STF-39 |
| STF-20 | STF-20 Promo code edit | `/staff/promo-codes/[id]` | both | Editor, Owner | state: ready/duplicate/invalid/conflict/offline/savefailed; role: Owner/Editor | OFR-03, STF-08, STF-09, STF-19 |
| STF-21 | STF-21 Professionals | `/staff/professionals` | both | Editor, Owner | view: all/archived; role: Owner/Editor | STF-01, STF-22, STF-39 |
| STF-22 | STF-22 Professional edit | `/staff/professionals/[id]` | both | Editor, Owner | state: ready/consent/live/conflict/offline/savefailed; role: Owner/Editor | STF-08, STF-09, STF-21, TRT-06 |
| STF-23 | STF-23 Today | `/staff/today` | both | Front desk, Owner | state: ready/empty; mode: handoff/inapp; role: Front desk/Owner | STF-01, STF-24 |
| STF-24 | STF-24 Request detail | `/staff/requests/[id]` | both | Front desk, Owner | state: pending/done; mode: handoff/inapp; role: Front desk/Owner | STF-23, STF-24 |
| STF-25 | STF-25 Counter redemption | `/staff/redeem` | both | Front desk, Owner | state: found/notenough/done; role: Front desk/Owner | STF-01, STF-25 |
| STF-26 | STF-26 Customer search | `/staff/customers` | both | Front desk, Owner | state: results/none; role: Front desk/Owner | STF-01, STF-27, STF-28 |
| STF-27 | STF-27 Customer profile | `/staff/customers/[id]` | both | Front desk, Owner | state: full/legacy; role: Front desk/Owner | STF-26, STF-28, STF-30 |
| STF-28 | STF-28 Account match check | `/staff/customers/[id]/match` | both | Front desk, Owner | state: match/partial/reject; role: Owner/Front desk | STF-27 |
| STF-29 | STF-29 Support inbox | `/staff/inbox` | both | Front desk, Owner | state: list/empty; role: Front desk/Owner | STF-01, STF-30 |
| STF-30 | STF-30 Message | `/staff/inbox/[id]` | both | Front desk, Owner | state: draft/sent/failed; role: Front desk/Owner | STF-27, STF-29 |
| STF-31 | STF-31 Clinic info | `/staff/settings/clinic` | both | Owner | state: ready/saved/overlap/conflict/offline/savefailed; role: Owner | STF-01, STF-23, SUP-01 |
| STF-32 | STF-32 Booking and payment rules | `/staff/settings/rules` | both | Owner | state: ready/changed/conflict/offline/savefailed; role: Owner | BKG-05, STF-01 |
| STF-33 | STF-33 Policies | `/staff/policies` | both | Editor, Owner | view: list/editor/history; role: Owner/Editor | ACC-11, STF-01, STF-08, STF-09, STF-33, STF-39 |
| STF-34 | STF-34 Home layout | `/staff/home-layout` | both | Editor, Owner | state: set/empty; role: Owner/Editor | Main, STF-01, STF-05, STF-08, STF-09 |
| STF-35 | STF-35 Push message | `/staff/push` | both | Owner | state: ready/scheduled/sent/noaudience/conflict/offline/savefailed; role: Owner | STF-01, STF-35 |
| STF-36 | STF-36 Media library | `/staff/media` | both | Editor, Owner | state: library/empty/uploading/rights; role: Owner/Editor | STF-01 |
| STF-37 | STF-37 Reports | `/staff/reports` | both | Owner | state: month/empty/loading; role: Owner | STF-01 |
| STF-38 | STF-38 Team member | `/staff/team/[id]` | both | Owner | state: active/invited/removed; role: Owner | STF-13, STF-39 |
| STF-39 | STF-39 Archive or delete | `(dialog) archive / delete / restore` | both | Editor, Owner | kind: archive/delete/restore; role: Owner/Editor | STF-02 |
| STF-40 | STF-40 FAQ editor | `/staff/services/[id]/faq` | both | Editor, Owner | state: ready/live/conflict/offline/savefailed; role: Owner/Editor | STF-03, STF-08, STF-09, TRT-05 |
| STF-41 | STF-41 Import: file and columns | `/staff/import` | both | Editor, Owner | state: mapped/missing; role: Owner/Editor | STF-02, STF-42 |
| STF-42 | STF-42 Import: review | `/staff/import/review` | both | Editor, Owner | state: review/conflicts/published; role: Owner/Editor | STF-02, STF-03, STF-08, STF-41, STF-42 |

## Staff tablet layouts

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| TAB-01 | TAB-01 Service edit (tablet) | — | — | — | role: Owner/Editor | STF-02, STF-07, STF-08, STF-09 |
| TAB-02 | TAB-02 Campaign edit (tablet) | — | — | — | role: Owner/Editor | OFR-01, STF-05, STF-08, STF-09 |
| TAB-03 | TAB-03 Package edit (tablet) | — | — | — | role: Owner/Editor | STF-08, STF-09, STF-15, WAL-07 |
| TAB-04 | TAB-04 Professional edit (tablet) | — | — | — | role: Owner/Editor | STF-08, STF-09, STF-21, TRT-06 |
| TAB-05 | TAB-05 Booking and payment rules (tablet) | — | — | — | role: Owner | STF-01 |
| TAB-06 | TAB-06 Push message (tablet) | — | — | — | role: Owner | STF-01 |
| TAB-07 | TAB-07 Import review (tablet) | — | — | — | role: Owner/Editor | STF-08, STF-09, STF-41 |

## Notification templates

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-01 | NTF-01 Booking confirmed | — | — | — | — | — |
| NTF-02 | NTF-02 Reminder | — | — | — | — | — |
| NTF-03 | NTF-03 Visit changed | — | — | — | — | — |
| NTF-04 | NTF-04 Cancelled, refund or credit | — | — | — | — | — |
| NTF-05 | NTF-05 Payment receipt | — | — | — | — | — |
| NTF-06 | NTF-06 Refund status | — | — | — | — | — |
| NTF-07 | NTF-07 Gift received | — | — | — | — | WEB-01 |
| NTF-08 | NTF-08 Gift scheduled or sent (buyer) | — | — | — | — | — |
| NTF-09 | NTF-09 Package session used | — | — | — | — | — |
| NTF-10 | NTF-10 Support reply | — | — | — | — | — |
| NTF-11 | NTF-11 Staff: request needs you | — | — | — | — | — |
| NTF-12 | NTF-12 Staff: approval needed | — | — | — | — | — |

## Mobile-web pages

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| WEB-01 | WEB-01 Gift claim (web) | `https://app.nanobeautystar.com/gift/[code]` | both | — | state: ready/code/error | WEB-01, WEB-02 |
| WEB-02 | WEB-02 Gift claimed (web) | `https://app.nanobeautystar.com/gift/[code]` | both | — | — | — |
| WEB-03 | WEB-03 Delete account (web) | `https://app.nanobeautystar.com/delete` | both | — | state: phone/code/error | WEB-03, WEB-04 |
| WEB-04 | WEB-04 Deletion requested (web) | `https://app.nanobeautystar.com/delete` | both | — | — | — |

## Motion prototypes

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| MOT-01 | Motion: tabs and filters | — | — | — | motion: normal/reduced | — |
| MOT-02 | Motion: slot selection | — | — | — | motion: normal/reduced | — |
| MOT-03 | Motion: booking confirmation | — | — | — | motion: normal/reduced | — |
| MOT-04 | Motion: payment result | — | — | — | motion: normal/reduced | — |
| MOT-05 | Motion: wallet reconciliation | — | — | — | motion: normal/reduced | — |
| MOT-06 | Motion: offer expiry | — | — | — | motion: normal/reduced | — |
| MOT-07 | Motion: publish and send back | — | — | — | motion: normal/reduced | — |
| MOT-08 | Motion: sheet dismissal | — | — | — | motion: normal/reduced | — |

## App icon

| Board | Title | Route | Mode | Roles | Tweaks (states) | Links to |
| --- | --- | --- | --- | --- | --- | --- |
| ICN-01 | App icon | — | — | — | — | — |

