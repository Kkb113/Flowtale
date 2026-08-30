/*
  Each id gets enriched with information device and geo information.
 */

CREATE TABLE al.aid_rich_info
(
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at TIMESTAMP    NOT NULL DEFAULT now(),
  aid        VARCHAR(255) NOT NULL,
  info1      JSONB,

  CONSTRAINT unique_rich_info_aid UNIQUE (aid)
);

CREATE INDEX ari_aid ON al.aid_rich_info (aid);
