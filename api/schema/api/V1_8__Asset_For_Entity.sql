CREATE TABLE fable_tour_app.entity_holding
(
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    entity_type INT       NOT NULL,
    entity_key  INT       NOT NULL,
    asset_key   TEXT      NOT NULL,
    info        JSON
);
CREATE INDEX IDX_entity_type_entity_key ON fable_tour_app.entity_holding (entity_type, entity_key);
