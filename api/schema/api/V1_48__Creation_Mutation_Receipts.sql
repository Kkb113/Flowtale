CREATE TABLE fable_tour_app.creation_mutation_receipt (
  key_hash CHAR(64) NOT NULL PRIMARY KEY,
  request_hash CHAR(64) NOT NULL,
  response_json LONGTEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
-- Receipts commit in the same SQL transaction as the resource mutation.
-- Do not expire receipts while captures referencing their keys can be retried.
