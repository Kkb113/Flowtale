CREATE TABLE fable_tour_app.platform_integrations
(
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL,
    type            VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    icon            VARCHAR(255) NOT NULL,
    description     TINYTEXT,
    disabled        BOOLEAN,
    platform_config JSON
);


CREATE TABLE fable_tour_app.tenant_integrations
(
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at     TIMESTAMP    NOT NULL,
    updated_at     TIMESTAMP    NOT NULL,
    org_id         BIGINT UNSIGNED,
    integration_id BIGINT UNSIGNED,
    event          VARCHAR(255) NOT NULL,
    disabled       BOOLEAN,
    tenant_config  JSON,

    CONSTRAINT FK_integration_belong_to_org FOREIGN KEY (org_id) REFERENCES org (id),
    CONSTRAINT FK_integration_platform_integrations FOREIGN KEY (integration_id) REFERENCES platform_integrations (id)
);

CREATE INDEX IDX_org_integration ON fable_tour_app.tenant_integrations (org_id);
