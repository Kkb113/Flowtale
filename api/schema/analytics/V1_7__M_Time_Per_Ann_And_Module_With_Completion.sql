/*
 Aggregate data by session (sid) and calculate various metrics and data distribution for
 - time spent in annotations
 - time spent in modules
 - completion percentage
 */

CREATE OR REPLACE FUNCTION al.update_entity_subentity_metrics(low_wm TIMESTAMP, high_wm TIMESTAMP)
  RETURNS TABLE
          (
            v int
          )
AS
$$
DECLARE
  v int := 1;
BEGIN
  WITH ranked_activity AS (SELECT enc_entity_id,
                                  sid,
                                  -- d_entity_subentity_metrics table needs sub entity type as metrics are calculated on
                                  -- target like annotation / module etc
                                  CASE
                                    WHEN event = 'time_spent_in_ann' THEN 'ann'
                                    WHEN event = 'time_spent_in_module' THEN 'mod'
                                    WHEN event = 'completion' THEN 'completion'
                                    END                                                                AS sub_entity_type,
                                  target                                                               as sub_entity_id,
                                  metric1,
                                  ROW_NUMBER()
                                    -- `activity_dt` contains redundant data. We calculate data based on largest metric
                                    -- WARN right now it works because redundant data consists of monotonically increasing
                                    --      metric (like time_spent or completion). If the metric type is changed then
                                    --      we can ORDER BY updated_at
                                    -- even though we perform daily cleanup on this table, the order of cleanup job
                                    -- and this job might be independent. Hence this table we have to perform this additional
                                    -- step of figuring out the latest data.
                                  OVER (PARTITION BY enc_entity_id, sid, target ORDER BY metric1 DESC) AS rnk
                           FROM al.activity_dt
                           -- list of events to process. if we are processing more events update it here
                           WHERE event IN ('time_spent_in_ann', 'time_spent_in_module', 'completion')
                             --- do this for past 3months
                             AND updated_at >= low_wm - '3 months'::interval
                             AND updated_at < high_wm),
       filtered_activity AS (SELECT enc_entity_id,
                                    sub_entity_type,
                                    sub_entity_id,
                                    sid,
                                    metric1
                             FROM ranked_activity
                             -- only get the max(metric1) data as data might be redundant
                             WHERE rnk = 1),
       session_metrics AS (SELECT enc_entity_id,
                                  sub_entity_type,
                                  sub_entity_id,
                                  COUNT(DISTINCT sid)                                   AS view_all,
                                  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metric1) AS p50_time_spent,
                                  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric1) AS p75_time_spent,
                                  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY metric1) AS p90_time_spent,
                                  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric1) AS p95_time_spent
                           FROM filtered_activity
                           GROUP BY enc_entity_id, sub_entity_type, sub_entity_id)
  INSERT
  INTO al.d_entity_subentity_metrics (enc_entity_id, sub_entity_type, sub_entity_id, metric1, metric2_dist)
  SELECT enc_entity_id,
         sub_entity_type,
         sub_entity_id,
         view_all,
         jsonb_build_object(
           'p50', p50_time_spent,
           'p75', p75_time_spent,
           'p90', p90_time_spent,
           'p95', p95_time_spent
         ) AS time_spent_dist
  FROM session_metrics
  ON CONFLICT (enc_entity_id, sub_entity_id) DO UPDATE
    SET metric1      = EXCLUDED.metric1,
        metric2_dist = EXCLUDED.metric2_dist,
        updated_at   = now();

  RETURN QUERY SELECT v;
END;
$$ LANGUAGE plpgsql;


/*
    Usage from job:
    select * FROM update_entity_subentity_metrics('2024-06-30 19:14:47', '2024-06-30 23:45:28');
 */
