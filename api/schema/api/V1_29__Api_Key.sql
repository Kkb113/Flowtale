CREATE TABLE fable_tour_app.api_key
(
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    org_id        BIGINT UNSIGNED NOT NULL,
    created_at    TIMESTAMP       NOT NULL,
    updated_at    TIMESTAMP       NOT NULL,
    api_key       VARCHAR(255)    NOT NULL,
    active        bool            NOT NULL,
    created_by_id BIGINT UNSIGNED NOT NULL,

    CONSTRAINT FK_api_key_org_id FOREIGN KEY (org_id) REFERENCES org (id),
    CONSTRAINT FK_api_key_created_by FOREIGN KEY (created_by_id) REFERENCES user (id)
);

CREATE INDEX IDX_api_key_org_id ON fable_tour_app.api_key (org_id);
CREATE INDEX IDX_api_key_active_key ON fable_tour_app.api_key (api_key, active);
