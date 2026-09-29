## MODIFIED Requirements

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

### Requirement: A user-executed runbook documents the entire GCP/GitHub/Vercel setup

`docs/deploy/cloud-run.md` SHALL exist as the single runbook the user follows after this change is pushed. It SHALL cover, in order: GCP project selection/creation and billing prerequisite (the always-free tier requires an active billing account); enabling the required APIs (Cloud Run, Artifact Registry, IAM, IAM Service Account Credentials, Security Token Service); `gcloud` CLI login; creating the `eco-metrics` Artifact Registry Docker repository; creating the `github-deployer` service account with `roles/run.admin` + `roles/artifactregistry.writer` (project-level) and `roles/iam.serviceAccountUser` on the Compute Engine default service account (the actAs requirement for Cloud Run deploys); creating the WIF pool and OIDC provider (issuer `https://token.actions.githubusercontent.com`, attribute mapping, and an attribute condition restricting to the repository `maf248/eco-metrics-earth`); granting `roles/iam.workloadIdentityUser` to the repository's principal set; extracting the provider full name; setting the five required GitHub variables plus the optional `CORS_ORIGIN_PATTERN` (an anchored Vercel preview regex, e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$` — unset by default; the workflow escapes commas and backslashes automatically, so the variable holds the raw value with no manual escaping); the ~5-minute IAM propagation note; triggering the first deploy (push or `workflow_dispatch`); recording the `https://eco-metrics-api-<hash>.<region>.run.app` URL; the verification curls; setting `API_BASE_URL` in Vercel for Production AND Preview; the optional path-filter verification pushes (web-only → no Cloud Run deploy; api-only → no Vercel build); always-free limits (2M requests/month, 180,000 vCPU-seconds, 360,000 GiB-seconds — this project's volume is hundreds of requests) with a billing-alert recommendation and an Artifact Registry storage note (~0.5 GB free; images are ~100 MB compressed; occasional tag cleanup or a cleanup policy keeps storage trivial); and a troubleshooting section (WIF auth errors, image push denied, startup probe timeout with `gcloud run services logs read`, cold-start first request, an invalid `CORS_ORIGIN`/`CORS_ORIGIN_PATTERN` value failing Joi validation at boot → startup probe timeout with the validation error in the service logs, and unsetting the `CORS_ORIGIN_PATTERN` GitHub variable not removing the already-deployed env var from the service — clear it with `gcloud run services update eco-metrics-api --remove-env-vars CORS_ORIGIN_PATTERN`).

#### Scenario: A developer can go from zero to a deployed API using only the runbook

- **GIVEN** a GCP account with billing enabled, the `gcloud` CLI, and admin access to the GitHub repo and Vercel project
- **WHEN** the user follows `docs/deploy/cloud-run.md` top to bottom
- **THEN** the API is deployed on Cloud Run, verified with the curls, and consumed by the deployed web app

#### Scenario: Troubleshooting covers the known failure modes

- **WHEN** a deploy fails or a CORS origin is rejected
- **THEN** the troubleshooting section has an entry matching the symptom (auth error / push denied / probe timeout / cold start / invalid CORS value at boot / stale pattern env var after unsetting the variable) with the diagnostic command and fix
