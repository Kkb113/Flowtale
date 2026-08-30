SET @default_global_opts = JSON_OBJECT(
  'logo', 'https://s3.amazonaws.com/app.sharefable.com/favicon.png',
  'companyUrl', 'https://sharefable.com',
  'demoLoadingText', 'Setting up the interactive demo for you',
  'fontFamily', '',
  'primaryColor', '#7567ff',
  'ctaSize', 'medium',
  'annBodyBgColor', '#FFFFFF',
  'annBorderColor', '#BDBDBD',
  'fontColor', '#424242',
  'annBorderRadius', 4,
  'annConPad', '14 14',
  'selColor', '#2196f3',
  'selShape', 'box',
  'selEffect', 'regular',
  'showStepNo', CAST('true' AS JSON),
  'showWatermark', CAST('true' AS JSON),
  'nextBtnText', 'Next',
  'nextBtnStyle', 'primary',
  'prevBtnText', 'Back',
  'prevBtnStyle', 'primary',
  'customBtn1Text', 'Book a demo',
  'customBtn1Style', 'primary',
  'customBtn1URL', 'https://www.sharefable.com/get-a-demo',
  'monoIncKey', 1,
  'createdAt', UNIX_TIMESTAMP(),
  'updatedAt', UNIX_TIMESTAMP(),
  'version', 1
);

INSERT INTO fable_tour_app.settings (k, v)
SELECT 'DEFAULT_GLOBAL_OPTS', CAST(@default_global_opts AS CHAR)
WHERE NOT EXISTS (
  SELECT 1
  FROM fable_tour_app.settings
  WHERE k = 'DEFAULT_GLOBAL_OPTS'
);

UPDATE fable_tour_app.entity_config_kv
SET config_val = CAST(@default_global_opts AS JSON),
    updated_at = CURRENT_TIMESTAMP
WHERE entity_type = 'Org'
  AND CAST(config_type AS CHAR) IN ('2', 'GLOBAL_OPTS')
  AND (config_val IS NULL OR JSON_TYPE(config_val) = 'NULL');

INSERT INTO fable_tour_app.entity_config_kv (
  created_at,
  updated_at,
  entity_id,
  entity_type,
  config_type,
  config_key,
  config_val
)
SELECT
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  org.id,
  'Org',
  '2',
  'GLOBAL OPTS',
  CAST(@default_global_opts AS JSON)
FROM fable_tour_app.org org
LEFT JOIN fable_tour_app.entity_config_kv config
  ON config.entity_id = org.id
  AND config.entity_type = 'Org'
  AND CAST(config.config_type AS CHAR) IN ('2', 'GLOBAL_OPTS')
WHERE config.id IS NULL;
