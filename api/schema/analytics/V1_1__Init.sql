-- INFO create database fable_analytics inside pg

-- al -> analytics log where data is stored as event
CREATE SCHEMA IF NOT EXISTS al;

-- -----------------------------------------------------------------------
-- -----------------------------------------------------------------------

CREATE TABLE al.activity
(
  id             SERIAL PRIMARY KEY,
  created_at     TIMESTAMP    NOT NULL,
  updated_at     TIMESTAMP    NOT NULL,
  event_time     TIMESTAMP    NOT NULL,
  ingestion_time TIMESTAMP    NOT NULL,
  enc_entity_id  BIGINT       NOT NULL,
  target         VARCHAR(255),
  event          VARCHAR(255) NOT NULL,
  aid            VARCHAR(200),
  sid            VARCHAR(200),
  metric1        INT,
  tz             VARCHAR(100),
  payload        JSONB
);

CREATE INDEX ac_entity_id ON al.activity (enc_entity_id, aid);
CREATE INDEX ac_event ON al.activity (event);

-- -----------------------------------------------------------------------
-- -----------------------------------------------------------------------

CREATE TABLE al.activity_dt
(
  id             SERIAL PRIMARY KEY,
  created_at     TIMESTAMP    NOT NULL,
  updated_at     TIMESTAMP    NOT NULL,
  event_time     TIMESTAMP    NOT NULL,
  ingestion_time TIMESTAMP    NOT NULL,
  enc_entity_id  BIGINT       NOT NULL,
  event          VARCHAR(255) NOT NULL,
  aid            VARCHAR(200),
  sid            VARCHAR(200),
  target         VARCHAR(255),
  metric1        INT,
  tz             VARCHAR(100),
  payload        JSONB
);

CREATE INDEX acdt_entity_id ON al.activity_dt (enc_entity_id, event);
CREATE INDEX acdt_event ON al.activity (event);
