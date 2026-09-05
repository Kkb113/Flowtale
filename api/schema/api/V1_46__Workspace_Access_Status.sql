CREATE TABLE fable_tour_app.user_workspace_disabled (
  user_id BIGINT UNSIGNED NOT NULL,
  org_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, org_id),
  CONSTRAINT fk_workspace_disabled_user FOREIGN KEY (user_id) REFERENCES fable_tour_app.user(id),
  CONSTRAINT fk_workspace_disabled_org FOREIGN KEY (org_id) REFERENCES fable_tour_app.org(id)
);
-- Existing global inactive flags are preserved. Explicit owner reactivation
-- translates that legacy state into per-workspace restrictions before enabling
-- only the requested workspace; this migration grants no new access.
