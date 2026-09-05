-- Preserve the historical ordinal-text format expected by existing API and jobs readers.
-- Some imports used enum names; normalize those names so indexed equality queries find them.
UPDATE fable_tour_app.entity_config_kv
SET config_type = CASE config_type
  WHEN 'VANITY_DOMAIN' THEN '0'
  WHEN 'CUSTOM_FORM_FIELDS' THEN '1'
  WHEN 'GLOBAL_OPTS' THEN '2'
  WHEN 'AI_CREDIT' THEN '3'
  WHEN 'DATASET' THEN '4'
  WHEN '_EXP_' THEN '5'
  ELSE config_type
END
WHERE config_type IN ('VANITY_DOMAIN', 'CUSTOM_FORM_FIELDS', 'GLOBAL_OPTS', 'AI_CREDIT', 'DATASET', '_EXP_');
