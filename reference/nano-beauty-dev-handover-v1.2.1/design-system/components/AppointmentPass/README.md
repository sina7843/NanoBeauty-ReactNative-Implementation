# AppointmentPass

The signed-in customer's next visit, at the top of Home and in Appointments (DISC 01, BOOK 08, BOOK 11).

**Props:** `service`, `date`, `time`, `provider`, `location` (default: the verified address 555 6th St #130, New Westminster), `status` (`confirmed`, `pending`, `changed`, `cancelled`, `completed`, `noshow`), `compact`, `sample`, `eyebrow` (the small label; default “Next appointment”, use “Upcoming”, “Your visit” or “Past visit” elsewhere).

**Behaviour:** "Add to calendar" uses the system event sheet without full calendar permission (BOOK 11). "Manage" opens reschedule/cancel with the policy first (BOOK 09–10). On the lock screen and in notifications, show only time and "Nano Beauty", not the treatment (DISC 01).

**Status** is from the booking source; the pass never says "Confirmed" before the clinic system does.
