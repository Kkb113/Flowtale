/*
  Associates an user with aid. An user could be identified by pk_val of type pk_field.
  For example. pk_val=john@acme.com of pk_field=email is one identified user.

  Data gets loaded here from activity table via jobs every hour incrementally.
  user_assign event is used to identify user <-> aid association.

  This table also contains multiple metric per identified by user.
  When an entry gets created here all the metric fields take default value by default with metric_inited is false.
  A separate pipeline fills up all the metric.

  Once the metrics are calculated metric_init is set to true.

  This table stores data per tour_id (enc_entity_id), if org level leads are required, for now,
  find out list of tours belongs to an org and run an aggregated query.

  Whenever an activity happens, last_interacted_at is updated.
  A job runs every hour that gather the records that got updated every hour and runs the metric pipeline.
  Once metric pipeline is completed, we update last_metric_calculated_at and updated_at.

  This last_metric_calculated_at field is used to calculate the low watermark of activity & activity_dt table.
 */

CREATE TABLE al.d_house_lead
(
  id                    BIGSERIAL PRIMARY KEY,
  created_at            TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP    NOT NULL DEFAULT now(),
  enc_entity_id         BIGINT       NOT NULL,
  pk_val                VARCHAR(255) NOT NULL,
  pk_field              VARCHAR(255) NOT NULL,
  aid                   VARCHAR(255) NOT NULL,
  session_created       INT          NOT NULL DEFAULT 1,
  time_spent_sec        INT          NOT NULL DEFAULT 0,
  last_interacted_at    TIMESTAMP    NOT NULL DEFAULT now(),
  completion_percentage INT          NOT NULL DEFAULT 0,
  cta_click_rate        INT          NOT NULL DEFAULT 0,
  metric_inited         bool         NOT NULL default false,
  info                  JSONB,

  CONSTRAINT unique_enc_owner_id_pk_val_aid UNIQUE (enc_entity_id, pk_val, aid)
);

CREATE INDEX hl_idx_prim ON al.d_house_lead (enc_entity_id, aid);
