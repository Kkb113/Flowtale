DROP TABLE fable_tour_app.analytics_aid_sid_mapping;

DROP INDEX IDX_aid_email ON fable_tour_app.analytics_user_aid_mapping;
CREATE INDEX IDX_tour_id_aid_email ON fable_tour_app.analytics_user_aid_mapping (tour_id, aid, email);

DROP INDEX IDX_UNQ_aid_email ON fable_tour_app.analytics_user_aid_mapping;
CREATE UNIQUE INDEX  IDX_UNQ_tour_id_aid_email ON fable_tour_app.analytics_user_aid_mapping (tour_id, aid, email);
