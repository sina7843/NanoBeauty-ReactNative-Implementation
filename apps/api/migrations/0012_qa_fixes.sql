-- NANO-12 QA pass.
-- API-15: a code is valid only for what it was asked for (signin, phone_change, deletion, gift_claim).
ALTER TABLE otp_challenges ADD COLUMN purpose text NOT NULL DEFAULT 'signin';
-- API-6: the seeded Halloween campaign is the Halloween template, so next year's can start from it (STF-06).
UPDATE campaigns SET template = 'halloween' WHERE id = 'cmp_halloween' AND template IS NULL;
