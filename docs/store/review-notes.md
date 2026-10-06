# App Review notes and demo path (draft)

Paste into App Store Connect "App Review Information" and the Play Console "App access" section once the items marked
_tbd_ exist. Then set `contacts.reviewNotesReady: true` in `apps/mobile/release.json`.

## Sign-in for reviewers

Nano Beauty signs in with a mobile number and a 6-digit code by text. Reviewers can't receive our texts, so a
review-only number signs in with a fixed code:

- Mobile number: _tbd_ (set as `REVIEW_PHONE` on the production API while the review is open)
- Code: _tbd_ (`REVIEW_CODE`, 6 digits, not trivial)
- `REVIEW_EXPIRES`: end of the review window (at most 60 days ahead); after it the number gets real texts again.
- Use a number the clinic owns and that no customer uses. The code also works on the web gift and deletion pages for
  that number, so never send a gift to it. Remove all three values once the review is approved; the API logs a
  warning at start while they are set.

The review account should have: one upcoming visit (needs Fresha read-back, or explain below), one package with sessions
left, and one gift card, so Wallet and Visits aren't empty. Staff tools are not part of the review account.

## What to tell the reviewer

1. Booking happens in the clinic's booking system (Fresha). "Book" explains this, then opens Fresha in an in-app
   browser; coming back, the app checks whether the booking appeared. This is the clinic's chosen setup (no booking API
   exists), not a web wrapper: Wallet, Visits, reminders, offers, account and privacy controls are native.
2. Purchases in the app are packages and gift cards for services at the clinic (physical services → not in-app
   purchase). Payments go through _payment provider tbd_; no card data touches our servers.
3. Account deletion: Account → Privacy → Delete account (in app), or https://app.nanobeautystar.com/delete.
4. Push notifications are optional and asked for in context; offers are opt-in.

## Demo path

Home → Treatments → a treatment → Book (explains Fresha) → back → Wallet (package, gift card) → Account → Privacy →
Delete account (stop before confirming).

## Contact

Name, phone and email of the person App Review can call: _tbd_.
