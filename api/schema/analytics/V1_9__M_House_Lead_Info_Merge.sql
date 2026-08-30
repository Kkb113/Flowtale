/*
    This runs every hour to update the house lead table based
    on if an unique aid has been submitted in the last hour.

    If a form is submitted and aid does not exist, we insert a new row into
    the house lead table.

    If the aid exists for an org then we update the table where the
    json value is merged with the new values.
*/

CREATE OR REPLACE FUNCTION al.update_house_lead(low_wm TIMESTAMP, high_wm TIMESTAMP)
  RETURNS TABLE
          (
            v              int,
            inserted_count int,
            updated_count  int
          )
AS
$$
DECLARE
  v             int := 1;
inserted_rows int := 0;
updated_rows  int := 0;
BEGIN
  WITH ins AS (
    INSERT INTO al.d_house_lead
      (updated_at, enc_entity_id, pk_val, pk_field, aid, info)
      SELECT now(),
             enc_entity_id,
             -- mandatory values in payload
             payload2 ->> 'pk_val',
             payload2 ->> 'pk_field',
             aid,
             payload2
      FROM (
             -- there might be multiple user_assign in activity between two runs,
             -- in this case aggregate the data to a single row by merging user_info json
             SELECT aid, enc_entity_id, al.jsonb_object_merge2(payload) as payload2
             FROM al.activity
             WHERE event = 'user_assign'
               AND updated_at >= low_wm
               AND updated_at < high_wm
             GROUP BY aid, enc_entity_id, payload ->> 'pk_val') sq1
      ON CONFLICT (enc_entity_id, pk_val, aid) DO UPDATE
        SET updated_at = now(),
          -- json merge during upsert as well as well
          info = al.d_house_lead.info || EXCLUDED.info
      RETURNING (xmax = 0) AS inserted)
SELECT COUNT(*) FILTER (WHERE inserted), COUNT(*) FILTER (WHERE NOT inserted)
INTO inserted_rows, updated_rows
FROM ins;

RETURN QUERY SELECT v, inserted_rows, updated_rows;
END;
$$ LANGUAGE plpgsql;


/*
  Usage from job:
  SELECT * FROM update_house_lead('2024-06-30 19:14:47', '2024-06-30 23:45:28');
 */
