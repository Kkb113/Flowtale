CREATE TABLE fable_tour_app.user_org_join
(
    id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    org_id  BIGINT UNSIGNED NOT NULL,
    CONSTRAINT FK_users_id FOREIGN KEY (user_id) REFERENCES user (id),
    CONSTRAINT FK_orgs_id FOREIGN KEY (org_id) REFERENCES org (id)
);

CREATE INDEX IDX_join_user_id ON fable_tour_app.user_org_join (user_id);
CREATE INDEX IDX_join_org_id ON fable_tour_app.user_org_join (org_id);
