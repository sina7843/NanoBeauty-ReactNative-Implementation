-- NANO-06: packages, orders, payment attempts, provider events, refunds, wallet instruments and the ledger.
-- Money is integer cents. Balances are always SUM(ledger); nothing stores a balance that could drift.

CREATE TABLE packages (
  id text PRIMARY KEY,
  name text NOT NULL,
  service_id text REFERENCES services (id),
  sessions integer NOT NULL CHECK (sessions > 0),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  regular_cents integer,
  validity_months integer,
  -- archived packages are no longer sold; instruments already bought stay usable (WALT 05/06).
  status text NOT NULL CHECK (status IN ('live', 'unavailable', 'archived')),
  terms jsonb NOT NULL DEFAULT '[]',
  sort integer NOT NULL,
  sample boolean NOT NULL DEFAULT true
);

-- WAL-07 sample list ("Packages and prices wait for the clinic's list").
INSERT INTO packages (id, name, service_id, sessions, price_cents, regular_cents, validity_months, status, terms, sort) VALUES
  ('pkg_sqt_4', 'SQT Bio-Microneedling · 4 sessions', 'svc_sqt', 4, 120000, 140000, 12, 'live',
   '["Each visit uses one session.", "Use within 12 months of purchase.", "[Clinic to confirm transfer and refund rules.]"]', 1),
  ('pkg_laser_underarms_6', 'Laser · Underarms · 6 sessions', 'svc_laser', 6, 37800, 42000, 12, 'live',
   '["Each visit uses one session.", "Use within 12 months of purchase.", "[Clinic to confirm transfer and refund rules.]"]', 2),
  ('pkg_rf_3', 'Secret RF · 3 sessions', 'svc_rf', 3, 81000, NULL, 9, 'live',
   '["Each visit uses one session.", "Use within 9 months of purchase.", "[Clinic to confirm transfer and refund rules.]"]', 3),
  ('pkg_laser_fullleg_6', 'Laser · Full leg and feet · 6 sessions', 'svc_laser', 6, 135000, NULL, 12, 'unavailable',
   '["Each visit uses one session.", "Use within 12 months of purchase."]', 4);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  kind text NOT NULL CHECK (kind IN ('package', 'gift')),
  package_id text REFERENCES packages (id),
  -- Gift details as ordered (design, recipient, message, send time).
  gift jsonb,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'partially_refunded')),
  paid_attempt_id uuid,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  paid_at timestamptz,
  UNIQUE (customer_id, idempotency_key)
);

CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders (id),
  method text NOT NULL CHECK (method IN ('card', 'apple_pay', 'google_pay', 'klarna', 'affirm')),
  provider_ref text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('requires_action', 'processing', 'succeeded', 'declined', 'cancelled')),
  redirect_url text,
  failure_reason text,
  -- Brand and last four only, as reported by the provider. Never a card number.
  card_brand text,
  card_last4 text CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
  amount_cents integer NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (order_id, idempotency_key)
);
-- One live attempt per order: a retry first settles or cancels the previous one.
CREATE UNIQUE INDEX payment_attempts_one_open ON payment_attempts (order_id) WHERE status IN ('requires_action', 'processing');
ALTER TABLE orders ADD CONSTRAINT orders_paid_attempt FOREIGN KEY (paid_attempt_id) REFERENCES payment_attempts (id);

-- Every webhook delivery is recorded once; a duplicate event id is acknowledged and ignored (PAY 06).
CREATE TABLE provider_events (
  event_id text PRIMARY KEY,
  provider_ref text NOT NULL,
  type text NOT NULL,
  received_at timestamptz NOT NULL
);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  attempt_id uuid NOT NULL REFERENCES payment_attempts (id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  reason text NOT NULL,
  provider_ref text UNIQUE,
  requested_by uuid REFERENCES customers (id),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE wallet_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL for a gift card nobody has claimed yet.
  customer_id uuid REFERENCES customers (id),
  kind text NOT NULL CHECK (kind IN ('credit', 'package', 'gift_card', 'membership')),
  label text NOT NULL,
  source text NOT NULL CHECK (source IN ('purchase', 'gift', 'clinic', 'legacy')),
  status text NOT NULL CHECK (status IN ('active', 'reconciling', 'voided')),
  package_id text REFERENCES packages (id),
  expires_at timestamptz,
  order_id uuid UNIQUE REFERENCES orders (id),
  -- Gift cards: only a hash of the code is stored, plus the last four for display.
  code_hash text UNIQUE,
  code_last4 text,
  buyer_id uuid REFERENCES customers (id),
  recipient_name text,
  recipient_phone text,
  message text,
  design text,
  send_at timestamptz,
  sent_at timestamptz,
  delivery text CHECK (delivery IN ('scheduled', 'sent', 'failed', 'cancelled')),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL
);
-- One clinic-credit instrument per customer.
CREATE UNIQUE INDEX wallet_one_credit ON wallet_instruments (customer_id) WHERE kind = 'credit';

-- WALT 11: the authoritative record. Append-only; corrections are new entries ('reverse', 'adjust').
CREATE TABLE ledger_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instrument_id uuid NOT NULL REFERENCES wallet_instruments (id),
  kind text NOT NULL CHECK (kind IN ('purchase', 'issue', 'redeem', 'refund', 'adjust', 'expire', 'reverse', 'import')),
  amount_cents integer,
  sessions integer,
  label text NOT NULL,
  reference text,
  order_id uuid REFERENCES orders (id),
  actor_id uuid REFERENCES customers (id),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK ((amount_cents IS NULL) <> (sessions IS NULL)),
  -- A retried redemption/adjustment/refund can only ever land once.
  UNIQUE (instrument_id, idempotency_key)
);
CREATE TRIGGER ledger_entries_append_only BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- WAL-12: a balance question to the clinic. The balance doesn't change while they look.
CREATE TABLE balance_help_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  instrument_id uuid NOT NULL REFERENCES wallet_instruments (id),
  expected text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (customer_id, idempotency_key)
);

INSERT INTO role_permissions (role, permission) VALUES ('Owner', 'value.adjust'), ('Owner', 'payments.refund');
