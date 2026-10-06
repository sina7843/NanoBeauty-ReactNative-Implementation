-- NANO-07 staff content governance: versioned services and categories with drafts, approvals (D35), media library
-- (STF-36), catalogue import (STF-41/42) and team invites (STF-13/38). Customers only ever read live fields.

-- Services: live columns are what customers see. Staff edits go to `draft` until published (STF-03, STF-40).
ALTER TABLE services
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  -- Who last saved the draft (no foreign key: catalogue rows outlive staff records; the audit log names the actor).
  ADD COLUMN draft_by uuid,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  -- Set once when first published; a service never published can be deleted (D36), others only archived.
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz;
UPDATE services SET published_at = now() WHERE status IN ('live', 'unavailable', 'archived');

ALTER TABLE categories
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN created_at timestamptz,
  -- A category that customers have seen is archived, not deleted.
  ADD COLUMN published_at timestamptz;
UPDATE categories SET published_at = now();

-- STF-08/09. One waiting approval per item; the approver is never the submitter.
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('service')),
  item_id text NOT NULL,
  submitted_by uuid NOT NULL REFERENCES customers (id),
  -- High-risk fields that changed (price, policy, offerTerms), for the reviewer and the second-approver rule.
  fields text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL,
  status text NOT NULL CHECK (status IN ('waiting', 'approved', 'rejected', 'withdrawn')),
  reason text,
  decided_by uuid REFERENCES customers (id),
  created_at timestamptz NOT NULL,
  decided_at timestamptz
);
CREATE UNIQUE INDEX approvals_one_waiting ON approvals (item_type, item_id) WHERE status = 'waiting';

-- STF-36. Development storage keeps the bytes here; a production object store replaces `bytes` (open item).
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes bytea NOT NULL,
  size_bytes integer NOT NULL,
  width integer,
  height integer,
  alt_text text,
  rights_confirmed boolean NOT NULL DEFAULT false,
  -- draft = not usable yet (alt text or rights missing); active = usable; archived.
  status text NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid NOT NULL REFERENCES customers (id),
  created_at timestamptz NOT NULL
);

-- STF-41/42.
CREATE TABLE catalog_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES customers (id),
  filename text NOT NULL,
  header text[] NOT NULL,
  rows jsonb NOT NULL,
  mapping jsonb,
  -- Duplicate choices by row index: keep | replace | both | skip.
  decisions jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  result jsonb,
  created_at timestamptz NOT NULL,
  published_at timestamptz
);

-- STF-13/38. Access is granted when the invited number signs in (identity = phone, A6).
CREATE TABLE staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  roles text[] NOT NULL,
  invited_by uuid NOT NULL REFERENCES customers (id),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz
);
CREATE UNIQUE INDEX staff_invites_one_open ON staff_invites (phone_e164) WHERE accepted_at IS NULL AND revoked_at IS NULL;
