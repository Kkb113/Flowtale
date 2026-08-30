/*
  The conversion numbers are recorded as absolute values (`abs_conversion`).
  The consumer of the data (client code) needs to convert conversion to percentage.

  For most of the case it's as simple as abs_conversion/view_unique;
 */

CREATE MATERIALIZED VIEW al.entity_metrics_daily AS
WITH view_metrics AS (SELECT COUNT(DISTINCT (sid)) AS      views_all,
                             date_trunc('day', created_at) "day",
                             enc_entity_id
                      FROM al.activity
                      WHERE event = 'demo_opened'
                        AND created_at >= current_timestamp - '6 months'::interval
                      GROUP BY enc_entity_id, day
                      order by day),
     conversion AS (SELECT COUNT(DISTINCT (aid)) as      abs_conversion,
                           date_trunc('day', created_at) "day",
                           enc_entity_id
                    FROM al.activity
                    WHERE event = 'cta_clicked'
                      AND created_at >= current_timestamp - '6 months'::interval
                    GROUP BY enc_entity_id, day)
SELECT row_number() over ()                                            as id,
       views_all,
       CASE WHEN abs_conversion IS NULL THEN 0 ELSE abs_conversion END as abs_conversion,
       view_metrics.enc_entity_id                                      as enc_entity_id,
       view_metrics.day                                                as day,
       current_timestamp                                               AS updated_at,
       current_timestamp                                               AS created_at,
       1                                                               AS VERSION
FROM view_metrics
       LEFT OUTER JOIN conversion ON view_metrics.enc_entity_id = conversion.enc_entity_id and
                                     view_metrics.day = conversion.day
order by day;

CREATE INDEX idx_entity_id_for_emd ON al.entity_metrics_daily (enc_entity_id);


/*
  select * from al.entity_metrics;

  Usage from job:
  REFRESH MATERIALIZED VIEW al.entity_metrics;
 */
