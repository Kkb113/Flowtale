ALTER TABLE fable_tour_app.analytics_user_aid_mapping
    RENAME COLUMN email TO primary_key;

ALTER TABLE fable_tour_app.analytics_user_aid_mapping
    ADD lead_form_info JSON NULL;