# Fable Jobs Service

The jobs service is the asynchronous worker and companion Express API for the Fable interactive-demo platform. It consumes SQS jobs, processes media and analytics work, handles integrations, and exposes selected LLM, audio, Slack, and health endpoints on port 8081.

## Main components

- `src/main_msg_loop.ts` polls and routes SQS messages.
- `src/processors/` contains event, media, integration, and subscription handlers.
- `src/analytics/` runs analytics work against PostgreSQL.
- `src/http/` contains the Express server and HTTP operations.
- `src/json-schema/` contains the TypeScript sources for generated LLM tool schemas.

The current runtime integrates with MySQL, PostgreSQL, SQS, S3, Elastic Transcoder, Auth0, Anthropic, OpenAI, and optional third-party systems. Provider-agnostic AI/TTS behavior is planned work; it is not part of the baseline cleanup.

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

## Known dependency risk

AWS Elastic Transcoder is represented by a deprecated SDK client whose transitive dependencies still produce an npm audit finding. Replacing the media-transcoding integration requires a deliberate behavior migration; do not use a forced audit update as a substitute.
