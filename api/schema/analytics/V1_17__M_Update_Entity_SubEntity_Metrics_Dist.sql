-- support both payload.ann_id and payload.anId

DROP MATERIALIZED VIEW IF EXISTS al.entity_subentity_distribution CASCADE;
CREATE MATERIALIZED VIEW al.entity_subentity_distribution AS
WITH ranked_activity AS (SELECT enc_entity_id,
                                sid,
                                -- d_entity_subentity_metrics table needs sub entity type as metrics are calculated on
                                -- target like annotation / module etc
                                CASE
                                  WHEN event = 'time_spent_in_ann' THEN 'ann'
                                  WHEN event = 'time_spent_in_module' THEN 'mod'
                                  WHEN event = 'completion' THEN 'completion'
                                  END                                                                       AS sub_entity_type,
                                coalesce(target, payload ->> 'ann_id', payload ->> 'annId', 'tour')                              as sub_entity_id,
                                CASE WHEN metric1 > 300 THEN 300 ELSE metric1 END                           as metric1,
                                ROW_NUMBER()
                                  -- `activity_dt` contains redundant data. We calculate data based on largest metric
                                  -- WARN right now it works because redundant data consists of monotonically increasing
                                  --      metric (like time_spent or completion). If the metric type is changed then
                                  --      we can ORDER BY updated_at
                                  -- even though we perform daily cleanup on this table, the order of cleanup job
                                  -- and this job might be independent. Hence this table we have to perform this additional
                                  -- step of figuring out the latest data.
                                OVER (PARTITION BY enc_entity_id, sid, target, event ORDER BY metric1 DESC) AS rnk
                         FROM al.activity_dt
                         -- list of events to process. if we are processing more events update it here
                         WHERE event IN ('time_spent_in_ann', 'time_spent_in_module', 'completion')
                           --- do this for past 6months
                           AND updated_at >= current_timestamp - '6 months'::interval),
     filtered_activity AS (SELECT enc_entity_id,
                                  sub_entity_type,
                                  sub_entity_id,
                                  sid,
                                  metric1
                           FROM ranked_activity
-- only get the max(metric1) data as data might be redundant
                           WHERE rnk = 1),
     -- in order to find the session time in demo level, we have to add up all metric 1 value for a sid
     -- and save it in a row ($rollup).
     -- The subsequent ctes treat the rollup as just another annotation with a value and everything works fine
     -- downstream
     session_metric_per_tour as (select enc_entity_id,
                                        sub_entity_type,
                                        '$rollup'    as sub_entity_id,
                                        sid,
                                        sum(metric1) as metric1
                                 from filtered_activity
                                 where sub_entity_type in ('ann')
                                 group by enc_entity_id, sid, sub_entity_type),
     unified_metrics_per_tour as (select *
                                  from filtered_activity
                                  union
                                  select *
                                  from session_metric_per_tour),
     session_metrics_per_ann AS (SELECT enc_entity_id,
                                        sub_entity_type,
                                        sub_entity_id,
                                        CASE
                                          -- calculate median for aggregate rows and view all for non aggregate rows
                                          WHEN sub_entity_type = 'completion'
                                            THEN percentile_cont(0.5) WITHIN GROUP (ORDER BY metric1)
                                          WHEN sub_entity_type = 'ann' and sub_entity_id = '$rollup'
                                            THEN percentile_cont(0.5) WITHIN GROUP (ORDER BY metric1)
                                          ELSE COUNT(DISTINCT sid)
                                          END as metric0,
                                        0     as bucket_min,
                                        CASE
                                          when sub_entity_type = 'completion' then 100
                                          when sub_entity_type = 'ann' then max(metric1)
                                          when sub_entity_type = 'mod' then max(metric1)
                                          END as bucket_max,
                                        4     as bucket_count
                                 FROM unified_metrics_per_tour
                                 GROUP BY enc_entity_id, sub_entity_type, sub_entity_id),
     bucketed_filtered_activity as (select unified_metrics_per_tour.enc_entity_id,
                                           unified_metrics_per_tour.sub_entity_type,
                                           unified_metrics_per_tour.sub_entity_id,
                                           sid,
                                           metric0,
                                           bucket_min,
                                           bucket_max,
                                           bucket_count,
                                           metric1,
                                           WIDTH_BUCKET(metric1, bucket_min, bucket_max + 1, bucket_count) AS bucket_number
                                    from unified_metrics_per_tour
                                           inner join session_metrics_per_ann
                                                      on unified_metrics_per_tour.enc_entity_id =
                                                         session_metrics_per_ann.enc_entity_id
                                                        and unified_metrics_per_tour.sub_entity_id =
                                                            session_metrics_per_ann.sub_entity_id
                                                        and unified_metrics_per_tour.sub_entity_type =
                                                            session_metrics_per_ann.sub_entity_type)
select row_number() over () as id,
                current_timestamp    as created_at,
       current_timestamp    as updated_at,
       enc_entity_id,
       sub_entity_type,
       sub_entity_id,
       bucket_number,
       max(metric0)         as metric0,
       min(bucket_min)      as bucket_min,
       max(bucket_max)      as bucket_max,
       avg(bucket_count)    as bucket_count,
       count(*)             as freq
from bucketed_filtered_activity
group by enc_entity_id, sub_entity_type, sub_entity_id, bucket_number;

CREATE INDEX idx_entity_id_esdist on al.entity_subentity_distribution (enc_entity_id);
