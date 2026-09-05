-- Apply only with compose.local.yml. These settings are intentionally different from production.
INSERT INTO fable_tour_app.settings (k, v) VALUES
  ('CURRENT_SCHEMA_VERSION', '2026-08-31'),
  ('ONBOARDING_TOUR_IDS', ''),
  ('FEATURE_PLAN_MATRIX', '{}'),
  ('MIGRATION_FLAG', '0'),
  ('DATA_ENTRY_FLAG', '0')
ON DUPLICATE KEY UPDATE v = VALUES(v);

UPDATE fable_tour_app.settings
SET v = JSON_SET(CAST(v AS JSON),
  '$.logo', '', '$.companyUrl', 'http://localhost:3000', '$.customBtn1URL', '',
  '$.customBtn1Text', '', '$.showWatermark', false)
WHERE k = 'DEFAULT_GLOBAL_OPTS';
