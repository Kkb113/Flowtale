CREATE TABLE fable_tour_app.analytics_cta_clicked
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    event               VARCHAR(50)  NOT NULL,
    tz                  VARCHAR(50)  NOT NULL,
    uts                 BIGINT UNSIGNED NOT NULL,
    aid                 VARCHAR(255)  NOT NULL,
    sid                 VARCHAR(255)  NOT NULL,
    email               VARCHAR(255)  NOT NULL,
    tour_id             BIGINT UNSIGNED NOT NULL,
    cta_from            VARCHAR(50)  NOT NULL,
    btn_id              VARCHAR(255)  NOT NULL,
    url                 VARCHAR(255)  NOT NULL
);

CREATE INDEX IDX_tour_id_aid_email ON fable_tour_app.analytics_cta_clicked(tour_id, aid, email);