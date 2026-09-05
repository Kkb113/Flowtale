-- Existing unsigned invitation links must be reissued after this release.
-- Raw invitation tokens are returned once to the issuer; only SHA-256 hashes are stored.
CREATE TABLE fable_tour_app.workspace_invitation (
  token_hash VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  org_id BIGINT UNSIGNED NOT NULL,
  invited_email VARCHAR(254) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  accepted_by BIGINT UNSIGNED NULL,
  INDEX idx_workspace_invitation_org (org_id),
  CONSTRAINT fk_workspace_invitation_org FOREIGN KEY (org_id) REFERENCES fable_tour_app.org(id),
  CONSTRAINT fk_workspace_invitation_user FOREIGN KEY (accepted_by) REFERENCES fable_tour_app.user(id)
) ENGINE=InnoDB;
