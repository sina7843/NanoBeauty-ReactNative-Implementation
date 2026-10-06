-- NANO-03 public content: catalogue (DISC 02–07, 09, 12), campaigns and promo codes (PROMO 02–06, 09, 11),
-- support articles and policies (SUP 01–06, ACC-11) and Ask-us questions (SUP 05).
-- Every seeded value is sample content from the handover fixtures/boards and is flagged `sample` until the clinic
-- publishes real content through the staff workspace (NANO-07/08). Prices are the public sample prices.

CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  photo text,
  sort integer NOT NULL,
  archived boolean NOT NULL DEFAULT false
);

CREATE TABLE concerns (
  id text PRIMARY KEY,
  name text NOT NULL,
  sort integer NOT NULL,
  -- Position among the Home "What would you like to work on?" chips; NULL = not on Home.
  home_rank integer
);

CREATE TABLE professionals (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text,
  bio text,
  photo text,
  -- Profile page, photo and bio only with written consent on file (C5).
  profile_consent boolean NOT NULL DEFAULT false,
  sample boolean NOT NULL DEFAULT true
);

CREATE TABLE services (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES categories (id),
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  concerns text[] NOT NULL DEFAULT '{}',
  description text,
  -- PriceTag props: kind fixed|from|range|perUnit|consultation (+ amount/min/max/unit).
  price jsonb NOT NULL,
  duration_label text,
  duration_min integer,
  per_area boolean NOT NULL DEFAULT false,
  areas jsonb,
  photo text,
  -- live = bookable; unavailable = visible but not bookable (TRT-07); archived = old links only; draft = hidden.
  status text NOT NULL CHECK (status IN ('draft', 'live', 'unavailable', 'archived')),
  professionals text[] NOT NULL DEFAULT '{}',
  faq jsonb NOT NULL DEFAULT '[]',
  care jsonb NOT NULL DEFAULT '[]',
  suitability_article text,
  sort integer NOT NULL,
  sample boolean NOT NULL DEFAULT true
);

CREATE TABLE campaigns (
  id text PRIMARY KEY,
  eyebrow text NOT NULL,
  title text NOT NULL,
  summary text,
  body text,
  photo text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  paused boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'returning')),
  -- PROMO 11: at most two on Home, staff-ordered.
  home_rank integer CHECK (home_rank IN (1, 2)),
  eligible jsonb NOT NULL DEFAULT '[]',
  terms jsonb NOT NULL DEFAULT '[]',
  -- Exact destination while live, and the safe destination once ended or paused (PROMO 05, 09).
  cta jsonb NOT NULL,
  fallback jsonb NOT NULL,
  sample boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX campaigns_home_rank ON campaigns (home_rank) WHERE home_rank IS NOT NULL;

CREATE TABLE promo_codes (
  code text PRIMARY KEY,
  campaign_id text REFERENCES campaigns (id),
  description text NOT NULL,
  -- Which kind of item the code works on, for the "doesn't apply" message (OFR-03).
  applies_to text NOT NULL,
  applies_label text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  total_limit integer,
  used integer NOT NULL DEFAULT 0,
  per_person integer NOT NULL DEFAULT 1,
  archived boolean NOT NULL DEFAULT false
);

-- Filled by purchases (NANO-06); read here for "already used".
CREATE TABLE promo_redemptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL REFERENCES promo_codes (code),
  customer_id uuid NOT NULL REFERENCES customers (id),
  redeemed_at timestamptz NOT NULL
);

CREATE TABLE support_articles (
  id text PRIMARY KEY,
  title text NOT NULL,
  body jsonb NOT NULL,
  sort integer NOT NULL,
  on_hub boolean NOT NULL DEFAULT true,
  sample boolean NOT NULL DEFAULT true
);

CREATE TABLE policies (
  id text PRIMARY KEY,
  title text NOT NULL,
  version text NOT NULL,
  updated_on date NOT NULL,
  sections jsonb NOT NULL,
  sample boolean NOT NULL DEFAULT true
);

CREATE TABLE support_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  topic text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('text', 'email', 'app')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  -- A retried submit (lost response) returns the first reference instead of creating a duplicate.
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, idempotency_key)
);

-- Home hero + Ask-us topics live with the other public content.
CREATE TABLE content_blocks (
  id text PRIMARY KEY,
  value jsonb NOT NULL
);

-- ---------- Sample seed (handover fixtures.json and boards) ----------

INSERT INTO categories (id, name, photo, sort) VALUES
  ('skin-tightening', 'Skin tightening and resurfacing', 'treatment-hifu', 1),
  ('injectables', 'Injectables and medical', 'treatment-prp', 2),
  ('laser', 'Laser', 'treatment-laser', 3),
  ('facials', 'Facials and skin health', 'treatment-facial', 4),
  ('consultation', 'Consultation', NULL, 5);

