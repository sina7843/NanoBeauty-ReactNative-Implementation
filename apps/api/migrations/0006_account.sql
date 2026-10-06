-- NANO-05: notification preferences, inbox read state, and tracked privacy requests (export and deletion).

-- ACC-03. Booking messages are transactional (not stored: always on); offers live in `consents` (marketing).
CREATE TABLE customer_preferences (
  customer_id uuid PRIMARY KEY REFERENCES customers (id),
  reminders boolean NOT NULL DEFAULT true,
  aftercare boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL
);

-- ACC-04/05: customer notifications double as the in-app inbox.
ALTER TABLE notifications ADD COLUMN read_at timestamptz;

-- When a deletion has been carried out the row stays (other records point at it) with every identifier removed.
ALTER TABLE customers ADD COLUMN deleted_at timestamptz;

-- ACC-07 export and ACC-08–10 / WEB-03–04 deletion. The id doubles as the unguessable status token.
CREATE TABLE privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  kind text NOT NULL CHECK (kind IN ('export', 'delete')),
  status text NOT NULL CHECK (status IN ('received', 'pending', 'completed', 'cancelled')),
  channel text NOT NULL CHECK (channel IN ('app', 'web')),
  -- Export destination only; cleared once the request is completed.
  email text,
  idempotency_key text,
  created_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  cancelled_at timestamptz,
  UNIQUE (customer_id, idempotency_key)
);
-- One open deletion per customer, so repeated taps or app + web can't stack requests.
CREATE UNIQUE INDEX privacy_requests_one_pending_delete ON privacy_requests (customer_id) WHERE kind = 'delete' AND status = 'pending';
CREATE INDEX privacy_requests_due ON privacy_requests (due_at) WHERE status = 'pending';
