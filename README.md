# Fable

Fable is a monorepo for creating, editing, publishing, and measuring interactive product demos. [implementation.md](implementation.md) defines scope and completion gates. Phase 0 core implementation is accepted with [validation evidence](phase0-review.md). Follow the [asset privacy cutover](api/capture-asset-migration.md) before production deployment. The new document architecture, visual editor and AI architecture remain future phases.

## Local development without cloud credentials

Install Docker with Linux containers and Node.js (22.23.2 is the supported development version), then run from the repository root:

```powershell
node scripts/local-dev.mjs start
```

This verifies the API with pinned Maven/Java 17, checks generated contracts, builds the Node 22 frontend and FFmpeg worker, applies MySQL/PostgreSQL migrations, initializes local object storage/queues, seeds development settings and waits for service readiness. The first run downloads images and dependencies. Open [local Fable](http://localhost:3000/login) and choose `user-a@fable.local` or `user-b@fable.local`. These are fixed development identities; no passwords or Auth0 keys are needed.

Only the gateway binds host ports, all on loopback: client `3000`, API `18080`, jobs `18081`, S3 `14566`. Databases, the queue and application services run on an isolated internal network. Stop any unrelated process using these ports before starting. The fixed credentials and local authentication must never be used in a deployed environment; production refuses the local identity configuration.

```powershell
node scripts/local-dev.mjs status
node scripts/local-dev.mjs logs
node scripts/local-dev.mjs stop
```

Stopping retains development volumes. Startup fails on verification/build/migration errors and retains existing data. The script stops the API before rebuilding its mounted JAR. Re-run `start` after API changes. Frontend source is copied into the image; after a client change use `docker compose -f api/compose.local.yml up -d --build --no-deps client`. Rebuild shared code through the same image build. The local client image includes development-only characterization routes that production builds exclude.

Startup also builds the local Chrome extension at `app/workspace/packages/ext-tour/build/pinned`. Load that directory as an unpacked extension in Chrome's developer mode. `node scripts/local-dev.mjs build-extension` rebuilds it independently using the pinned toolchain. The separate `playwright.extension.config.ts` exercises actual recording and recovery in isolated browser profiles; the product suite uses that same artifact for manual creation.

Local objects use pinned SeaweedFS with persistent metadata and data; SQS uses pinned ElasticMQ with synchronous H2 persistence. Both use dedicated volumes. `node scripts/local-dev.mjs verify-restart` writes isolated verification fixtures, stops and restarts the whole local stack, and checks object contents, permissions, queued work and acknowledgements. This briefly interrupts local development. It never deletes development volumes. Local emulation does not replace deployment validation against AWS.

Local subscriptions are explicit fixtures and local plan gates grant development access. Billing, email, CRM, AI and speech-provider calls are disabled or report that they are unconfigured. Local audio/video upload, FFmpeg processing and playback use the real API, databases, SQS and object storage. Onboarding and media browser tests create/reuse their own workspaces; representative demo seeds and the remaining Phase 0 acceptance flows are still being completed.

To run product-route browser checks after startup:

```powershell
Set-Location app/workspace
corepack yarn install --frozen-lockfile
corepack yarn test:e2e:install
node node_modules/@playwright/test/cli.js test --config playwright.product.config.ts
```

These tests require the whole local stack. The separate default Playwright configuration starts a development server for isolated editor/storage characterization.

## Repository map

| Path | Responsibility | Toolchain |
| --- | --- | --- |
| `api/` | Spring Boot API, persistence, publishing, and analytics endpoints | Java 17, Maven Wrapper |
| `app/workspace/packages/common/` | Contracts and shared browser/application logic | Node 22.23.2, Yarn 1.22.22 |
| `app/workspace/packages/client/` | React editor, player, analytics, and administration UI | Node 22.23.2, Yarn 1.22.22 |
| `app/workspace/packages/ext-tour/` | Browser extension recorder and capture pipeline | Node 22.23.2, Yarn 1.22.22 |
| `jobs/` | Asynchronous processing and HTTP job handlers | Node 22.23.2, npm 10.9.8 |
| `implementation.md` | Product architecture, migration requirements and phase gates | Specification |

The frontend is one Yarn workspace rooted at `app/workspace`. The jobs service is deliberately a separate npm project. Do not install dependencies from `app/` or mix package managers within either project.

## Baseline verification

The root GitHub Actions workflow defines supported-toolchain checks for pushes to `main` and pull requests. Local full-stack CI integration remains part of the open Phase 0 work.

### API

```powershell
Set-Location api
./mvnw.cmd --batch-mode --no-transfer-progress verify
Set-Location ..
git diff --exit-code -- api/gen/api-contract.d.ts
```

The integration-test profile uses isolated in-memory databases and mocks external queue, JWT, settings, and webhook boundaries. No cloud credentials are required for this suite. Product-route browser tests additionally exercise the real local MySQL, PostgreSQL, object storage and queue services.

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

The `local` frontend profile explicitly enables `REACT_APP_LOCAL_FULL_ACCESS` so plan-based UI gates do not block
local end-to-end testing. Staging and production profiles omit the flag and keep the existing entitlement checks.

### Jobs

```powershell
Set-Location jobs
npm ci
npm run lint
docker build --target test --tag fable-jobs:test .
npm run build
docker build --tag fable-jobs:local .
```

## Known baseline debt

- Lint currently passes with an inherited warning backlog. New work should avoid increasing it; reducing it can be handled incrementally.
- The retired AWS Elastic Transcoder dependency has been replaced with a pinned FFmpeg worker. Jobs audit and deployment/license validation must be rechecked against the final Phase 0 lockfile and image.
- Some frontend test and build dependencies are old enough to emit peer-dependency, Browserslist, or deprecation warnings. They remain pinned to avoid coupling a broad framework upgrade to feature development.
- The bounded Phase 0 core has passing local browser evidence for capture/recovery, editing, publication/privacy and media. Production/CDN cutover and deferred product qualification remain explicitly recorded in `phase0-review.md`.

Phase 1 can begin from the accepted core foundation. Preserve the Phase 0 regression suite and follow the remaining gates in `implementation.md`.
