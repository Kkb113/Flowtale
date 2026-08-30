CREATE DATABASE IF NOT EXISTS fable_tour_app;

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.asset_proxy
(
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL,
    rid             VARCHAR(255) NOT NULL UNIQUE,
    full_origin_url TEXT         NOT NULL,
    proxy_uri       VARCHAR(100),
    http_status     INT          NOT NULL
);

CREATE INDEX IDX_rid ON fable_tour_app.asset_proxy (rid);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.org
(
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rid          VARCHAR(255) NOT NULL UNIQUE,
    created_at   TIMESTAMP    NOT NULL,
    updated_at   TIMESTAMP    NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    thumbnail    VARCHAR(200) NULL
);

CREATE INDEX IDX_org ON fable_tour_app.org (rid);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.user
(
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name     VARCHAR(100)    NOT NULL,
    last_name      VARCHAR(100)    NULL,
    email          VARCHAR(255)    NOT NULL,
    created_at     TIMESTAMP       NOT NULL,
    updated_at     TIMESTAMP       NOT NULL,
    avatar         VARCHAR(255)    NULL,
    belongs_to_org BIGINT UNSIGNED NULL,
    CONSTRAINT UK_user_per_org UNIQUE (belongs_to_org, email),
    CONSTRAINT FK_user_belongs_to_org FOREIGN KEY (belongs_to_org) REFERENCES org (id)
);

CREATE INDEX IDX_email ON fable_tour_app.user (email);
CREATE INDEX IDX_org ON fable_tour_app.user (belongs_to_org);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.screen
(
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rid               VARCHAR(255)    NOT NULL UNIQUE,
    asset_prefix_hash VARCHAR(32)     NULL,
    created_at        TIMESTAMP       NOT NULL,
    updated_at        TIMESTAMP       NOT NULL,
    display_name      VARCHAR(200)    NOT NULL,
    created_by        BIGINT UNSIGNED NULL,
    thumbnail         VARCHAR(200)    NULL,
    parent_screen_id  BIGINT UNSIGNED NULL,
    belongs_to_org    BIGINT UNSIGNED NULL,
    url               TEXT            NULL,
    icon              TEXT            NULL,
    CONSTRAINT FK_screen_belongs_to_org FOREIGN KEY (belongs_to_org) REFERENCES org (id),
    CONSTRAINT FK_screen_created_by_user FOREIGN KEY (created_by) REFERENCES user (id)
);

CREATE INDEX IDX_org ON fable_tour_app.screen (belongs_to_org);
CREATE INDEX IDX_rid ON fable_tour_app.screen (rid);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.tour
(
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rid               VARCHAR(255)    NOT NULL UNIQUE,
    asset_prefix_hash VARCHAR(32)     NULL,
    created_at        TIMESTAMP       NOT NULL,
    updated_at        TIMESTAMP       NOT NULL,
    display_name      VARCHAR(200)    NOT NULL,
    created_by        BIGINT UNSIGNED NULL,
    description       TEXT            NULL,
    belongs_to_org    BIGINT UNSIGNED NULL,
    CONSTRAINT FK_tour_belongs_to_org FOREIGN KEY (belongs_to_org) REFERENCES org (id),
    CONSTRAINT FK_tour_created_by_user FOREIGN KEY (created_by) REFERENCES user (id)
);

CREATE INDEX IDX_org ON fable_tour_app.tour (belongs_to_org);
CREATE INDEX IDX_rid ON fable_tour_app.tour (rid);

-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------

CREATE TABLE fable_tour_app.screens_tours_join
(
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    screen_id  BIGINT UNSIGNED NULL,
    tour_id    BIGINT UNSIGNED NULL,
    created_at TIMESTAMP       NOT NULL,
    updated_at TIMESTAMP       NOT NULL,
    CONSTRAINT FK_screen_id FOREIGN KEY (screen_id) REFERENCES screen (id),
    CONSTRAINT FK_tour_id FOREIGN KEY (tour_id) REFERENCES tour (id)
);

CREATE INDEX IDX_join_screen_id ON fable_tour_app.screens_tours_join (screen_id);
CREATE INDEX IDX_join_tour_id ON fable_tour_app.screens_tours_join (tour_id);
