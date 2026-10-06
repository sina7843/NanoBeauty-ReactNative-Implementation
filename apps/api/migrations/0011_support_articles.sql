-- NANO-10 (ADMIN 05, STF-10): support articles (FAQ) get the same draft, publish, approval and archive model as
-- other content. Customers read only published, non-archived articles.
ALTER TABLE support_articles
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN draft jsonb,
  ADD COLUMN in_review boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN first_published_at timestamptz,
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN updated_at timestamptz;
UPDATE support_articles SET published_at = now(), first_published_at = now();

ALTER TABLE approvals DROP CONSTRAINT approvals_item_type_check;
ALTER TABLE approvals ADD CONSTRAINT approvals_item_type_check CHECK (item_type IN ('service', 'package', 'campaign', 'promo', 'professional', 'policy', 'article'));
