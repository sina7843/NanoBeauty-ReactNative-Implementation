-- NANO-08 staff selling, operations, settings and reports. Packages, campaigns, promo codes, professionals and
-- policies share the NANO-07 draft model: live columns for customers, a versioned `draft` for staff, approvals,
-- archive rules (D36) and audit.

ALTER TABLE packages
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz;
UPDATE packages SET published_at = now() WHERE status IN ('live', 'unavailable', 'archived');
UPDATE packages SET archived_at = now() WHERE status = 'archived';
-- New packages start as drafts nobody can buy.
ALTER TABLE packages DROP CONSTRAINT packages_status_check;
ALTER TABLE packages ADD CONSTRAINT packages_status_check CHECK (status IN ('draft', 'live', 'unavailable', 'archived'));

ALTER TABLE campaigns
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz,
  -- STF-06 templates ("Halloween", "Black Friday"…) so next year's can start from this one.
  ADD COLUMN template text;
UPDATE campaigns SET published_at = now() WHERE published;

ALTER TABLE promo_codes
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz,
  -- Published at least once: a draft (never-published) code answers "invalid" to customers.
  ADD COLUMN live boolean NOT NULL DEFAULT true,
  -- {type: percent|amount, value}: percent = whole percent (1–100); amount = integer cents.
  ADD COLUMN discount jsonb;
UPDATE promo_codes SET published_at = now();
UPDATE promo_codes SET archived_at = now() WHERE archived;
-- Discounts for the sample codes, as their descriptions state; staff replace them with the clinic's real codes.
UPDATE promo_codes SET discount = CASE code
  WHEN 'GLOW25' THEN '{"type":"percent","value":15}'::jsonb
  WHEN 'HALLO26' THEN '{"type":"percent","value":20}'::jsonb
  WHEN 'WELCOME20' THEN '{"type":"amount","value":2000}'::jsonb
  WHEN 'BFRIDAY' THEN '{"type":"percent","value":25}'::jsonb
  WHEN 'HALLO25' THEN '{"type":"percent","value":20}'::jsonb
END WHERE discount IS NULL;

ALTER TABLE professionals
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz,
  -- Hidden = not shown or choosable in the app; booked visits keep the name (STF-21).
  ADD COLUMN hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN status text NOT NULL DEFAULT 'live' CHECK (status IN ('draft', 'live', 'archived'));
UPDATE professionals SET published_at = now();

ALTER TABLE policies
  ADD COLUMN revision integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz;
UPDATE policies SET published_at = now();
-- The engine's optimistic-lock column; `version` stays the human version label ("1.0", "v3").
ALTER TABLE policies RENAME COLUMN version TO version_label;
ALTER TABLE policies RENAME COLUMN revision TO version;

-- STF-33: every published wording stays in the history.
CREATE TABLE policy_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  policy_id text NOT NULL REFERENCES policies (id),
  version_label text NOT NULL,
  title text NOT NULL,
  sections jsonb NOT NULL,
  change_note text,
  published_at timestamptz NOT NULL,
  published_by uuid
);
INSERT INTO policy_versions (policy_id, version_label, title, sections, change_note, published_at)
  SELECT id, version_label, title, sections, 'First version', COALESCE(updated_on::timestamptz, now()) FROM policies;

ALTER TABLE approvals DROP CONSTRAINT approvals_item_type_check;
ALTER TABLE approvals ADD CONSTRAINT approvals_item_type_check CHECK (item_type IN ('service', 'package', 'campaign', 'promo', 'professional', 'policy'));
ALTER TABLE approvals ADD COLUMN item_name text;

-- STF-29/30 replies to Ask-us questions.
ALTER TABLE support_questions DROP CONSTRAINT IF EXISTS support_questions_status_check;
ALTER TABLE support_questions ADD CONSTRAINT support_questions_status_check CHECK (status IN ('new', 'in_progress', 'waiting', 'done'));
CREATE TABLE support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES support_questions (id) ON DELETE CASCADE,
  author_id uuid,
  channel text NOT NULL CHECK (channel IN ('text', 'email', 'app')),
  message text NOT NULL,
  -- pending = claimed by this idempotency key, send in progress (a double tap can't send twice).
  delivery text NOT NULL CHECK (delivery IN ('pending', 'sent', 'failed')),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL
);

-- STF-35. Delivery (push vendor, quiet hours, per-device) is NANO-09; this is the composed, audience-checked message.
CREATE TABLE push_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  opens text NOT NULL,
  send_at timestamptz NOT NULL,
  -- Audience size when scheduled (opted-in customers only); recomputed at delivery.
  audience_count integer NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'sent')),
  created_by uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 1
);

-- Once published, always "seen by customers": restore doesn't make an item deletable again (D36) and a restored item's
-- price/terms changes still count as high-risk (D35).
ALTER TABLE packages ADD COLUMN first_published_at timestamptz;
ALTER TABLE campaigns ADD COLUMN first_published_at timestamptz;
ALTER TABLE promo_codes ADD COLUMN first_published_at timestamptz;
ALTER TABLE professionals ADD COLUMN first_published_at timestamptz;
ALTER TABLE policies ADD COLUMN first_published_at timestamptz;
UPDATE packages SET first_published_at = published_at;
UPDATE campaigns SET first_published_at = published_at;
UPDATE promo_codes SET first_published_at = published_at;
UPDATE professionals SET first_published_at = published_at;
UPDATE policies SET first_published_at = published_at;
