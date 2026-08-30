DROP FUNCTION IF EXISTS al.update_house_lead_metrics;

CREATE OR REPLACE FUNCTION al.update_house_lead_metrics(low_wm TIMESTAMP, high_wm TIMESTAMP)
  RETURNS TABLE
          (
            v INTEGER
          )
AS
$$
DECLARE
  v INTEGER := 2;
BEGIN
  WITH active_lead AS (SELECT *
                       FROM al.d_house_lead
                       WHERE last_interacted_at >= low_wm
                          OR metric_inited IS false),
       session_data AS (SELECT aid, enc_entity_id, COUNT(DISTINCT sid) AS sessions_created
                        FROM al.activity
                        WHERE event = 'demo_opened'
                          AND aid IN (SELECT aid FROM active_lead)
                          AND enc_entity_id IN (SELECT enc_entity_id FROM active_lead)
                        GROUP BY aid, enc_entity_id),
       time_spent_data AS (
         -- we first find out how the latest data for each session and then sum up the time spent in each session
         -- then we sum up time spent across all sessions
         -- TODO if required instead of scanning the whole data process only last 3 months of data
         SELECT aid, enc_entity_id, SUM(max_metric1) AS time_spent_sec
         FROM (SELECT aid, enc_entity_id, sid, SUM(max_metric1) AS max_metric1
               FROM (SELECT aid, enc_entity_id, sid, target, MAX(metric1) AS max_metric1
                     FROM al.activity_dt
                     WHERE event = 'time_spent_in_ann'
                       AND aid IN (SELECT aid FROM active_lead)
                       AND enc_entity_id IN (SELECT enc_entity_id FROM active_lead)
                     GROUP BY aid, enc_entity_id, sid, target) AS max_metric_per_target
               GROUP BY aid, enc_entity_id, sid) AS max_metric_per_session
         GROUP BY aid, enc_entity_id),
       completion_data AS (
         -- we first find out how the latest data for each session and then find the maximum completion percentage in each session
         -- then we find the maximum completion percentage across all sessions
         SELECT aid, enc_entity_id, MAX(max_metric1) AS completion_percentage
         FROM (SELECT aid, enc_entity_id, sid, MAX(metric1) AS max_metric1
               FROM al.activity_dt
               WHERE event = 'completion'
                 AND aid IN (SELECT aid FROM active_lead)
                 AND enc_entity_id IN (SELECT enc_entity_id FROM active_lead)
               GROUP BY aid, enc_entity_id, sid) AS max_metric_per_session
         GROUP BY aid, enc_entity_id),
       cta_click_data AS (SELECT aid,
                                 enc_entity_id,
                                 MAX(CASE WHEN event = 'cta_clicked' THEN 1 ELSE 0 END) AS cta_click_rate
                          FROM al.activity
                          WHERE event = 'cta_clicked'
                            AND aid IN (SELECT aid FROM active_lead)
                            AND enc_entity_id IN (SELECT enc_entity_id FROM active_lead)
                          GROUP BY aid, enc_entity_id),
       big_table AS (SELECT hl.aid,
                            hl.enc_entity_id,
                            sd.sessions_created,
                            tsd.time_spent_sec,
                            cd.completion_percentage,
                            ccd.cta_click_rate
                     FROM al.d_house_lead hl
                            INNER JOIN session_data sd
                                       ON hl.aid = sd.aid AND hl.enc_entity_id = sd.enc_entity_id
                            INNER JOIN time_spent_data tsd
                                       ON hl.aid = tsd.aid AND hl.enc_entity_id = tsd.enc_entity_id
                            INNER JOIN completion_data cd
                                       ON hl.aid = cd.aid AND hl.enc_entity_id = cd.enc_entity_id
                            LEFT JOIN cta_click_data ccd
                                      ON hl.aid = ccd.aid AND hl.enc_entity_id = ccd.enc_entity_id)
  UPDATE al.d_house_lead hl
  SET session_created       = COALESCE(bg.sessions_created, 0),
      time_spent_sec        = COALESCE(bg.time_spent_sec, 0),
      completion_percentage = COALESCE(bg.completion_percentage, 0),
      cta_click_rate        = COALESCE(bg.cta_click_rate, 0),
      metric_inited         = true
  FROM big_table bg
  WHERE hl.aid = bg.aid
    AND hl.enc_entity_id = bg.enc_entity_id;
  RETURN QUERY SELECT v;
END;
$$ LANGUAGE plpgsql;


/*
  Usage from job:
  SELECT * FROM update_house_lead_metrics('2024-06-30 19:14:47', '2024-06-30 23:45:28');
 */
