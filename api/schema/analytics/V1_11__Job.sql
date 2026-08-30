CREATE TABLE al.job
(
  id             SERIAL PRIMARY KEY,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  job_type       VARCHAR(255) NOT NULL,
  job_key        VARCHAR(255) NOT NULL,
  job_status     VARCHAR(255) NOT NULL,
  low_watermark  TIMESTAMP,
  high_watermark TIMESTAMP,
  failure_reason TEXT,
  job_data       JSONB
);

CREATE INDEX idx_job_type_job_key ON al.job (job_type, job_key);

