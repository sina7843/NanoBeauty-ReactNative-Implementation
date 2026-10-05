# Data model — DRAFT for the tech lead

**Status: draft, not a design decision.** Derived from the boards, `fixtures.json` and specs 1–5 so Claude Code doesn't invent entities screen by screen. The tech lead owns the real schema, names and API. Change freely; keep the behaviours in the "Rules" column.

| Entity | Key fields (indicative) | Used by | Rules |
| --- | --- | --- | --- |
| Clinic | name, address, phone, hours (weekly), closures (dates), parking, directions link | SUP-01, STF-31 | Single clinic |
| Settings | see spec 1 / `fixtures.json → settings` (bookingMode, deposit, freeChangeHours, lateCancelOutcome, slotHoldMinutes, paymentMethods, financingLine, gift, consultation, secondApprover, ratingLine, giftRefundDays, deletionGraceDays) | all customer flows, STF-17/31/32/34 | Versioned; changes apply to new bookings only; audit |
| StaffMember | user ref, name, roles[], status (invited/active/removed) | STF-13, 38 | Permissions from a server-side role → action map (D34) |
| Customer | phone (verified, identity), name, email, consents[], notification prefs, legacy match status | AUT, ACC, STF-26/27 | No clinical data |
| Consent | type (terms, texts, offers, analytics), version, accepted at | AUT-03, ACC-06 | Append-only |
| Category / Concern | name, order, archived | TRT-01/02, STF-04 | Category deletable only if empty |
| Service | name, category, concerns[], description, preparation, aftercare, price kind (fixed, from, range, per unit, per area, consultation), price, duration, professionals[], deposit rule, photos[], visibility, FAQ[], publish state, version | TRT, BKG, STF-02/03/40 | Archive not delete; high-risk fields (price, price type) follow approval setting |
| Area (per-area pricing) | service, name, set (women/men), price | BKG-10, TRT-05 | Public list prices in fixtures are Sample |
| Professional | name, title, bio, photo, services[], visible, consent on file | TRT-06, STF-21/22 | Show only with consent |
| Appointment / Visit | ref, services[], professional, start, status (confirmed, awaiting clinic, change requested, cancelled, completed, missed), source (Fresha sync / in-app), deposit | HOM, VIS, STF-23 | Hand-off: confirmed only after Fresha reports it |
| VisitRequest | visit, type (late change, cancel, question), status, staff notes, outcome | VIS-06, STF-23/24 | Client notified of outcome |
| Payment / Receipt | context (deposit, package, gift), method, amount, tax, status, provider ref, idempotency key | PAY, WAL-06 | Retry never double-charges |
| LedgerEntry | customer, kind (credit, gift card, package session), amount / sessions, reason, ref, actor | WAL, STF-11/18/25 | Balances are computed from the ledger; adjustments audited |
| PackageProduct / OwnedPackage | treatment, sessions, price, regular value, validity, terms / sessions left, expiry | WAL-03/07, STF-15/16 | Archived product stays usable for owners |
| GiftCard | code (masked), amount, balance, design, buyer, recipient (phone/email), message, send at, status (scheduled, sent, claimed, void) | WAL-04/08–11, WEB-01/02, STF-17/18 | No expiry (BC) |
| PromoCode | code, discount, eligible items, per-person and total limits, dates, status | OFR-03, STF-19/20 | |
| Campaign / Offer | title, image, body, discount, promo code, audience, eligible items, dates (PT), Home placement, push toggle, template, status | HOM, OFR, STF-05/06/34 | Max two offers on Home |
| PushMessage | audience (opted-in only), text, link, schedule, status | STF-35 | Marketing consent required; quiet hours |
| PolicyDocument | type (cancellation, deposit, refund, terms, privacy), version, body, status | ACC-11, STF-33 | Old versions kept |
| MediaItem | file, alt text, rights confirmed, used by | STF-36 | Can't publish without alt text and rights |
| SupportThread / Message | customer, topic, context ref, channel, messages[], status (new, in progress, waiting, done) | SUP-03/04, WAL-12, STF-29/30, ACC-04/05 | |
| LegacyMatchCase | customer, old-app record, match level, decision, actor | AUT-05–07, STF-28 | Value moves only after staff confirm |
| ImportJob | file, column map, rows (new, changed, duplicate, conflict), published rows | STF-41/42 | |
| AuditEntry | actor, role, item, field, old, new, reason, time, device | STF-12, all staff writes | Immutable |
| NotificationTemplate | id (NTF-01–12), channels, trigger, copy, deep link, transactional/marketing | spec 3 | |
