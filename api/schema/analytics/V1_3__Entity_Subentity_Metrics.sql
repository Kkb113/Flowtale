/*
  This table is a generic table to create entity <-> sub entity relationships
 */

CREATE TABLE al.d_entity_subentity_metrics
(
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT now(),
  enc_entity_id   BIGINT       NOT NULL,
  sub_entity_type VARCHAR(255) NULL,
  sub_entity_id   VARCHAR(255) NULL,
  metric1         BIGINT       NOT NULL,
  metric2_dist    JSONB,

  CONSTRAINT unique_entity_subentity UNIQUE (enc_entity_id, sub_entity_id)
);

CREATE INDEX esm_idx_prim ON al.d_entity_subentity_metrics (enc_entity_id);
