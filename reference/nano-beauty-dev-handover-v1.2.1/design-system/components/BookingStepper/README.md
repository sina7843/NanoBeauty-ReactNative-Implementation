# BookingStepper

Shows where the customer is in booking: "Step 3 of 5" plus a segmented progress track (BOOK 01–07).

**Props:** `steps` (labels in order), `current` (0-based).

Step names follow the approved journey: Service → Professional → Time → Details → Review. Skip steps that don't apply (a package redemption already knows the service) and recount. Screen readers hear "Step 3 of 5: Time". Focus moves to the new step's heading after each transition.
