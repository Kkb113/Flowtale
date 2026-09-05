-- Existing clients exchange updated_at as epoch milliseconds. Preserve that
-- protocol while preventing multiple successful writes with the same revision.
ALTER TABLE fable_tour_app.tour MODIFY updated_at TIMESTAMP(3) NOT NULL;
ALTER TABLE fable_tour_app.screen MODIFY updated_at TIMESTAMP(3) NOT NULL;

-- All writers, including metadata and maintenance SQL, advance the revision.
-- Row locking serializes this comparison; a clock adjustment cannot regress it.
CREATE TRIGGER fable_tour_app.tour_revision_before_update
BEFORE UPDATE ON fable_tour_app.tour FOR EACH ROW
SET NEW.updated_at = GREATEST(CURRENT_TIMESTAMP(3), TIMESTAMPADD(MICROSECOND, 1000, OLD.updated_at));

CREATE TRIGGER fable_tour_app.screen_revision_before_update
BEFORE UPDATE ON fable_tour_app.screen FOR EACH ROW
SET NEW.updated_at = GREATEST(CURRENT_TIMESTAMP(3), TIMESTAMPADD(MICROSECOND, 1000, OLD.updated_at));
