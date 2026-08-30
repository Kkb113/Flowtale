CREATE TABLE fable_tour_app.house_lead_info
(
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    updated_at    TIMESTAMP    NOT NULL,
    created_at    TIMESTAMP    NOT NULL,
    org_id        BIGINT UNSIGNED,
    lead_email_id VARCHAR(255) NOT NULL,

    CONSTRAINT FK_house_lead_org_id FOREIGN KEY (org_id) REFERENCES fable_tour_app.org (id)
);
CREATE INDEX IDX_lead_info_org_email ON fable_tour_app.house_lead_info (org_id, lead_email_id);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.lead_info_vendor_mapping
(
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    updated_at    TIMESTAMP    NOT NULL,
    created_at    TIMESTAMP    NOT NULL,
    house_lead_id BIGINT UNSIGNED,
    info_key      VARCHAR(255) NOT NULL,
    info_value    VARCHAR(255) NOT NULL,
    aux_data      JSON,

    CONSTRAINT FK_lead_v_lead FOREIGN KEY (house_lead_id) REFERENCES fable_tour_app.house_lead_info (id)
);
CREATE INDEX IDX_lead_v_lead ON fable_tour_app.lead_info_vendor_mapping (house_lead_id, info_key);
CREATE INDEX IDX_lead_v_val ON fable_tour_app.lead_info_vendor_mapping (info_key, info_value);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.lead_360
(
    id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    updated_at            TIMESTAMP       NOT NULL,
    created_at            TIMESTAMP       NOT NULL,
    house_lead_id         BIGINT UNSIGNED NOT NULL,
    tour_id               BIGINT UNSIGNED NOT NULL,
    demo_visited          INT DEFAULT 0   NOT NULL,
    sessions_created      INT DEFAULT 0   NOT NULL,
    time_spent_sec        INT DEFAULT 0   NOT NULL,
    last_interacted_at    TIMESTAMP,
    completion_percentage INT DEFAULT 0   NOT NULL,
    cta_click_rate        INT DEFAULT 0   NOT NULL,

    CONSTRAINT FK_lead_360_lead_id FOREIGN KEY (house_lead_id) REFERENCES house_lead_info (id)
);

CREATE INDEX IDX_lead_lead_id ON fable_tour_app.lead_360 (house_lead_id, tour_id);
