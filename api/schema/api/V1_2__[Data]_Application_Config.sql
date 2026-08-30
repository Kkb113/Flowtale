CREATE TABLE fable_tour_app.settings
(
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    k  VARCHAR(255) NOT NULL UNIQUE,
    v  TEXT         NOT NULL
);

CREATE INDEX IDX_k ON fable_tour_app.settings (k);

INSERT INTO fable_tour_app.settings (k, v)
VALUES ('CURRENT_SCHEMA_VERSION', '2023-01-10');
