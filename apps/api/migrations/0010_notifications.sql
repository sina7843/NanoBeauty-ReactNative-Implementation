-- NANO-09 notification delivery (spec 3, NOTIF 01–07), push devices, the single reminder sender and the analytics
-- consent. The `notifications` outbox written since NANO-04 is now delivered by the dispatcher.

-- NOTIF 07 / E6: Fresha already sends reminders, so it stays the sender until the clinic switches it (STF-32).
UPDATE app_settings
   SET settings = settings || '{"reminderSender": "fresha", "reminderHours": [48, 3], "quietHours": {"start": "21:00", "end": "08:00"}}'::jsonb,
       version = version + 1,
       updated_at = now();

-- Spec 4 "Usage" events need their own opt-in (ACC-06); terms, booking texts and offers stay as they were.
ALTER TABLE consents DROP CONSTRAINT consents_purpose_check;
ALTER TABLE consents ADD CONSTRAINT consents_purpose_check CHECK (purpose IN ('terms', 'transactional', 'marketing', 'analytics'));

-- A dedupe key makes a trigger idempotent (one reminder per visit and timing, one "booking confirmed" per visit).
ALTER TABLE notifications
  ADD COLUMN dedupe_key text UNIQUE,
  -- Set while a text or push waits for quiet hours to end.
  ADD COLUMN next_attempt_at timestamptz;
CREATE INDEX notifications_undelivered ON notifications (created_at) WHERE delivered_at IS NULL;

-- One row per recipient and channel: what was sent, what failed and what was skipped and why (delivery state).
CREATE TABLE notification_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_id bigint NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
  -- Customer or staff member; no foreign key so staff deliveries survive a staff record's removal.
  recipient_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  -- pending = claimed by a dispatcher run that is sending it now; never sent twice, even across instances.
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  reason text,
  created_at timestamptz NOT NULL,
  UNIQUE (notification_id, recipient_id, channel)
);

CREATE TABLE push_devices (
  token text PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL
);
CREATE INDEX push_devices_customer ON push_devices (customer_id);

-- STF-35 delivery results (audience is re-checked at send time).
ALTER TABLE push_messages
  ADD COLUMN sent_at timestamptz,
  ADD COLUMN sent_count integer;
