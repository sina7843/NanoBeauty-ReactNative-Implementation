-- Spec 1 (D37) settings, D33/D35/D38 flags and clinic info as one versioned row.
-- Values are the handover samples (fixtures.json -> settings/clinic); `sample: true` keeps Sample badges on.
CREATE TABLE app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version integer NOT NULL CHECK (version > 0),
  settings jsonb NOT NULL,
  features jsonb NOT NULL,
  clinic jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id, version, settings, features, clinic) VALUES (
  1,
  1,
  '{
    "bookingMode": "handoff",
    "deposit": { "amountCAD": 50, "overCAD": 150 },
    "freeChangeHours": 48,
    "lateCancelOutcome": "credit",
    "lateChangeOutcome": "credit",
    "noShowOutcome": "keepDeposit",
    "slotHoldMinutes": 10,
    "slotHoldWarningMinutes": 2,
    "paymentMethods": { "card": true, "applePay": false, "googlePay": false, "klarna": false, "affirm": false },
    "financingLine": { "on": false, "minCAD": 500 },
    "gift": {
      "presetsCAD": [50, 100, 150, 200],
      "customRangeCAD": [25, 500],
      "expiry": null,
      "designs": ["thanks", "birthday", "holiday", "love"]
    },
    "consultation": { "priceCAD": 20, "credited": true },
    "secondApprover": { "on": false, "fields": ["price", "policy", "offerTerms"] },
    "clinicHours": null,
    "ratingLine": { "on": false, "source": "Fresha" },
    "giftRefundDays": 14,
    "deletionGraceDays": 30,
    "sample": true
  }'::jsonb,
  '{ "legacyMembership": false }'::jsonb,
  '{
    "name": "Nano Beauty",
    "address": "555 6th St #130, New Westminster, BC V3L 5H1",
    "timezone": "America/Vancouver",
    "phone": null,
    "parking": null,
    "directionsUrl": null,
    "supportReplyTime": "1 business day"
  }'::jsonb
);
