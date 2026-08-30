-- default value is 1 as a migration script would be ran after this
ALTER TABLE fable_tour_app.org
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 1;

ALTER TABLE fable_tour_app.org
    ADD CONSTRAINT FK_org_created_by_user_2 FOREIGN KEY (created_by) REFERENCES fable_tour_app.user (id);
