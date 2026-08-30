CREATE TABLE fable_tour_app.llm_ops
(
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP       NOT NULL,
  updated_at TIMESTAMP       NOT NULL,
  org_id     BIGINT UNSIGNED NOT NULL,
  entity_id  BIGINT UNSIGNED NOT NULL,
  thread_id  VARCHAR(255)    NOT NULL,
  status     VARCHAR(255)    NOT NULL,
  data       JSON,
  meta       JSON
);

CREATE INDEX IDX_entity_config_kv_thread ON fable_tour_app.llm_ops (org_id, thread_id);
