INSERT INTO fable_tour_app.settings (k, v)
VALUES ('ONBOARDING_TOUR_IDS', '150,151');

ALTER TABLE fable_tour_app.tour
    ADD onboarding BOOLEAN DEFAULT FALSE;
