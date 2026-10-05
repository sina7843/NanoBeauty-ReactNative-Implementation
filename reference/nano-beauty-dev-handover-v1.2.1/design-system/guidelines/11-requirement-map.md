# Requirement map

Which components carry which v1.1 requirements. Screens built from them inherit the IDs.

| Requirement IDs | Components |
|---|---|
| AUTH 01 guest access | ScreenGuestHome, TabBar, ServiceCard |
| AUTH 02–03 register, sign in, recovery | TextField, OTPInput, Button, AsyncStatus |
| AUTH 04, PRIV 05 profile | TextField, ListRow |
| AUTH 06, PRIV 04 deletion | ListRow (destructive), Dialog, AsyncStatus |
| AUTH 09–10, PRIV 02 consent, legal links | ConsentRow |
| AUTH 11, LEG 04 legacy match | OTPInput, AccountMatch, SupportContext |
| DISC 01, DISC 11 home | AppointmentPass, ListGroup, OfferCard, ScreenReturningHome |
| DISC 02–05 catalogue, search, concerns, filters | SearchField, Chip, Sheet, ServiceCard |
| DISC 06–07 detail, price clarity | PriceTag, PhotoFrame, ListRow, ScreenTreatmentDetail |
| DISC 10 empty/no result | EmptyState |
| BOOK 01–02 start, professional | BookingStepper, ProviderCard |
| BOOK 03–04 availability, hold | TimeSlotGrid, Banner |
| BOOK 05 intake | TextField, ConsentRow (minimal, pending clinical boundary) |
| BOOK 06–07 review, confirmation | BookingSummary, AsyncStatus, ScreenBookingReview |
| BOOK 08–12 manage, calendar, rebook | AppointmentPass, SegmentedControl, Dialog |
| BOOK 13–14 no quantity; purchase-to-book | ServiceCard, PackageBalance |
| PAY 01–05, PAY 12 methods, deposit | PaymentMethodRow, BookingSummary |
| PAY 06–09 idempotency, failure, receipts, refunds | AsyncStatus, Banner, ListRow |
| PROMO 01–09 campaigns | OfferCard, PublishState, ApprovalItem |
| WALT 01–04 gift cards | GiftCard, AsyncStatus |
| WALT 05–07 packages | PackageBalance |
| WALT 08, WALT 10–12 history, credit, reconciliation | CreditRow, ListRow, Banner, ScreenWallet |
| MEM 02–03, REWD 02 existing members/rewards | MemberStatus |
| SUP 01–04 support | SupportContext, ListRow |
| NOTIF 02–04 reminders, care, preferences | Switch, CareTimeline |
| ADMIN 01, 07 roles, environments | StaffBar, PermissionNotice |
| ADMIN 02–05 content management | TextField, PublishState, ListRow |
| ADMIN 03, 06, 08 approvals and audit | ApprovalItem, AuditEntry |
| ADMIN 09 value support | CreditRow, AuditEntry, SupportContext |
| ADMIN 10 content validation | PublishState, Banner |
| NFR 01 accessibility | all (see Accessibility) |
| NFR 09 offline | Banner (offline), Skeleton |

Deferred and deliberately absent: favourites/recent views (DISC 08), new membership enrollment, rewards earning, referrals, check-in, product commerce, Afterpay.
