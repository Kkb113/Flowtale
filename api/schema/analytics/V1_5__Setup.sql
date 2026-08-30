/*
    Custom aggregation function to aggregate multiple rows and merge the jsonb column for those row
*/
DROP AGGREGATE IF EXISTS al.jsonb_object_merge2(jsonb);
CREATE AGGREGATE al.jsonb_object_merge2(jsonb) (
  SFUNC = 'jsonb_concat',
  STYPE = jsonb,
  INITCOND = '{}'
);

-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION al.update_last_interacted_at_on_activity_change()
  RETURNS TRIGGER AS $$
BEGIN
UPDATE al.d_house_lead
SET last_interacted_at = now(), updated_at = now()
WHERE enc_entity_id = NEW.enc_entity_id AND aid = NEW.aid;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Whenever an activity is recorded in `activity` table update the associated house lead (if any)
CREATE TRIGGER activity_update_last_interacted_at
  AFTER INSERT ON al.activity
  FOR EACH ROW EXECUTE FUNCTION al.update_last_interacted_at_on_activity_change();
