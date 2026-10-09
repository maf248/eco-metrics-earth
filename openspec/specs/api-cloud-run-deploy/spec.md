# api-cloud-run-deploy Specification

## Purpose

Defines the deployment of the NestJS BFF (`apps/api`) to Google Cloud Run from `develop`: a lean, self-contained container image built with the repo's NX prune pattern (the runtime stage ships only `apps/api/dist` with its own production `node_modules`, including `@eco-metrics/shared` via `copy-workspace-modules`), a GitHub Actions workflow that authenticates to GCP via Workload Identity Federation (OIDC — no service-account JSON keys), publishes immutable SHA-tagged images to Artifact Registry, and deploys the `eco-metrics-api` service with a `/api/v1/health` startup probe, scale-to-zero, and unauthenticated access. The GCP/GitHub/Vercel configuration is a user-executed runbook (`docs/deploy/cloud-run.md`): the repo side (Dockerfile, `.dockerignore`, workflow, runbook) is committed with this change, and the first deploy happens when the user executes the runbook after the change is pushed.

## Requirements

### Requirement: Multi-stage Docker image builds a self-contained apps/api runtime

A `Dockerfile` SHALL exist at the repository root (build context = repo root). It SHALL be multi-stage with both stages based on `node:24-alpine` (matching `.nvmrc`; the tag stays floating in this change — see design.md D6).

The **builder stage** SHALL, in order: copy the root manifests (`package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`) and the workspace manifests (`apps/api/package.json`, `packages/shared/package.json`) first (layer-cache friendly); run `HUSKY=0 npm ci` (full install — NX and webpack are dev dependencies; `HUSKY=0` because `.git` is not in the context, mirroring the `release.yml` convention; `legacy-peer-deps` comes from the copied `.npmrc`); copy the `apps/api` and `packages/shared` sources; run `npx nx run api:prune` (which triggers `build` → `prune-lockfile` → `copy-workspace-modules` and emits `apps/api/dist` with `main.js`, `data/water-footprint.json`, a pruned `package.json` carrying `"@eco-metrics/shared": "file:./workspace_modules/@eco-metrics/shared"`, a pruned `package-lock.json`, and `workspace_modules/@eco-metrics/shared` including its built `dist/`); then install the runtime dependencies **inside** `apps/api/dist` with `npm ci --omit=dev --ignore-scripts` (plus `--no-audit --no-fund`) **from the pruned `package-lock.json` emitted by `prune-lockfile`**, so every transitive dependency resolves to the exact version recorded in the root lockfile. The Dockerfile SHALL NOT delete or regenerate the pruned lockfile, SHALL NOT use `npm install` for the dist install, and SHALL NOT use `--legacy-peer-deps` for it. The root `overrides` block (security pins) SHALL NOT be copied into `dist/package.json`: the pins are already resolved in the root lockfile and carried into the pruned lockfile (see design.md D3).

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
- **AND** `GET /api/v1/water-footprint/products` returns `200` with `success: true` and 60 products

#### Scenario: Security pins are preserved in the image

- **WHEN** the runtime dependencies are installed inside `apps/api/dist` from the pruned lockfile
- **THEN** each exact-version pin in the root `package.json` `overrides` block that applies to a production dependency (e.g. `multer`) resolves to the pinned version, not the vulnerable natural transitive version
- **AND** this holds without the `overrides` block being present in `apps/api/dist/package.json`

#### Scenario: Image runs as non-root

- **WHEN** the runtime container starts
- **THEN** the Node process runs as the `node` user (not root)

#### Scenario: No local environment files ship in the image

- **WHEN** the image is built
- **THEN** no `.env` file (and no `gha-creds-*.json` credentials file) is present in any layer

#### Scenario: Production install is reproducible from the pruned lockfile

