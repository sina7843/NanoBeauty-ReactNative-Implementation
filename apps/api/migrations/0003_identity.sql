-- NANO-02 identity: customers (phone = identity, A6), OTP challenges, lockouts, rotating sessions,
-- append-only consents and audit, the server-side role → permission map (D34) and legacy match cases (AUTH 11).

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  email text,
  -- Set once the returning-customer check has been answered (AUT-05…07).
  match_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  provider_ref text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  resend_available_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX otp_challenges_phone_created ON otp_challenges (phone_e164, created_at);

-- AUT-08 "limited": codes paused for a phone number.
CREATE TABLE auth_locks (
  phone_e164 text PRIMARY KEY,
  locked_until timestamptz NOT NULL
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id),
  -- Only SHA-256 hashes of tokens are stored.
  access_hash text NOT NULL UNIQUE,
  access_expires_at timestamptz NOT NULL,
  refresh_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_refreshed_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text
);
CREATE INDEX sessions_customer ON sessions (customer_id);

-- Every refresh token ever rotated out. Presenting one again is a replay: the whole session is revoked.
CREATE TABLE used_refresh_tokens (
  hash text PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions (id),
  used_at timestamptz NOT NULL DEFAULT now()
);

-- AUTH 09 / PRIV 02: one row per decision; purpose, version, time and channel. Never updated or deleted.
CREATE TABLE consents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers (id),
  purpose text NOT NULL CHECK (purpose IN ('terms', 'transactional', 'marketing')),
  granted boolean NOT NULL,
  version text NOT NULL,
  channel text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consents_customer_purpose ON consents (customer_id, purpose, recorded_at DESC);

-- D34: authorization is data. "One role for everyone" is a row change, not a code change.
CREATE TABLE role_permissions (
  role text NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);
CREATE TABLE staff_roles (
  customer_id uuid NOT NULL REFERENCES customers (id),
  role text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, role)
);

-- Roles v2 (phase-7): Owner, Editor, Front desk.
INSERT INTO role_permissions (role, permission) VALUES
  ('Owner', 'today.view'), ('Owner', 'requests.manage'), ('Owner', 'inbox.manage'),
  ('Owner', 'value.redeem'), ('Owner', 'value.lookup'), ('Owner', 'giftcard.actions'), ('Owner', 'giftcard.void'),
  ('Owner', 'customers.view'), ('Owner', 'accountMatch.resolve'),
  ('Owner', 'content.draft'), ('Owner', 'content.publish'),
  ('Owner', 'selling.draft'), ('Owner', 'selling.publish'),
  ('Owner', 'giftcard.settings'), ('Owner', 'push.send'),
  ('Owner', 'professionals.draft'), ('Owner', 'professionals.publish'),
  ('Owner', 'policies.draft'), ('Owner', 'policies.publish'),
  ('Owner', 'clinic.manage'), ('Owner', 'rules.manage'), ('Owner', 'reports.view'),
  ('Owner', 'team.manage'), ('Owner', 'audit.view'),
  ('Editor', 'content.draft'), ('Editor', 'selling.draft'),
  ('Editor', 'professionals.draft'), ('Editor', 'policies.draft'),
  ('Front desk', 'today.view'), ('Front desk', 'requests.manage'), ('Front desk', 'inbox.manage'),
  ('Front desk', 'value.redeem'), ('Front desk', 'value.lookup'), ('Front desk', 'giftcard.actions'),
  ('Front desk', 'customers.view'), ('Front desk', 'accountMatch.resolve');

-- AUTH 11: the customer's answer and the clinic's decision. No value moves here (ledger work is separate).
CREATE TABLE legacy_match_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  state text NOT NULL CHECK (state IN ('matched', 'mismatch', 'notfound', 'unavailable')),
  decision text NOT NULL,
  legacy_ref text,
  status text NOT NULL CHECK (status IN ('awaiting_clinic', 'confirmed', 'rejected', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES customers (id),
  resolved_at timestamptz,
  resolution_reason text
);

-- Immutable audit trail: actor, role, item, field, old, new, reason, time, device.
CREATE TABLE audit_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  actor_roles text NOT NULL,
  item text NOT NULL,
  field text,
  old_value text,
  new_value text,
  reason text,
  device text,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;
CREATE TRIGGER consents_append_only BEFORE UPDATE OR DELETE ON consents FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER audit_entries_append_only BEFORE UPDATE OR DELETE ON audit_entries FOR EACH ROW EXECUTE FUNCTION reject_mutation();
