CREATE TABLE fable_tour_app.entity_config_kv
(
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at  TIMESTAMP       NOT NULL,
    updated_at  TIMESTAMP       NOT NULL,
    entity_id   BIGINT UNSIGNED NOT NULL,
    entity_type VARCHAR(255)    NOT NULL,
    config_type VARCHAR(255)    NOT NULL,
    config_key  VARCHAR(255)    NOT NULL,
    config_val  JSON
);

CREATE INDEX IDX_entity_config_key ON fable_tour_app.entity_config_kv (entity_type, entity_id, config_type, config_key);
