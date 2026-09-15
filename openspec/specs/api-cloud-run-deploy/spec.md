# api-cloud-run-deploy Specification

## Purpose

Defines the deployment of the NestJS BFF (`apps/api`) to Google Cloud Run from `develop`: a lean, self-contained container image built with the repo's NX prune pattern (the runtime stage ships only `apps/api/dist` with its own production `node_modules`, including `@eco-metrics/shared` via `copy-workspace-modules`), a GitHub Actions workflow that authenticates to GCP via Workload Identity Federation (OIDC — no service-account JSON keys), publishes immutable SHA-tagged images to Artifact Registry, and deploys the `eco-metrics-api` service with a `/api/v1/health` startup probe, scale-to-zero, and unauthenticated access. The GCP/GitHub/Vercel configuration is a user-executed runbook (`docs/deploy/cloud-run.md`): the repo side (Dockerfile, `.dockerignore`, workflow, runbook) is committed with this change, and the first deploy happens when the user executes the runbook after the change is pushed.

## Requirements

### Requirement: Multi-stage Docker image builds a self-contained apps/api runtime

A `Dockerfile` SHALL exist at the repository root (build context = repo root). It SHALL be multi-stage with both stages based on `node:24-alpine` (matching `.nvmrc`).

The **builder stage** SHALL, in order: copy the root manifests (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`) and the workspace manifests (`apps/api/package.json`, `packages/shared/package.json`) first (layer-cache friendly); run `HUSKY=0 npm ci` (full install — NX and webpack are dev dependencies; `HUSKY=0` because `.git` is not in the context, mirroring the `release.yml` convention; `legacy-peer-deps` comes from the copied `.npmrc`); copy the `apps/api` and `packages/shared` sources; run `npx nx run api:prune` (which triggers `build` → `prune-lockfile` → `copy-workspace-modules` and emits `apps/api/dist` with `main.js`, `data/water-footprint.json`, a pruned `package.json` carrying `"@eco-metrics/shared": "file:./workspace_modules/@eco-metrics/shared"`, and `workspace_modules/@eco-metrics/shared` including its built `dist/`); then produce the runtime dependencies **inside** `apps/api/dist` by copying the root `overrides` block (security pins, e.g. `multer@2.3.0`) into the pruned `package.json` and running `npm install --omit=dev --legacy-peer-deps --ignore-scripts` there. The pruned `package-lock.json` emitted by `prune-lockfile` SHALL NOT be used for the dist install (it is inconsistent for this repo's cross-workspace hoisting and overrides — see design.md D2).

The **runtime stage** SHALL copy only `apps/api/dist` from the builder (as `/app`), set `ENV NODE_ENV=production`, run as non-root (`USER node`, with `--chown=node:node` on the copy), declare `EXPOSE 8080` as documentation, and set `CMD ["node", "main.js"]`. The image SHALL NOT contain a `HEALTHCHECK` instruction (Cloud Run uses service-level startup-probe configuration, not the Docker directive). The final image SHALL be fully self-contained: `node main.js` resolves every dependency — including `@eco-metrics/shared` — from `/app/node_modules`, with no workspace tree, no root `node_modules`, and no `.env` file in the image.

#### Scenario: Image builds from a clean checkout

- **GIVEN** a clean checkout of the repository (no `node_modules`, no `dist`) and the root build context filtered by `.dockerignore`
- **WHEN** `docker build .` runs
- **THEN** the build completes successfully, producing `apps/api/dist` inside the builder via the NX prune chain
- **AND** the runtime stage contains `/app/main.js`, `/app/data/water-footprint.json`, `/app/node_modules`, and `/app/workspace_modules`

#### Scenario: Self-contained runtime boots without the workspace

- **GIVEN** the built runtime image (or an equivalent extraction of `apps/api/dist` with its `node_modules`) placed in isolation, with no parent `node_modules` and no workspace files
- **WHEN** `PORT=8080 NODE_ENV=production CORS_ORIGIN=<url> SWAGGER_ENABLED=false node main.js` runs
- **THEN** the NestJS app starts and listens on the injected `PORT`
- **AND** `GET /api/v1/health` returns `200` with `{ "status": "ok" }`
- **AND** `GET /api/v1/water-footprint/products` returns `200` with `success: true` and 52 products

#### Scenario: Security pins are preserved in the image

- **WHEN** the runtime dependencies are installed inside `apps/api/dist`
- **THEN** the root `package.json` `overrides` block is applied (e.g. `multer` resolves to the pinned `2.3.0`, not the vulnerable natural transitive version)

#### Scenario: Image runs as non-root

- **WHEN** the runtime container starts
- **THEN** the Node process runs as the `node` user (not root)

#### Scenario: No local environment files ship in the image

- **WHEN** the image is built
- **THEN** no `.env` file (and no `gha-creds-*.json` credentials file) is present in any layer

### Requirement: Docker build context excludes everything the API build does not need

A `.dockerignore` SHALL exist at the repository root (Docker only honors it there). It SHALL exclude at minimum: `node_modules` (all levels), `.git`, `.github`, `.nx`, `.husky`, `.vercel`, `apps/web` (deployed on Vercel; its absence from the context is safe — npm skips the missing workspace, empirically verified), all build outputs (`dist`, `.next`, `out-tsc`, `test-output`, `coverage`, `*.tsbuildinfo`), tests (`**/__tests__`, `**/*.spec.ts`, `**/*.test.ts`, `**/*.test.tsx`, `e2e`), documentation/spec folders (`openspec`, `docs`), local environment files (`**/.env`), and `gha-creds-*.json` (credentials generated by `google-github-actions/auth`). The exclusion set SHALL NOT exclude anything `nx build api` needs (root manifests, `nx.json`, `tsconfig.base.json`, `apps/api` sources/config, `packages/shared` sources/config).

#### Scenario: Context stays small

- **WHEN** the Docker build context is assembled
- **THEN** its size is on the order of a few MB (no `node_modules`, no build outputs, no `apps/web`)

#### Scenario: Exclusions never break the API build

- **GIVEN** the `.dockerignore` in effect
- **WHEN** `npx nx run api:prune` runs inside the builder stage
- **THEN** it succeeds — every file the `api` and `shared` builds need is present in the context

### Requirement: apps/api declares @eco-metrics/shared as a workspace dependency

`apps/api/package.json` SHALL declare `"@eco-metrics/shared": "*"` in `dependencies` (npm links the local workspace package; `*` is deterministic for workspace-internal packages — there is no registry version to pin). This makes the existing runtime dependency (previously implicit via the tsconfig path alias) explicit, which is what lets `@nx/js:copy-workspace-modules` populate `dist/workspace_modules` and `prune-lockfile` emit the `file:` reference. The root `package-lock.json` SHALL be regenerated (`npm install`) in the same change.

#### Scenario: copy-workspace-modules populates the deployable dist

- **WHEN** `npx nx run api:prune` runs with the dependency declared
- **THEN** `apps/api/dist/workspace_modules/@eco-metrics/shared/` exists and contains the built `dist/index.js`
- **AND** the pruned `apps/api/dist/package.json` references `"@eco-metrics/shared": "file:./workspace_modules/@eco-metrics/shared"`

#### Scenario: Local development is unaffected

- **WHEN** the dependency is declared and `npm install` runs in the full workspace
- **THEN** local dev, unit tests, and E2E behave exactly as before (the symlinked workspace package and the tsconfig path alias resolve to the same source)

### Requirement: Deploy workflow triggers on api-affecting pushes to develop, with a manual trigger

`.github/workflows/deploy-api.yml` SHALL exist. It SHALL trigger on push to `develop` with a `paths:` filter covering exactly the inputs that can change the API image: `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`. It SHALL also expose `workflow_dispatch` (used for the first deploy, before any api-affecting push exists). It SHALL declare `permissions: contents: read, id-token: write` (required for OIDC) and a `concurrency` group (`deploy-api`, `cancel-in-progress: false`) so overlapping deploys queue instead of racing.

#### Scenario: api-only push deploys

- **GIVEN** a push to `develop` where every changed file matches the `paths:` filter (e.g. only `apps/api/**`)
- **WHEN** GitHub Actions evaluates the workflow
- **THEN** the deploy workflow runs
- **AND** the Vercel build for the same push is skipped by `scripts/vercel-ignore.sh` (mirror behavior)

#### Scenario: web-only push does not deploy

- **GIVEN** a push to `develop` touching only `apps/web/**`
- **WHEN** GitHub Actions evaluates the workflow
- **THEN** the deploy workflow does not run (paths filter not matched)
- **AND** Vercel builds and deploys the web app

#### Scenario: manual dispatch for the first deploy

- **WHEN** the user triggers `workflow_dispatch` from the Actions tab (per the runbook)
- **THEN** the workflow builds and deploys the current `develop` HEAD regardless of changed paths

### Requirement: Workflow authenticates to GCP via Workload Identity Federation without keys

The workflow SHALL authenticate with `google-github-actions/auth@v3` using `workload_identity_provider` + `service_account` (WIF through a service account) and `token_format: access_token` for the Docker registry login. It SHALL NOT use service-account JSON key secrets anywhere. The Docker login SHALL use `docker/login-action` with `username: oauth2accesstoken` and the auth step's `access_token` output against the `<region>-docker.pkg.dev` registry.

#### Scenario: No long-lived credentials in the repo

- **WHEN** the workflow file and repository variables are reviewed
- **THEN** no service-account key JSON exists as a secret or in any file — only non-sensitive identifiers (project ID, region, WIF provider name, service-account email, CORS origin)

#### Scenario: Auth failure fails the deploy loudly

- **GIVEN** a missing or mistyped `WIF_PROVIDER`/`WIF_SERVICE_ACCOUNT` variable, or IAM propagation not yet complete (can take ~5 minutes after setup)
- **WHEN** the auth step runs
- **THEN** the workflow fails at that step with Google's auth error — no image is built or deployed

### Requirement: Images are published to Artifact Registry with immutable SHA tags

The workflow SHALL build the image as `<GCP_REGION>-docker.pkg.dev/<GCP_PROJECT_ID>/eco-metrics/api:<commit-sha>` and push it to the `eco-metrics` Artifact Registry Docker repository. It SHALL NOT use mutable tags (no `:latest`) — each deploy references the exact commit SHA; rollbacks use Cloud Run revision traffic or redeploying an older SHA tag.

#### Scenario: Push denied without artifactregistry.writer

- **GIVEN** the deployer service account lacks `roles/artifactregistry.writer`
- **WHEN** the image push step runs
- **THEN** the push fails with a permissions error and the workflow stops before deploying

#### Scenario: Every deploy is traceable to a commit

- **WHEN** a deploy completes
- **THEN** the deployed image tag equals the triggering commit's SHA (visible in the workflow run and in Cloud Run's revision details)

### Requirement: Cloud Run service is configured for scale-to-zero with a health startup probe

The workflow SHALL deploy with `google-github-actions/deploy-cloudrun@v3` to service `eco-metrics-api` in the region from `GCP_REGION`, with: a startup probe on `GET /api/v1/health` (container port 8080, e.g. `--startup-probe=httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=2,timeoutSeconds=2,failureThreshold=15`); `--min-instances=0` (explicit scale-to-zero); `--allow-unauthenticated` (the BFF is an intentionally public API consumed server-side by Vercel without credentials); explicit resource defaults (`--cpu=1 --memory=512Mi`, free-tier-safe); and env vars `NODE_ENV=production`, `CORS_ORIGIN` (from the `CORS_ORIGIN` GitHub variable — the Vercel production URL), `SWAGGER_ENABLED=false`. The workflow SHALL NEVER set a `PORT` env var (Cloud Run injects `PORT=8080`; the app reads it via `AppConfigService.port` and Joi coerces the string). The deploy step's built-in deploy health check (default on) SHALL be relied upon: if the startup probe fails, the workflow fails and traffic stays on the last healthy revision.

#### Scenario: PORT is injected, never configured

- **WHEN** the Cloud Run service configuration is inspected after deploy
- **THEN** `PORT` is not present in the service's env vars — Cloud Run injects it into the container at runtime
- **AND** the app listens on the injected port (Joi `Joi.number().port()` coerces the `8080` string)

#### Scenario: Startup probe gates traffic

- **GIVEN** a revision whose container fails to start (e.g. a bad image)
- **WHEN** the deploy runs
- **THEN** the startup probe never passes, the deploy step fails, and the previous healthy revision keeps serving traffic

#### Scenario: Scale to zero between traffic

- **WHEN** the service receives no requests
- **THEN** Cloud Run scales the instance count to zero (no idle billing)
- **AND** the next request pays a ~1–3 s cold start, absorbed by the web app's ISR background revalidation

#### Scenario: CORS allows the Vercel production origin

- **GIVEN** `CORS_ORIGIN` set to the Vercel production URL in the GitHub variables
- **WHEN** a browser request from that origin hits any API route (e.g. the Swagger UI in a dev-enabled deployment)
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

### Requirement: Required GitHub variables are documented and fail fast

The workflow SHALL read exactly five repository **variables** (Settings → Secrets and variables → Actions → Variables — none are sensitive credentials): `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `CORS_ORIGIN`. A pre-flight step SHALL fail the workflow with a clear message if any of them is unset.

#### Scenario: Missing variable fails before any GCP call

- **GIVEN** one of the five variables unset (e.g. `CORS_ORIGIN`)
- **WHEN** the workflow runs
- **THEN** it fails at the pre-flight check with a message naming the missing variable — no auth, build, or deploy is attempted

### Requirement: Post-deploy verification proves the deployed BFF end-to-end

The runbook SHALL define the user-executed verification (curl + browser — not automated specs): `GET /api/v1/health` on the deployed `*.run.app` URL returns `200` `{ "status": "ok" }`; `GET /api/v1/water-footprint/products` returns `success: true` with 52 products; after setting `API_BASE_URL=https://<run-url>/api/v1` in Vercel (Production AND Preview) and a redeploy (or ISR self-heal within 24 h), the deployed `/water-footprint/` page renders the product table from the deployed BFF.

#### Scenario: Health on the deployed URL

- **WHEN** `curl https://eco-metrics-api-<hash>.<region>.run.app/api/v1/health` runs after deploy
- **THEN** the response is `200` with `{ "status": "ok" }` (never `429` — the health route is throttler-exempt)

#### Scenario: Full dataset on the deployed URL

- **WHEN** `curl https://<run-url>/api/v1/water-footprint/products` runs
- **THEN** the response is `200` with `success: true` and `data` containing 52 products

#### Scenario: The deployed web page renders from the deployed BFF

- **GIVEN** `API_BASE_URL` set in Vercel to the deployed API and the web app redeployed (or ISR revalidation elapsed)
- **WHEN** a visitor loads `/water-footprint/`
- **THEN** the product table renders with real data (server-rendered HTML contains product names)

### Requirement: A user-executed runbook documents the entire GCP/GitHub/Vercel setup

`docs/deploy/cloud-run.md` SHALL exist as the single runbook the user follows after this change is pushed. It SHALL cover, in order: GCP project selection/creation and billing prerequisite (the always-free tier requires an active billing account); enabling the required APIs (Cloud Run, Artifact Registry, IAM, IAM Service Account Credentials, Security Token Service); `gcloud` CLI login; creating the `eco-metrics` Artifact Registry Docker repository; creating the `github-deployer` service account with `roles/run.admin` + `roles/artifactregistry.writer` (project-level) and `roles/iam.serviceAccountUser` on the Compute Engine default service account (the actAs requirement for Cloud Run deploys); creating the WIF pool and OIDC provider (issuer `https://token.actions.githubusercontent.com`, attribute mapping, and an attribute condition restricting to the repository `maf248/eco-metrics-earth`); granting `roles/iam.workloadIdentityUser` to the repository's principal set; extracting the provider full name; setting the five GitHub variables; the ~5-minute IAM propagation note; triggering the first deploy (push or `workflow_dispatch`); recording the `https://eco-metrics-api-<hash>.<region>.run.app` URL; the verification curls; setting `API_BASE_URL` in Vercel for Production AND Preview; the optional path-filter verification pushes (web-only → no Cloud Run deploy; api-only → no Vercel build); always-free limits (2M requests/month, 180,000 vCPU-seconds, 360,000 GiB-seconds — this project's volume is hundreds of requests) with a billing-alert recommendation and an Artifact Registry storage note (~0.5 GB free; images are ~100 MB compressed; occasional tag cleanup or a cleanup policy keeps storage trivial); and a troubleshooting section (WIF auth errors, image push denied, startup probe timeout with `gcloud run services logs read`, cold-start first request).

#### Scenario: A developer can go from zero to a deployed API using only the runbook

- **GIVEN** a GCP account with billing enabled, the `gcloud` CLI, and admin access to the GitHub repo and Vercel project
- **WHEN** the user follows `docs/deploy/cloud-run.md` top to bottom
- **THEN** the API is deployed on Cloud Run, verified with the curls, and consumed by the deployed web app

#### Scenario: Troubleshooting covers the known failure modes

- **WHEN** a deploy fails
- **THEN** the troubleshooting section has an entry matching the symptom (auth error / push denied / probe timeout / cold start) with the diagnostic command and fix

### Requirement: No stale Railway references remain in tracked files

After the sweep, a case-insensitive search for `railway` over tracked files SHALL return zero matches, excluding `openspec/changes/archive/**` (intentional history) and generated/ignored paths (`.nx/`, build outputs). The swept files are: `apps/api/src/main.ts` (Swagger `.addServer` Railway line — removed; the production server entry is re-added with the real `*.run.app` URL as a post-deploy follow-up), `apps/api/README.md` and root `README.md` (deploy target line + deploy section), `AGENTS.md` (deploy targets line), `scripts/vercel-ignore.sh` (comment + denylist extension), `apps/web/__tests__/lib/apiBaseUrl.test.ts` (fixture URL → `*.run.app` example), `apps/web/.env.example` (production comment), `openspec/specs/water-footprint-page/spec.md` (scenario example URL), and `ROADMAP.md` (P3 rewrite + P2/I02/I03/I11 mentions).

#### Scenario: Reference sweep is complete

- **WHEN** `grep -ri railway` runs over the repository excluding `openspec/changes/archive/`, `.nx/`, `node_modules/`, and gitignored build outputs
- **THEN** zero matches are returned

#### Scenario: Archives keep their history

- **WHEN** the same search includes `openspec/changes/archive/**`
- **THEN** historical Railway mentions are still present (intentionally untouched)