INSERT INTO concerns (id, name, sort, home_rank) VALUES
  ('fine-lines', 'Fine lines', 1, NULL),
  ('loose-skin', 'Loose skin', 2, 2),
  ('acne-scars', 'Acne and scars', 3, NULL),
  ('pigmentation', 'Pigmentation', 4, 1),
  ('hair-loss', 'Hair loss', 5, NULL),
  ('unwanted-hair', 'Unwanted hair', 6, 3),
  ('brows-lashes', 'Brows and lashes', 7, NULL);

INSERT INTO professionals (id, name, title, bio, photo, profile_consent) VALUES
  ('stf_naz', 'Nazanin (Naz)', '[Title to confirm]', '[Short bio approved by Naz: experience, training and the treatments she focuses on.]', 'team-naz', false),
  ('stf_maria', 'Maria', '[Title to confirm]', '[Bio to confirm, with consent]', 'team-maria', false),
  ('stf_anna', 'Anna', '[Title to confirm]', '[Bio to confirm, with consent]', 'team-anna', false);

INSERT INTO support_articles (id, title, body, sort, on_hub) VALUES
  ('change-or-cancel', 'How do I change or cancel a visit?',
   '["[Clinic to write: how to change or cancel a visit booked in Fresha, and when the late-change rule applies.]"]', 1, true),
  ('deposits', 'How do deposits work?',
   '["Some treatments need a $50 deposit when you book. It holds your time with the professional you chose.", "On the day, the deposit comes off your bill. If you change or cancel more than 48 hours ahead, you get it back. Later than that, it becomes clinic credit you can use next time."]', 2, true),
  ('is-it-right-for-me', 'Is it right for me?',
   '["[Clinic-approved suitability notes: who should not have this treatment and when to ask first.]"]', 3, false);

INSERT INTO services (id, category_id, name, aliases, concerns, description, price, duration_label, duration_min, per_area, areas, photo, status, professionals, faq, care, suitability_article, sort) VALUES
  ('svc_hifu', 'skin-tightening', '12D HIFU', '{hifu,ultherapy}', '{loose-skin,fine-lines}',
   '[Clinic-approved description: what this treatment does, who it may suit and what a session feels like. No promised results.]',
   '{"kind":"from","amount":250}', '60 to 90 min', 60, false, NULL, 'treatment-hifu', 'live', '{stf_naz,stf_maria}',
   '[{"q":"Does it hurt?","a":"Most clients feel warmth and short tingles. We can pause at any time."},{"q":"Is there downtime?","a":"No. Some redness for an hour or two."},{"q":"How long do results last?","a":"[Clinic to confirm how long results usually last.]"}]',
   '[{"when":"2 days before","title":"Prepare your skin","text":"[Clinic-approved preparation text]"},{"when":"Day of visit","title":"Arrive 10 minutes early","text":"Clean skin, no makeup on the area."},{"when":"First 24 hours","title":"Aftercare","text":"[Clinic-approved aftercare text]"},{"when":"In 4 weeks","title":"Check-in and next session"}]',
   'is-it-right-for-me', 1),
  ('svc_rf', 'skin-tightening', 'Secret RF Microneedling', '{}', '{fine-lines,acne-scars}', NULL,
   '{"kind":"from","amount":300}', '75 min', 75, false, NULL, 'treatment-facial', 'live', '{stf_naz,stf_maria}', '[]', '[]', 'is-it-right-for-me', 2),
  ('svc_sqt', 'skin-tightening', 'Biomicroneedling SQT', '{}', '{}', NULL,
   '{"kind":"fixed","amount":350}', '60 min', 60, false, NULL, NULL, 'live', '{}', '[]', '[]', NULL, 3),
  ('svc_laser', 'laser', 'Laser Hair Removal', '{}', '{unwanted-hair}', NULL,
   '{"kind":"perUnit","amount":50,"unit":"per area"}', '20 min', 20, true,
   '{"women":[["Upper lip",50,"fixed"],["Chin",50,"from"],["Underarms",70,"from"],["Bikini line",80,"from"],["Lower leg",110,"from"],["Full leg and feet",250,"from"]],"men":[["Beard",75,"fixed"],["Back",200,"fixed"],["Chest and abdomen",200,"fixed"]],"maxAreasPerVisit":4}',
   'treatment-laser', 'live', '{stf_anna}', '[]', '[]', 'is-it-right-for-me', 4),
  ('svc_antiwrinkle', 'injectables', 'Anti-wrinkle injections', '{botox}', '{}', NULL,
   '{"kind":"consultation"}', NULL, NULL, false, NULL, NULL, 'live', '{}', '[]', '[]', 'is-it-right-for-me', 5),
  ('svc_prp_hair', 'injectables', 'PRP Hair Treatment', '{}', '{}', NULL,
   '{"kind":"consultation"}', NULL, NULL, false, NULL, 'treatment-prp', 'unavailable', '{}', '[]', '[]', NULL, 6),
  ('svc_consult', 'consultation', 'Consultation', '{}', '{}', NULL,
   '{"kind":"fixed","amount":20}', '30 min', 30, false, NULL, NULL, 'live', '{}', '[]', '[]', NULL, 7),
  ('svc_new_01', 'injectables', 'Filler', '{}', '{}', NULL, '{"kind":"consultation"}', NULL, NULL, false, NULL, NULL, 'draft', '{}', '[]', '[]', NULL, 8);

