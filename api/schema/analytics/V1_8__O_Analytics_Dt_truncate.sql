/*
  `activity_dt` records redundant data to find out various metrics.
  This function cleans the data keeping the latest data for a metric.
 */

CREATE OR REPLACE FUNCTION al.remove_duplicates_activity_dt(low_wm TIMESTAMP, high_wm TIMESTAMP)
  RETURNS TABLE
          (
            v            INTEGER,
            deleted_rows INTEGER
          )
AS
$$
DECLARE
  v            INTEGER := 1;
deleted_rows INTEGER;
BEGIN
  WITH ranked_activity AS (SELECT id,
                                  ROW_NUMBER()
                                    -- assign a rank by soring against metric1 so that we can filter it below
                                  OVER (PARTITION BY event, sid, target ORDER BY metric1 DESC) AS rnk
                           FROM al.activity_dt
                           WHERE updated_at >= low_wm
                             AND updated_at < high_wm),
       to_delete AS (SELECT id
                     FROM ranked_activity
                     -- only keep the max(metric1) and delete get rid of redundant data
                     WHERE rnk > 1),
       delete_actn AS (
         DELETE FROM al.activity_dt WHERE id IN (SELECT id FROM to_delete))
SELECT COUNT(*)
FROM to_delete
INTO deleted_rows;

RETURN QUERY SELECT v, deleted_rows;
END;
$$ LANGUAGE plpgsql;

/*
  Usage from job:
   select * from remove_duplicates_activity_dt('2023-01-01 00:00:00', '2024-06-30 10:45:28')
 */
