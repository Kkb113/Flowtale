CREATE TABLE fable_tour_app.proxy_asset_access (
  grant_id VARCHAR(80) NOT NULL PRIMARY KEY
);
-- Membership is still checked on every API request. A grant is a server-recorded
-- relationship between a workspace and an asset, never inferred from editable JSON.
