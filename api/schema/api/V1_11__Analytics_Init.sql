CREATE TABLE fable_tour_app.analytics_tour_metrics
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    date_ymd            INT UNSIGNED NOT NULL,
    entry_duration_type VARCHAR(50)  NOT NULL,
    tour_id             BIGINT UNSIGNED,
    views_unique        BIGINT UNSIGNED DEFAULT 0,
    views_all           BIGINT UNSIGNED DEFAULT 0
);

CREATE INDEX IDX_tour_id ON fable_tour_app.analytics_tour_metrics (tour_id);

CREATE TABLE fable_tour_app.analytics_tour_ann_clicks
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at          TIMESTAMP       NOT NULL,
    updated_at          TIMESTAMP       NOT NULL,
    date_ymd            INT UNSIGNED    NOT NULL,
    entry_duration_type VARCHAR(50)     NOT NULL,
    tour_id             BIGINT UNSIGNED NOT NULL,
    ann_id              VARCHAR(255)     NOT NULL,
    views_unique        BIGINT UNSIGNED DEFAULT 0,
    views_all           BIGINT UNSIGNED DEFAULT 0,
    time_spent_dist     JSON
    -- [p1, p5, p10, p25, p50, p75, p90, p95, p99]
);

CREATE INDEX IDX_tour_id ON fable_tour_app.analytics_tour_ann_clicks (tour_id);


CREATE TABLE fable_tour_app.analytics_conversion
(
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at          TIMESTAMP       NOT NULL,
    updated_at          TIMESTAMP       NOT NULL,
    date_ymd            INT UNSIGNED    NOT NULL,
    entry_duration_type VARCHAR(50)     NOT NULL,
    tour_id             BIGINT UNSIGNED NOT NULL,
    btn_id              varchar(255)    NOT NULL,
    clicks              BIGINT UNSIGNED DEFAULT 0
);
CREATE INDEX IDX_tour_id ON fable_tour_app.analytics_conversion (tour_id);
