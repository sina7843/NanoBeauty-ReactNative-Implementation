# Nano Beauty App — Phase 4 Usability Test Plan

Sep 25, 2026 · @Dragon

## Goals, participants and setup

Five 20-minute sessions with clients and two with staff will show whether people can find, book, pay, manage a visit and trust their balances without help. The Phase 4 gate passes when no critical task fails twice.

What we want to learn:

- Do the four tab names (Home, Treatments, Visits, Wallet) say where things are?
- Can a new client book and pay a deposit, and do they understand the 48-hour rule?
- Do returning clients trust what the app says about their credit, package and gift card?
- Can staff publish safely: submit, approve, send back with a reason, without publishing by mistake?

| Group | How many | Who | Recruit through |
| --- | --- | --- | --- |
| New clients | 2 | Never visited Nano Beauty; aged 25–55; book beauty services on a phone | Friends of clients, the clinic's Instagram |
| Returning clients | 3 | At least 2 visits; at least 1 with a package, credit or gift card | Clinic front desk |
| Staff | 2 | One content editor (Maria), one approver (Naz) | Clinic team |

Setup:

- Run in person at the clinic or on a video call with screen share. The participant uses the prototype on a phone: open the design canvas, pick a board and press Play.
- One facilitator reads the script; one note-taker fills the note sheet. Record the screen only, with consent.
- Offer clients a $25 clinic credit for their time (clinic to approve).
- Plan one week: recruit on days 1–2, sessions on days 3–4, findings and fixes on day 5.

## Session script

The facilitator reads the words in quotes; everything else is a cue. Keep to 20 minutes.

1. **Welcome (2 min).** “Thanks for helping. We're testing the new Nano Beauty app, not you, so there are no wrong answers. Please think out loud as you go. Some screens are samples and some buttons won't work; I'll tell you if you hit one. Is it OK if we record the screen, not your face?”
2. **Warm-up (2 min).** “How do you book a treatment today? What do you like or dislike about it?”
3. **Tasks (13 min).** Read one task at a time from the next section. Don't help unless they're stuck for 60 seconds; then say “What would you try next?” once. If still stuck, mark the task failed and move on.
4. **After each task.** “On a scale of 1 to 5, how easy was that?” and “Was anything surprising?”
5. **Wrap-up (3 min).** “If you could change one thing, what would it be?” “Where would you look for your gift card balance?” “What do you think Visits and Wallet contain?”
6. **Thank them.** Note the credit or thank-you, stop recording.

Never explain the design during a task. Questions like “Where do I tap?” get “Where would you expect it to be?”

## Client tasks

New clients do tasks 1–4; returning clients do 3–7. Critical tasks (C) must pass for the gate.

| # | Task read to the participant | Start board | Success when they… | Critical |
| --- | --- | --- | --- | --- |
| 1 | “Your skin feels less firm than it used to. Find a treatment that might help and see what it costs.” | HOM-01 | Reach a skin-tightening treatment detail and read the From price | C |
| 2 | “Book that treatment with anyone available next Thursday afternoon.” | TRT-05 | Reach Review with a Thursday time and say what they pay now vs at the visit ($50 / $300) | C |
| 3 | “You have an appointment coming up. Find when it is and what to do before it.” | HOM-02 | Name the date and time, open preparation | C |
| 4 | “Something came up. Can you move your visit? Would it cost you anything?” | VIS-02 | Reach Reschedule and explain the 48-hour rule in their words | C |
| 5 | “Check how much credit and how many laser sessions you have left.” | HOM-02 | Say $40 credit and 3 of 6 sessions | C |
| 6 | “A friend's birthday is next week. Send her a $100 gift card by text, to arrive that morning.” | WAL-01 | Reach the gift review with $100, text and a scheduled time |  |
| 7 | “You think your gift card should have $115, not $95. What would you do?” | WAL-04 | Reach Balance help or contact the clinic with the reference | C |

Also ask each returning client: “Does anything here look different from the old app in a way that worries you?”

## Staff tasks

Maria (content editor) does tasks 8–9; Naz (approver) does 10–12. All are critical: a staff mistake here reaches every client.

| # | Task read to the participant | Start board | Success when they… |
| --- | --- | --- | --- |
| 8 | “Change the HIFU price to $320 and send it for approval.” | STF-01 | Edit the price, fill the missing duration, submit, and say clients won't see it yet |
| 9 | “Set up a winter facials offer from 1 to 30 November and check how clients will see it.” | STF-05 | Notice the end-date error, fix it, open the customer preview |
| 10 | “A price change is waiting. Decide whether to approve it.” | STF-08 | Open it, compare before and after, approve |
| 11 | “The holiday gift card change has a mistake. Send it back.” | STF-09 | Send back with a reason; explain nothing was published |
| 12 | “A client says $20 is missing from her gift card. Find out what happened.” | STF-11 | Find the $20 redemption on 12 Sep and propose a fix for finance |

After the staff tasks ask: “Is there anything you'd be afraid of pressing by accident?”

## Note sheet and scoring

The note-taker fills one row per task per participant. Send the sheets to Claude after the sessions; Claude groups the findings, proposes fixes and updates the affected boards.

```csv
Participant,Group,Task,Result (pass / help / fail),Time (s),Ease 1-5,Where they got stuck,Quote
P1,New client,1,,,,,
P1,New client,2,,,,,
```

How each finding is scored:

| Severity | Meaning | What happens |
| --- | --- | --- |
| Critical | A critical task failed, or someone believed they booked, paid or published when they hadn't | Fix and re-test before Phase 6 sign-off |
| Major | Needed help, or took over twice the typical time | Fix in the design, check with the next participant |
| Minor | Hesitation, wording confusion | Collect; fix in batch |

The gate passes when no critical task fails for two or more participants in a group, and every critical finding has a fix on the canvas.