- **GIVEN** the same commit built twice at different times, with no change to `package-lock.json`
- **WHEN** `npm ci --omit=dev --ignore-scripts` runs in `apps/api/dist` for each build
- **THEN** both installs resolve identical versions for every package (no transitive dependency is re-resolved against the registry)
- **AND** `npm ls --omit=dev` inside the image reports no missing, invalid, or extraneous packages

#### Scenario: An inconsistent pruned lockfile fails the image build

- **GIVEN** a `package-lock.json` for which the pruned lockfile does not satisfy the pruned `package.json`
- **WHEN** the builder runs `npm ci --omit=dev --ignore-scripts` in `apps/api/dist`
- **THEN** the command fails and the image is not built (the lockfile is never silently discarded or regenerated)

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

### Requirement: Deploy workflow is reusable, manually triggerable, and serializes deploys

`.github/workflows/deploy-api.yml` SHALL exist and SHALL be a **reusable workflow**: it SHALL declare `on: workflow_call` (invoked by the CI workflow after the CI job passes — see "Automatic API deploys are gated by the CI job on the same commit") and `on: workflow_dispatch` (manual deploys, used for the first deploy and for ad-hoc redeploys). It SHALL NOT declare a `push` or `pull_request` trigger and SHALL NOT use `workflow_run`. The former `paths:` filter is replaced by in-workflow change detection (see "Automatic deploys are skipped when nothing api-affecting changed since the deployed commit"). A `workflow_dispatch` run SHALL always build and deploy the dispatched ref's HEAD, skipping change detection; it runs the workflow YAML of the ref it is dispatched from, which is how changes to the deploy workflow are testable from a branch before merge. The deploy job SHALL declare `permissions: contents: read, id-token: write` (required for OIDC; for `workflow_call`, the calling job SHALL grant the same, because a called workflow can only downgrade the caller's token permissions) and SHALL declare a job-level `concurrency` group with the **literal** name `deploy-api` and `cancel-in-progress: false` (the group name SHALL NOT use `${{ github.workflow }}`, which resolves to the caller's name inside a called workflow). Automatic and manual deploys therefore share one group and queue instead of racing; the concurrency group is declared only in the deploy workflow, not in the caller.

#### Scenario: api-only push deploys

- **GIVEN** a push to `develop` whose CI job passed and where every file changed since the currently deployed commit matches the api-affecting path list (e.g. only `apps/api/**`)
- **WHEN** the deploy workflow runs
- **THEN** change detection decides to deploy and the image is built, pushed, and deployed
- **AND** the Vercel build for the same push is skipped by `scripts/vercel-ignore.sh` (mirror behavior)

#### Scenario: web-only push does not deploy

- **GIVEN** a push to `develop` touching only `apps/web/**`, whose CI job passed
- **WHEN** the deploy workflow runs
- **THEN** change detection finds no api-affecting file between the deployed commit and the pushed commit and the image build, push, and deploy steps are skipped
- **AND** Vercel builds and deploys the web app

#### Scenario: manual dispatch for the first deploy

- **WHEN** the user triggers `workflow_dispatch` from the Actions tab (per the runbook)
- **THEN** the workflow builds and deploys the dispatched ref's HEAD regardless of changed paths, without consulting the deployed commit

#### Scenario: Deploy workflow changes are testable from a branch

- **GIVEN** a branch that modifies `deploy-api.yml`
- **WHEN** the user dispatches the workflow from that branch
- **THEN** the run uses the branch's version of the YAML

#### Scenario: Overlapping deploys queue and never cancel a running deploy

- **GIVEN** a deploy running for commit A and a newer commit B (or a manual dispatch) requesting a deploy
- **WHEN** B reaches the deploy job
- **THEN** B waits in the `deploy-api` concurrency group until A finishes
- **AND** A is not cancelled

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

The workflow SHALL deploy with `google-github-actions/deploy-cloudrun@v3` to service `eco-metrics-api` in the region from `GCP_REGION`, with: a startup probe on `GET /api/v1/health` (container port 8080, e.g. `--startup-probe=httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=2,timeoutSeconds=2,failureThreshold=15`); `--min-instances=0` (explicit scale-to-zero); `--allow-unauthenticated` (the BFF is an intentionally public API consumed server-side by Vercel without credentials); explicit resource defaults (`--cpu=1 --memory=512Mi`, free-tier-safe); and env vars `NODE_ENV=production`, `CORS_ORIGIN` (from the `CORS_ORIGIN` GitHub variable — a comma-separated list of allowed origins; the workflow escapes `\` and `,` per the deploy action's documented `env_vars` escaping rules so a multi-origin list reaches the service intact instead of being split into bogus entries), `CORS_ORIGIN_PATTERN` (from the optional `CORS_ORIGIN_PATTERN` GitHub variable, escaped the same way, passed only when the variable is set), `SWAGGER_ENABLED=false`. The workflow SHALL NEVER set a `PORT` env var (Cloud Run injects `PORT=8080`; the app reads it via `AppConfigService.port` and Joi coerces the string). The deploy step's built-in deploy health check (default on) SHALL be relied upon: if the startup probe fails, the workflow fails and traffic stays on the last healthy revision.

#### Scenario: PORT is injected, never configured

- **WHEN** the Cloud Run service configuration is inspected after deploy
- **THEN** `PORT` is not present in the service's env vars — Cloud Run injects it into the container at runtime
- **AND** the app listens on the injected port (Joi `Joi.number().port()` coerces the `8080` string)

#### Scenario: Startup probe gates traffic

- **GIVEN** a revision whose container fails to start (e.g., a bad image, or an invalid `CORS_ORIGIN`/`CORS_ORIGIN_PATTERN` value that fails Joi validation at boot)
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

#### Scenario: Comma-separated CORS_ORIGIN deploys intact

- **GIVEN** `CORS_ORIGIN` set to a multi-origin list (e.g. `http://localhost:3000,https://eco-metrics-earth.vercel.app`) in the GitHub variables
- **WHEN** the deploy runs
- **THEN** the service's `CORS_ORIGIN` env var contains the full comma-separated list — the value is not split at the first comma into a bogus env var entry
- **AND** a browser request from the second origin receives the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Preview origins allowed when the pattern variable is set

- **GIVEN** `CORS_ORIGIN_PATTERN` set to an anchored Vercel preview regex (e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`) in the GitHub variables
- **WHEN** a browser request from a matching preview origin hits any API route
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

### Requirement: Required GitHub variables are documented and fail fast

The workflow SHALL read exactly five **required** repository **variables** (Settings → Secrets and variables → Actions → Variables — none are sensitive credentials): `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `CORS_ORIGIN`. A pre-flight step SHALL fail the workflow with a clear message if any of them is unset. The workflow SHALL additionally read one **optional** variable: `CORS_ORIGIN_PATTERN` (an anchored regex allowing Vercel preview origins — unset or empty means no pattern is passed to the service). Because the deploy action merges env vars with the service's existing values, a `CORS_ORIGIN_PATTERN` value deployed earlier persists on the service after the GitHub variable is later unset — removing it requires also clearing it on the service (documented in the runbook's troubleshooting section).

#### Scenario: Missing variable fails before any GCP call

- **GIVEN** one of the five required variables unset (e.g. `CORS_ORIGIN`)
- **WHEN** the workflow runs
- **THEN** it fails at the pre-flight check with a message naming the missing variable — no auth, build, or deploy is attempted

#### Scenario: Optional pattern variable may be unset

- **GIVEN** `CORS_ORIGIN_PATTERN` unset or empty in the GitHub variables
- **WHEN** the workflow runs
- **THEN** the pre-flight check passes and the deploy proceeds, passing no `CORS_ORIGIN_PATTERN` env var to the service

### Requirement: Post-deploy verification proves the deployed BFF end-to-end

The runbook SHALL define the user-executed verification (curl + browser — not automated specs): `GET /api/v1/health` on the deployed `*.run.app` URL returns `200` `{ "status": "ok" }`; `GET /api/v1/water-footprint/products` returns `success: true` with 60 products; after setting `API_BASE_URL=https://<run-url>/api/v1` in Vercel (Production AND Preview) and a redeploy (or ISR self-heal within 24 h), the deployed `/water-footprint/` page renders the product table from the deployed BFF.

#### Scenario: Health on the deployed URL

- **WHEN** `curl https://eco-metrics-api-<hash>.<region>.run.app/api/v1/health` runs after deploy
- **THEN** the response is `200` with `{ "status": "ok" }` (never `429` — the health route is throttler-exempt)

#### Scenario: Full dataset on the deployed URL

- **WHEN** `curl https://<run-url>/api/v1/water-footprint/products` runs
- **THEN** the response is `200` with `success: true` and `data` containing 60 products

#### Scenario: The deployed web page renders from the deployed BFF

- **GIVEN** `API_BASE_URL` set in Vercel to the deployed API and the web app redeployed (or ISR revalidation elapsed)
- **WHEN** a visitor loads `/water-footprint/`
- **THEN** the product table renders with real data (server-rendered HTML contains product names)

### Requirement: A user-executed runbook documents the entire GCP/GitHub/Vercel setup

`docs/deploy/cloud-run.md` SHALL exist as the single runbook the user follows after this change is pushed. It SHALL cover, in order: GCP project selection/creation and billing prerequisite (the always-free tier requires an active billing account); enabling the required APIs (Cloud Run, Artifact Registry, IAM, IAM Service Account Credentials, Security Token Service); `gcloud` CLI login; creating the `eco-metrics` Artifact Registry Docker repository; creating the `github-deployer` service account with `roles/run.admin` + `roles/artifactregistry.writer` (project-level) and `roles/iam.serviceAccountUser` on the Compute Engine default service account (the actAs requirement for Cloud Run deploys); creating the WIF pool and OIDC provider (issuer `https://token.actions.githubusercontent.com`, attribute mapping, and an attribute condition restricting to the repository `maf248/eco-metrics-earth`); granting `roles/iam.workloadIdentityUser` to the repository's principal set; extracting the provider full name; setting the five required GitHub variables plus the optional `CORS_ORIGIN_PATTERN` (an anchored Vercel preview regex, e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$` — unset by default; the workflow escapes commas and backslashes automatically, so the variable holds the raw value with no manual escaping); the ~5-minute IAM propagation note; triggering the first deploy (merge to `develop` so the CI-gated pipeline runs, or `workflow_dispatch`, which skips the gate and change detection); recording the `https://eco-metrics-api-<hash>.<region>.run.app` URL; the verification curls; setting `API_BASE_URL` in Vercel for Production AND Preview; the optional change-detection verification (a web-only push → CI passes and the Deploy API job logs "skip" without building; an api-only push → the deploy job builds and deploys after CI; a red CI → no deploy job runs); always-free limits (2M requests/month, 180,000 vCPU-seconds, 360,000 GiB-seconds — this project's volume is hundreds of requests) with a billing-alert recommendation and an Artifact Registry storage note (~0.5 GB free; images are ~100 MB compressed; occasional tag cleanup or a cleanup policy keeps storage trivial); and a troubleshooting section (WIF auth errors, image push denied, startup probe timeout with `gcloud run services logs read`, cold-start first request, an invalid `CORS_ORIGIN`/`CORS_ORIGIN_PATTERN` value failing Joi validation at boot → startup probe timeout with the validation error in the service logs, unsetting the `CORS_ORIGIN_PATTERN` GitHub variable not removing the already-deployed env var from the service — clear it with `gcloud run services update eco-metrics-api --remove-env-vars CORS_ORIGIN_PATTERN` — and the CI gate: the deploy job skipped because CI failed or was cancelled, the deploy job skipping because change detection found no api-affecting change, forcing a deploy with `workflow_dispatch`, and `vars` not resolving in the called workflow).

#### Scenario: A developer can go from zero to a deployed API using only the runbook

- **GIVEN** a GCP account with billing enabled, the `gcloud` CLI, and admin access to the GitHub repo and Vercel project
- **WHEN** the user follows `docs/deploy/cloud-run.md` top to bottom
- **THEN** the API is deployed on Cloud Run, verified with the curls, and consumed by the deployed web app

#### Scenario: Troubleshooting covers the known failure modes

- **WHEN** a deploy fails or a CORS origin is rejected
- **THEN** the troubleshooting section has an entry matching the symptom (auth error / push denied / probe timeout / cold start / invalid CORS value at boot / stale pattern env var after unsetting the variable / deploy skipped by the gate or by change detection / variables unresolved in the called workflow) with the diagnostic command and fix

### Requirement: No stale Railway references remain in tracked files

After the sweep, a case-insensitive search for `railway` over tracked files SHALL return zero matches, excluding `openspec/changes/archive/**` (intentional history) and generated/ignored paths (`.nx/`, build outputs). The swept files are: `apps/api/src/main.ts` (Swagger `.addServer` Railway line — removed; the production server entry is re-added with the real `*.run.app` URL as a post-deploy follow-up), `apps/api/README.md` and root `README.md` (deploy target line + deploy section), `AGENTS.md` (deploy targets line), `scripts/vercel-ignore.sh` (comment + denylist extension), `apps/web/__tests__/lib/apiBaseUrl.test.ts` (fixture URL → `*.run.app` example), `apps/web/.env.example` (production comment), `openspec/specs/water-footprint-page/spec.md` (scenario example URL), and `ROADMAP.md` (P3 rewrite + P2/I02/I03 mentions and a since-removed icon-visibility item).

#### Scenario: Reference sweep is complete

- **WHEN** `grep -ri railway` runs over the repository excluding `openspec/changes/archive/`, `.nx/`, `node_modules/`, and gitignored build outputs
- **THEN** zero matches are returned

#### Scenario: Archives keep their history

- **WHEN** the same search includes `openspec/changes/archive/**`
- **THEN** historical Railway mentions are still present (intentionally untouched)

### Requirement: Deploy configures proxy hops and mounts the internal key from Secret Manager

The deploy workflow SHALL pass `TRUST_PROXY_HOPS=1` in the `env_vars` of the `deploy-cloudrun` step (Cloud Run's documented single front-end hop without an external load balancer). It SHALL provide `INTERNAL_API_KEY` to the service through the action's `secrets:` input referencing a Secret Manager secret (`INTERNAL_API_KEY=internal-api-key:latest`), never through `env_vars` or a GitHub variable/secret value. The pre-flight step SHALL NOT require any new GitHub variable. The Cloud Run runtime service account SHALL hold `roles/secretmanager.secretAccessor` on that secret (manual, documented). If the secret or the grant is missing, the revision SHALL fail to deploy (startup failure), keeping the previous healthy revision serving.

#### Scenario: Hop count is set on the service

- **WHEN** the workflow runs and the service configuration is inspected
- **THEN** the service env contains `TRUST_PROXY_HOPS=1`

#### Scenario: Internal key is mounted from Secret Manager, not stored in the repo

- **WHEN** the workflow file and the deployed service configuration are reviewed
- **THEN** `INTERNAL_API_KEY` appears as a secret reference (`secretKeyRef`) on the service, and no literal key value exists in the repo, workflow, or GitHub variables

#### Scenario: Missing secret grant fails the deploy safely

- **GIVEN** the runtime service account lacks `secretmanager.secretAccessor` on the secret
- **WHEN** the deploy runs
- **THEN** the new revision does not become ready and the previous revision keeps serving traffic

### Requirement: Runbook documents the manual secret setup and hop verification

`docs/deploy/cloud-run.md` SHALL document, with exact commands: creating the secret (`openssl rand -hex 32` piped to `gcloud secrets create internal-api-key --data-file=-`), granting `roles/secretmanager.secretAccessor` to the Cloud Run runtime service account, enabling `secretmanager.googleapis.com`, setting the same value as the server-only `INTERNAL_API_KEY` in Vercel (Production and Preview), key rotation (add new version, redeploy, update Vercel, disable old version), the per-instance limit caveat, and the post-deploy hop verification. The deployer service account needs no secret access unless the runbook states otherwise.

#### Scenario: Post-deploy hop verification

- **GIVEN** the API deployed with `TRUST_PROXY_HOPS=1`
- **WHEN** the user sends `curl -H 'X-Forwarded-For: 198.51.100.1' <run-url>/api/v1/water-footprint/products` repeatedly from two different networks and inspects Cloud Run logs / `X-RateLimit-Remaining`
- **THEN** each real network has its own counter, and a forged leftmost `X-Forwarded-For` value does not reset the counter
- **AND** if the observed client IP is wrong, only the `TRUST_PROXY_HOPS` env var is changed and redeployed (no code change)

#### Scenario: Vercel traffic is not throttled

- **GIVEN** `INTERNAL_API_KEY` set identically in Secret Manager and Vercel
- **WHEN** the web app revalidates a category page
- **THEN** the API receives `X-Internal-Api-Key` and the fetch succeeds regardless of the per-IP counters

### Requirement: Automatic API deploys are gated by the CI job on the same commit

The automatic API deploy SHALL run only as a job of the CI workflow (`.github/workflows/ci.yml`) that calls `./.github/workflows/deploy-api.yml` with `needs:` on the CI job `Format, Lint, Typecheck, Build & Test`. The calling job SHALL carry `if: github.event_name == 'push' && github.ref == 'refs/heads/develop'`, SHALL grant `permissions: contents: read, id-token: write`, and SHALL use `secrets: inherit` only if the called workflow requires secrets (it currently reads only `vars`, so it SHALL NOT). The image deployed SHALL be built from the same commit SHA that passed CI (image tag = `github.sha`, as today). If the CI job fails or is cancelled, the deploy job SHALL NOT run. The gate SHALL be expressed only through the branch condition and the target service name so that the future dev/production split (ROADMAP I11) changes the filter and target, not the mechanism.

#### Scenario: Green CI on develop deploys

- **GIVEN** a push to `develop`
- **WHEN** the CI job completes successfully
- **THEN** the deploy job starts, after the CI job, for the same commit SHA

#### Scenario: Red CI never deploys

- **GIVEN** a push to `develop` where the CI job fails (format, lint, typecheck, build, test, E2E, or the lockfile guard)
- **WHEN** the workflow run finishes
- **THEN** the deploy job is skipped and no image is pushed and no revision is created

#### Scenario: Superseded CI run does not deploy

- **GIVEN** a push to `develop` whose CI job is cancelled because a newer push superseded it
- **WHEN** the cancelled run finishes
- **THEN** its deploy job does not run (the newer push's pipeline decides)

#### Scenario: Other refs and pull requests never deploy

- **GIVEN** a push to a branch other than `develop`, a push to `main`, or a pull request
- **WHEN** the CI workflow runs
- **THEN** the deploy job is skipped

#### Scenario: Repository variables resolve inside the called workflow

- **GIVEN** the required repository variables are set
- **WHEN** the deploy workflow runs as a called workflow
- **THEN** the pre-flight step finds all of them (if `vars` do not resolve in the called workflow, the deploy values are passed as `workflow_call` inputs instead — design.md risk R3)

### Requirement: Automatic deploys are skipped when nothing api-affecting changed since the deployed commit

After the Google Cloud authentication step, a `workflow_call` run (not `workflow_dispatch`) SHALL decide whether to deploy. The workflow SHALL check out the full history (`fetch-depth: 0`), read the image tag (the commit SHA) currently serving on the Cloud Run service `eco-metrics-api`, and run `git diff --name-only <deployed_sha> <github.sha>` against the api-affecting path list: `apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy-api.yml`, `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `nx.json`, `tsconfig.base.json`, `tsconfig.json`. If at least one changed file matches, the workflow SHALL build, push, and deploy; otherwise it SHALL skip those steps and finish successfully. The decision and its reason SHALL be logged (and written to the job summary). The detection SHALL fail safe: if the service or its image tag cannot be read, if the tag is not a full commit SHA, or if the deployed SHA is not present in the checked-out history (e.g. after a force-push on `develop`), the workflow SHALL deploy. Because it diffs against the deployed commit and not only against the previous commit, a skipped (cancelled) intermediate commit that changed the API still triggers a deploy on the next run. `.github/workflows/ci.yml` is deliberately not part of the path list (it does not alter the image).

#### Scenario: Intermediate commit was cancelled

- **GIVEN** commit B (changes `apps/api/**`) whose pipeline was cancelled, then commit C (changes only `apps/web/**`) on `develop`, and the service still serving commit A
- **WHEN** C's CI passes and the deploy job runs
- **THEN** `git diff A C` includes `apps/api/**` and the workflow deploys C

#### Scenario: Deployed SHA not in history

- **GIVEN** the serving image tag is a SHA that is not an ancestor or otherwise present in the checked-out history
- **WHEN** change detection runs
- **THEN** the workflow logs that the deployed commit is unknown and deploys

#### Scenario: Deployed tag unreadable

- **GIVEN** the service does not exist yet, or its image tag is not a 40-character commit SHA, or the `gcloud` read fails
- **WHEN** change detection runs
- **THEN** the workflow logs the reason and deploys

#### Scenario: Decision is logged

- **WHEN** change detection finishes
- **THEN** the log and job summary state the deployed SHA, the target SHA, the matched files (or none), and the resulting decision (deploy or skip)

### Requirement: Root dependencies resolve a single rxjs instance

The root `package.json` SHALL declare `"rxjs": "7.8.2"` in `overrides` (exact, alongside the existing security pins), and `package-lock.json` SHALL be regenerated so that exactly one `rxjs` is installed (`node_modules/rxjs` at 7.8.2, flagged as a production dependency) with no nested copy under `apps/api/node_modules` or `node_modules/concurrently/node_modules`. This keeps the root lockfile consistent with `apps/api`'s declared `rxjs` 7.8.2 so the pruned lockfile satisfies the pruned `package.json`, and it removes the latent dual-instance risk where `@nestjs/*` and the api code resolved different rxjs copies.

#### Scenario: Only one rxjs is installed

- **WHEN** `npm ls rxjs` runs at the repository root after `npm ci`
- **THEN** every dependent resolves the same `rxjs@7.8.2` instance (all entries `deduped`) and there is no nested rxjs under any workspace or package

#### Scenario: Lockfile regeneration changes only the dedupe

- **WHEN** the regenerated `package-lock.json` is diffed against the previous one
- **THEN** the diff is limited to the rxjs dedupe (the `overrides`-related root entry, removal of the nested rxjs entries, and the `node_modules/rxjs` version/dev-flag change); unrelated churn is investigated and reverted instead of committed

#### Scenario: Pruned lockfile is consistent

- **WHEN** `npx nx run api:prune` runs and `npm ci --omit=dev --ignore-scripts --dry-run` runs in `apps/api/dist`
- **THEN** the command succeeds (no `lock file's rxjs@<x> does not satisfy rxjs@<y>` error)
- **AND** a real install there yields a clean `npm ls --omit=dev` and a bootable `node main.js`
