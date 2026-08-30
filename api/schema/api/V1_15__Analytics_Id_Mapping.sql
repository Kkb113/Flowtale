CREATE TABLE fable_tour_app.analytics_user_aid_mapping
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    tour_id             BIGINT       NOT NULL,
    aid                 VARCHAR(255)  NOT NULL,
    email               VARCHAR(255)  NOT NULL
);

CREATE INDEX IDX_aid_email ON fable_tour_app.analytics_user_aid_mapping (aid, email);
CREATE UNIQUE INDEX  IDX_UNQ_aid_email ON fable_tour_app.analytics_user_aid_mapping (aid, email);


CREATE TABLE fable_tour_app.analytics_aid_sid_mapping
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    aid                 VARCHAR(255)  NOT NULL,
    sid                 VARCHAR(255)  NOT NULL
);
CREATE UNIQUE INDEX  IDX_UNQ_aid_sid ON fable_tour_app.analytics_aid_sid_mapping (aid, sid);
CREATE INDEX IDX_aid_sid ON fable_tour_app.analytics_aid_sid_mapping (aid, sid);