INSERT INTO campaigns (id, eyebrow, title, summary, body, photo, starts_at, ends_at, published, home_rank, eligible, terms, cta, fallback) VALUES
  ('cmp_autumn_laser', 'Autumn offer', '15% off laser packages', NULL,
   'Buy any new 6-session laser hair removal package during October and save 15%.', 'treatment-laser',
   '2026-10-01T09:00:00-07:00', '2026-10-31T23:59:00-07:00', true, 1,
   '[{"title":"Underarms, 6 sessions","was":378,"now":321},{"title":"Full leg and feet, 6 sessions","was":1350,"now":1148}]',
   '["Valid on new 6-session laser hair removal packages bought 1 to 31 Oct 2026, Pacific Time.","Not combinable with other offers or promo codes.","Packages expire 12 months after purchase.","One package per area per client.","Deposits and cancellations follow the clinic booking policy."]',
   '{"label":"Choose a package","href":"/wallet/buy-package"}',
   '{"label":"See laser treatments","href":"/treatments/list?category=laser"}'),
  ('cmp_halloween', 'Halloween glow', 'Halloween glow facials', '20% off facials', NULL, 'treatment-facial',
   '2026-10-20T09:00:00-07:00', '2026-11-01T23:59:00-07:00', true, 2, '[]', '[]',
   '{"label":"Browse facials","href":"/treatments/list?category=facials"}',
   '{"label":"Browse facials","href":"/treatments/list?category=facials"}');

INSERT INTO promo_codes (code, campaign_id, description, applies_to, applies_label, starts_at, ends_at, total_limit, used, per_person, archived) VALUES
  ('GLOW25', 'cmp_autumn_laser', '15% off new 6-session laser packages', 'package:laser', 'laser packages', '2026-10-01T09:00:00-07:00', '2026-10-31T23:59:00-07:00', NULL, 0, 1, false),
  ('HALLO26', 'cmp_halloween', '20% off facials', 'category:facials', 'facials', '2026-10-20T09:00:00-07:00', '2026-11-01T23:59:00-07:00', 100, 38, 1, false),
  ('WELCOME20', NULL, '$20 off first visit', 'visit:first', 'a first visit', NULL, NULL, NULL, 0, 1, false),
  ('BFRIDAY', NULL, '25% off packages', 'package:any', 'packages', '2026-11-27T00:00:00-08:00', NULL, NULL, 0, 1, false),
  ('HALLO25', NULL, 'Halloween 2025', 'category:facials', 'facials', NULL, '2025-11-01T23:59:00-07:00', NULL, 0, 1, true);

INSERT INTO policies (id, title, version, updated_on, sections) VALUES
  ('booking', 'Booking policy', '1.0', '2026-09-25',
   '[{"heading":"Deposits","body":"Treatments over $150 need a $50 deposit when you book. It comes off your bill on the day."},{"heading":"Changes and cancellations","body":"Change or cancel free up to 48 hours before. Later than that, your deposit becomes clinic credit."},{"heading":"Missed visits","body":"If you miss a visit without telling us, the deposit is kept."},{"heading":"Questions","body":"Call or text the clinic. We''re happy to help."}]'),
  ('terms', 'Terms of Service', '0.1', '2026-09-25', '[{"heading":"","body":"[Terms of Service to be written by the clinic (release blocker R1).]"}]'),
  ('privacy', 'Privacy Policy', '0.1', '2026-09-25', '[{"heading":"","body":"[Privacy Policy to be written by the clinic (release blocker R1).]"}]');

INSERT INTO content_blocks (id, value) VALUES
  ('home', '{"hero":{"title":"Skin care, by appointment.","subtitle":"A medical spa in New Westminster","photo":"treatment-facial","alt":"Aesthetician giving a facial treatment at Nano Beauty"},"sample":true}'),
  ('rating', '{"value":4.9,"count":357,"source":"Fresha","sample":true}'),
  ('ask_topics', '{"topics":["Unwanted hair","Skin tightening","Pigmentation","Acne and scars","Something else"]}');
