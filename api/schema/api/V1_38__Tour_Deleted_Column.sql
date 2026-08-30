ALTER TABLE fable_tour_app.tour
    ADD deleted INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IDX_org_deleted ON fable_tour_app.tour (belongs_to_org, deleted);
CREATE INDEX IDX_rid_deleted ON fable_tour_app.tour (rid, deleted);

DROP INDEX IDX_org ON fable_tour_app.tour;
DROP INDEX IDX_rid ON fable_tour_app.tour;