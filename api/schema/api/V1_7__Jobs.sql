CREATE TABLE fable_tour_app.jobs
(
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at        TIMESTAMP    NOT NULL,
    updated_at        TIMESTAMP    NOT NULL,
    job_type          VARCHAR(255) NOT NULL,
    job_key           VARCHAR(255) NOT NULL,
    processing_status INT          NOT NULL,
    failure_reason    TEXT,
    info              JSON
);
CREATE UNIQUE INDEX IDX_job_type_job_key ON fable_tour_app.jobs (job_type, job_key);
