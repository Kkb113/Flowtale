/*
  The conversion numbers are recorded as absolute values (`abs_conversion`).
  The consumer of the data (client code) needs to convert conversion to percentage.

  For most of the case it's as simple as abs_conversion/view_unique;
 */


CREATE MATERIALIZED VIEW al.entity_metrics AS
WITH view_metrics AS (SELECT COUNT(DISTINCT (aid)) AS views_unique,
                             COUNT(DISTINCT (sid)) AS views_all,
                             enc_entity_id
                      FROM al.activity
                      WHERE event = 'demo_opened'
                      GROUP BY enc_entity_id),
     conversion AS (SELECT COUNT(DISTINCT (aid)) as abs_conversion,
                           enc_entity_id
                    FROM al.activity
                    WHERE event = 'cta_clicked'
                    GROUP BY enc_entity_id)
SELECT views_unique,
       views_all,
       CASE WHEN abs_conversion IS NULL THEN 0 ELSE abs_conversion END as abs_conversion,
       view_metrics.enc_entity_id                                      as enc_entity_id,
       now()                                                           AS updated_at,
       1                                                               AS VERSION
FROM view_metrics
       LEFT OUTER JOIN conversion ON view_metrics.enc_entity_id = conversion.enc_entity_id;

CREATE UNIQUE INDEX idx_entity_id ON al.entity_metrics (enc_entity_id);


/*
  select * from al.entity_metrics;

  Usage from job:
  REFRESH MATERIALIZED VIEW al.entity_metrics;
 */
