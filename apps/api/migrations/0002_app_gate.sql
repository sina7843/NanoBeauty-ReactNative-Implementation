-- Remote entry gates for ENT-02 (update required) and ENT-03 (maintenance). Bumps the settings version
-- so cached clients revalidate.
ALTER TABLE app_settings
  ADD COLUMN app jsonb NOT NULL DEFAULT '{
    "minimumVersion": { "ios": "1.0.0", "android": "1.0.0" },
    "storeUrl": { "ios": null, "android": null },
    "maintenance": null
  }'::jsonb;

UPDATE app_settings SET version = version + 1, updated_at = now() WHERE id = 1;
