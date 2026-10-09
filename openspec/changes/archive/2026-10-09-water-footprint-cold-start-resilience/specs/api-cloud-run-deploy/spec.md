## MODIFIED Requirements

### Requirement: Cloud Run service is configured for scale-to-zero with a health startup probe

The workflow SHALL deploy with `google-github-actions/deploy-cloudrun@v3` to the target's service (`eco-metrics-api` for `production`, `eco-metrics-api-dev` for `development`) in the region from `GCP_REGION`. Both services SHALL receive the same configuration, differing only in the CORS values: a startup probe on `GET /api/v1/health` (container port 8080, e.g. `--startup-probe=httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=2,timeoutSeconds=2,failureThreshold=15`); `--min-instances=0` (explicit scale-to-zero); `--allow-unauthenticated` (the BFF is an intentionally public API consumed server-side by Vercel without credentials); explicit resource defaults (`--cpu=1 --memory=512Mi`, free-tier-safe); and env vars `NODE_ENV=production`, `CORS_ORIGIN` (from the target's origin variable — `CORS_ORIGIN` for `production`, `CORS_ORIGIN_DEV` for `development` — a comma-separated list of allowed origins; the workflow escapes `\` and `,` per the deploy action's documented `env_vars` escaping rules so a multi-origin list reaches the service intact instead of being split into bogus entries), `CORS_ORIGIN_PATTERN` (from the target's optional pattern variable — `CORS_ORIGIN_PATTERN` or `CORS_ORIGIN_PATTERN_DEV` — escaped the same way, passed only when the variable is set), `SWAGGER_ENABLED=false`. The workflow SHALL NEVER set a `PORT` env var (Cloud Run injects `PORT=8080`; the app reads it via `AppConfigService.port` and Joi coerces the string). The deploy step's built-in deploy health check (default on) SHALL be relied upon: if the startup probe fails, the workflow fails and traffic stays on the last healthy revision.

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
- **AND** the next request pays a cold start of several seconds (~6–7 s measured on 2026-10-09)
- **AND** the web app absorbs it with a second fetch attempt and never caches a failed fetch (see `water-footprint-page`)

#### Scenario: CORS allows the Vercel production origin

- **GIVEN** `CORS_ORIGIN` set to the Vercel production URL in the GitHub variables
- **WHEN** a browser request from that origin hits any route of the production service (e.g. the Swagger UI in a dev-enabled deployment)
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Comma-separated CORS_ORIGIN deploys intact

- **GIVEN** `CORS_ORIGIN` (or `CORS_ORIGIN_DEV`) set to a multi-origin list (e.g. `http://localhost:3000,https://eco-metrics-earth.vercel.app`) in the GitHub variables
- **WHEN** the deploy for the matching target runs
- **THEN** the service's `CORS_ORIGIN` env var contains the full comma-separated list — the value is not split at the first comma into a bogus env var entry
- **AND** a browser request from the second origin receives the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Preview origins allowed when the pattern variable is set

- **GIVEN** `CORS_ORIGIN_PATTERN_DEV` set to an anchored Vercel preview regex (e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`) in the GitHub variables
- **WHEN** a browser request from a matching preview origin hits any route of the development service
- **THEN** the response carries the appropriate `Access-Control-Allow-Origin` header

#### Scenario: Targets never share CORS values

- **GIVEN** different values in `CORS_ORIGIN` and `CORS_ORIGIN_DEV`
- **WHEN** each target deploys
- **THEN** `eco-metrics-api` receives only the production values and `eco-metrics-api-dev` receives only the `_DEV` values

### Requirement: Post-deploy verification proves the deployed BFF end-to-end

The runbook SHALL define the user-executed verification (curl + browser — not automated specs): `GET /api/v1/health` on the deployed `*.run.app` URL returns `200` `{ "status": "ok" }`; `GET /api/v1/water-footprint/products` returns `success: true` with 60 products; after setting `API_BASE_URL` in Vercel (Production → `https://<production-run-url>/api/v1`, Preview → `https://<dev-run-url>/api/v1`) and redeploying (environment variables apply only to new deployments), the deployed `/water-footprint/` page renders the product table from that environment's BFF.

#### Scenario: Health on the deployed URL

- **WHEN** `curl https://eco-metrics-api-<hash>.<region>.run.app/api/v1/health` runs after deploy
- **THEN** the response is `200` with `{ "status": "ok" }` (never `429` — the health route is throttler-exempt)

#### Scenario: Full dataset on the deployed URL

- **WHEN** `curl https://<run-url>/api/v1/water-footprint/products` runs
- **THEN** the response is `200` with `success: true` and `data` containing 60 products

#### Scenario: The deployed web page renders from the deployed BFF

- **GIVEN** `API_BASE_URL` set in Vercel to the environment's deployed API and the web app redeployed
- **WHEN** a visitor loads `/water-footprint/`
- **THEN** the product table renders with real data (server-rendered HTML contains product names)
