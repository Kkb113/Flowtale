CREATE TABLE fable_tour_app.logs
(
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at      TIMESTAMP       NOT NULL,
    updated_at      TIMESTAMP       NOT NULL,
    org_id          BIGINT UNSIGNED NOT NULL,
    log_type        VARCHAR(255)    NOT NULL,
    for_object_type VARCHAR(255)    NOT NULL,
    for_object_id   BIGINT UNSIGNED NOT NULL,
    log_line        JSON
);

CREATE INDEX IDX_log ON fable_tour_app.logs (org_id, log_type, for_object_type, for_object_id);
