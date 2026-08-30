# Flowtale

Flowtale is a monorepo for creating, editing, publishing, and measuring interactive product demos. This repository contains the existing application baseline; the planned screenshot/HTML recording split, zoom behavior, and provider-agnostic AI/TTS work are intentionally outside this baseline change.

## Repository map

| Path | Responsibility | Toolchain |
| --- | --- | --- |
| `api/` | Spring Boot API, persistence, publishing, and analytics endpoints | Java 17, Maven Wrapper |
| `app/workspace/packages/common/` | Contracts and shared browser/application logic | Node 22.23.2, Yarn 1.22.22 |
| `app/workspace/packages/client/` | React editor, player, analytics, and administration UI | Node 22.23.2, Yarn 1.22.22 |
| `app/workspace/packages/ext-tour/` | Browser extension recorder and capture pipeline | Node 22.23.2, Yarn 1.22.22 |
| `jobs/` | Asynchronous processing and HTTP job handlers | Node 22.23.2, npm 10.9.8 |
| `Storylane.zip` | Reference extension source used for product analysis | Reference only |

The frontend is one Yarn workspace rooted at `app/workspace`. The jobs service is deliberately a separate npm project. Do not install dependencies from `app/` or mix package managers within either project.

## Baseline verification

The root GitHub Actions workflow runs the same supported toolchains and gates every push to `main` and every pull request.

### API

```powershell
Set-Location api
./mvnw.cmd --batch-mode --no-transfer-progress verify
Set-Location ..
git diff --exit-code -- api/gen/api-contract.d.ts
```

The integration-test profile uses isolated in-memory databases and mocks external queue, JWT, settings, and webhook boundaries. No cloud credentials are required for the test suite.

### Frontend and extension

```powershell
Set-Location app/workspace
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --frozen-lockfile
yarn workspace @fable/common build
yarn workspace @fable/common lint
yarn workspace @fable/client lint
yarn workspace @fable/ext-tour lint
yarn workspace @fable/common test --runInBand
$env:CI = "true"
yarn workspace @fable/client test --watchAll=false --runInBand
Remove-Item Env:CI
yarn workspace @fable/ext-tour test --runInBand
yarn workspace @fable/ext-tour build-local
$env:CI = "false"
yarn workspace @fable/client build-staging
Remove-Item Env:CI
```

### Jobs

```powershell
Set-Location jobs
npm ci
npm run lint
npm test -- --runInBand
npm run build
docker build --tag flowtale-jobs:local .
```

## Known baseline debt

- Lint currently passes with an inherited warning backlog. New work should avoid increasing it; reducing it can be handled incrementally.
- The jobs dependency graph still reports audit findings, including a critical issue inherited through the deprecated AWS Elastic Transcoder client. Replacing that service client is a separate behavior-changing migration and should not be hidden behind a forced lockfile override.
- Some frontend test and build dependencies are old enough to emit peer-dependency, Browserslist, or deprecation warnings. They remain pinned to avoid coupling a broad framework upgrade to feature development.
- The core HTML recording, creation, preview, editor, and analytics flow can use Docker-backed MySQL, PostgreSQL, and LocalStack S3/SQS. Authentication still uses the configured Auth0 tenant, and optional billing, AI, media, and integration features remain separate provider work.

This baseline means clean installs, compilation, lint without errors, automated tests, deterministic generated contracts, and production artifact builds are reproducible. It does not claim that inherited technical debt is zero.
