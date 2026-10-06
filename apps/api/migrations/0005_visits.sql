-- NANO-04: Fresha hand-off sessions, visits (synced from Fresha when a connector exists), visit requests
-- (late change / cancel → clinic queue, BOOK 18) and a notification outbox (delivery in NANO-09).

CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id),
  -- The booking source's own reference (Fresha booking id / clinic ref). One row per source booking.
  external_ref text NOT NULL,
  source text NOT NULL CHECK (source IN ('fresha_sync', 'inapp')),
  service_id text REFERENCES services (id),
  service_name text NOT NULL,
  detail text,
  professional_name text,
  starts_at timestamptz NOT NULL,
  duration_min integer,
  -- Status as reported by the booking source; the app never upgrades it on its own.
  status text NOT NULL CHECK (status IN ('confirmed', 'pending', 'changed', 'cancelled', 'completed', 'noshow')),
  deposit_cad numeric(10, 2),
  synced_at timestamptz NOT NULL,
  -- When the app first saw this booking; the hand-off return check only counts bookings first seen after it.
  first_seen_at timestamptz NOT NULL,
  UNIQUE (customer_id, external_ref)
);
CREATE INDEX visits_customer_start ON visits (customer_id, starts_at);

-- A hand-off to Fresha. Never a booking: it only lets the return check look for evidence afterwards.
CREATE TABLE booking_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id),
  items jsonb NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  -- First return check (the person is back from Fresha); the "checking" window runs from here.
  first_checked_at timestamptz,
  -- At most one hand-off claims a booking, so two hand-offs can't both report the same visit as theirs.
  matched_visit_id uuid UNIQUE REFERENCES visits (id),
  UNIQUE (customer_id, idempotency_key)
);

CREATE TABLE visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  visit_id uuid NOT NULL REFERENCES visits (id),
  customer_id uuid NOT NULL REFERENCES customers (id),
  type text NOT NULL CHECK (type IN ('change', 'cancel')),
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted', 'in_progress', 'approved', 'declined', 'call_needed', 'done')),
  decline_reason text,
  staff_note text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  resolved_by uuid REFERENCES customers (id),
  UNIQUE (customer_id, idempotency_key)
);
-- At most one open request per visit, so retries and repeat taps can't flood the queue.
CREATE UNIQUE INDEX visit_requests_one_open ON visit_requests (visit_id) WHERE status IN ('submitted', 'in_progress', 'call_needed');

-- Notification hooks write here; NANO-09 delivers (channels, consent, quiet hours, device tokens).
CREATE TABLE notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  audience text NOT NULL CHECK (audience IN ('customer', 'staff')),
  customer_id uuid REFERENCES customers (id),
  -- For staff notices: the permission a recipient must hold (D34), not a role name.
  permission text,
  template text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  delivered_at timestamptz
);
