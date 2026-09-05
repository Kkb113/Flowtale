# Fable Jobs Service

Existing installations must follow the [capture asset privacy cutover](../api/capture-asset-migration.md) before deploying the Phase 0 private asset readers. The migration scripts default to dry run and preserve private backups.

The jobs service is the asynchronous worker and companion Express API for the Fable interactive-demo platform. It consumes SQS jobs, processes media and analytics work, handles integrations, and exposes selected LLM, audio, Slack, and health endpoints on port 8081.

## Main components

- `src/main_msg_loop.ts` polls and routes SQS messages.
- `src/processors/` contains event, media, integration, and subscription handlers.
- `src/analytics/` runs analytics work against PostgreSQL.
- `src/http/` contains the Express server and HTTP operations.
- `src/json-schema/` contains the TypeScript sources for generated LLM tool schemas.

The runtime integrates with MySQL, PostgreSQL, SQS, S3, a pinned FFmpeg worker, API-verified user identity, and optional Anthropic, OpenAI and third-party systems. Provider replacement remains Phase 3 work.

## Supported toolchain

- Node.js 22.23.2
- npm 10.9.8

This project uses npm exclusively. `package-lock.json` is the canonical dependency lockfile.

## Install and verify

```bash
npm ci
npm run lint
npm test -- --runInBand
npm run build
```

`npm run build` regenerates JSON schemas, compiles TypeScript, and copies prompt assets into `dist/`. Generated schema output under `src/json-schema/out/` is intentionally untracked.

Build the production image with:

```bash
docker build --tag flowtale-jobs:local .
```

The production image contains production dependencies and the compiled `dist/` tree only.

## Runtime configuration

The build and automated tests do not need service credentials. Running the complete service requires configuration for the integrations used by that environment. The principal variables currently read by the service include:

```dotenv
# Queue and storage
SQS_Q_NAME=your-queue-name
SQS_Q_REGION=ap-south-1
AWS_S3_REGION=ap-south-1
AWS_ASSET_FILE_S3_BUCKET=your-bucket
AWS_ASSET_FILE_S3_BUCKET_REGION=ap-south-1
AWS_PRIVATE_ASSET_S3_BUCKET=pvt-mics
AWS_PRIVATE_ASSET_S3_BUCKET_REGION=ap-south-1
AWS_ASSET_ROOT_QUALIFIER=root

# Operational MySQL database
DB_CONN_URL=localhost:3306
DB_USER=your-user
DB_PWD=your-password
DB_DB=your-database

# Analytics PostgreSQL database
ANALYTICS_DB_CONN_URL=localhost:5432
ANALYTICS_DB_USER=your-user
ANALYTICS_DB_PWD=your-password
ANALYTICS_DB_NAME=analytics

# Current AI providers
ANTHORIPC_KEY=your-anthropic-api-key
OPENAI_KEY=your-openai-api-key

# HTTP authentication and API integration
API_SERVER_ENDPOINT=http://localhost:8080
AUTH0_AUDIENCES=your-auth0-audience
AUTH0_ISSUER_URL=https://your-tenant.auth0.com/

# Runtime
APP_ENV=dev
```

Optional integrations add their own variables, including Mailchimp, Cobalt, SmartLead, and Slack credentials. Keep real values in local or deployment secret stores; do not commit them.

## Local run

After supplying the runtime services and environment variables:

```bash
npm run build
npm start
```

The service starts its HTTP server and its SQS polling loop. A health check is available at `http://localhost:8081/health`.

The Makefile also contains environment-selection and deployment helpers used by the existing AWS workflow. These commands can affect queues, containers, or ECR and are not part of baseline verification.

## Private AI image boundary

Private bucket, environment and root qualifier must match the API's private S3 configuration. Upload responses return an `objectKey`; clients pass that key to AI operations instead of deriving it from a storage URL. Reads require the API-verified workspace and the prefix `{APP_ENV}/{root}/tour_data/org/{orgId}/{captureSession}/llmops/`. The one shared theme fixture `staging/root/global/sample_ann.png` is explicitly allowed; other global keys are inaccessible through this endpoint.

Reads allow PNG/JPEG bytes, at most 50 images, 5 MB per image and 40 MB per request, within a shared 30-second deadline. Missing, invalid or unauthorized assets fail the operation before provider execution. Image contents and storage URLs are not included in image-read error logs.

Deploy the API, client and worker changes together. Existing unscoped private references are intentionally rejected, rather than granting access based on a client-supplied capture ID. Captures retained in IndexedDB can be reuploaded through the new path. Historical private objects remain untouched. Legacy capture retry UX and production rollout verification remain open Phase 0 acceptance work.

For the real local storage check, build jobs, start the local platform, then run `node jobs/scripts/verify-private-assets.js` from the repository root. It uses only loopback endpoints and local fixture credentials, and deletes only the two image objects it created.

## Publication maintenance

Historical deployments require the [private draft migration](../api/draft-storage-migration.md), [public edit-history repair](../api/public-edit-history-migration.md), and [published-screen repair](../api/published-screen-migration.md). These are explicit maintenance operations, not automatic worker startup tasks. Follow their writer-stop, private-backup, repeatability and CDN verification requirements. The published-screen repair invokes the verified API compiler through an offline subprocess and resumes interrupted writes from a private repair plan.
