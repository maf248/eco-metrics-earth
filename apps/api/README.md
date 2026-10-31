# api — NestJS BFF

Backend For Frontend for eco-metrics earth. Exposes a REST API under `/api/v1` consumed by the Next.js frontend.

- **Framework:** NestJS 12
- **Port:** 3001 (development)
- **Global prefix:** `/api/v1`
- **Deploy target:** Cloud Run

---

## Architecture

### Bootstrap (`src/main.ts`)

1. Creates the NestJS application via `NestFactory.create<NestExpressApplication>(AppModule)`
2. Registers a global `ValidationPipe` (`class-validator` + `class-transformer`) — validates, strips unknown fields, and auto-transforms types
3. Applies `helmet` (security HTTP headers)
4. Sets global route prefix `api/v1`
5. Enables CORS restricted to the configured origins (`AppConfigService.corsOrigins`) — exact origins from `CORS_ORIGIN` plus the optional anchored regex in `CORS_ORIGIN_PATTERN`
6. Sets Express `trust proxy` to `TRUST_PROXY_HOPS` (exact hop count, never `true`) so `req.ip` is the real client address
7. Enables shutdown hooks (`app.enableShutdownHooks()`) so `SIGTERM`/`SIGINT` drain in-flight requests and terminate (Nest re-raises the signal after closing, so the process ends by `SIGTERM`, status 143)
8. Listens on the configured port

### Module structure

```
src/
├── app/
│   ├── app.module.ts       # Root module — wires all imports and global providers
│   └── global-pipeline.ts  # applyGlobalPipeline — global ValidationPipe + exception filter (shared by main.ts and tests)
├── health/
│   ├── health.module.ts
│   ├── health.controller.ts               # GET /api/v1/health (liveness only)
│   ├── dependencies-health.controller.ts  # GET /api/v1/health/dependencies (Terminus)
│   └── owid.health-indicator.ts           # One indicator per provider
├── config/
│   ├── app-config.module.ts  # @Global module that provides and exports AppConfigService
│   └── app-config.service.ts # Typed wrapper over @nestjs/config
├── modules/
│   ├── co2-emissions/        # Co2EmissionsModule — OWID-backed endpoint (service, controller, constants)
│   ├── energy-sources/       # EnergySourcesModule — OWID-backed endpoint (service, controller, constants, Ember origin, 2000+ licensing note)
│   ├── global-temperature/   # GlobalTemperatureModule — OWID-backed endpoint (service, controller, constants, baseline guard)
│   ├── data-sources/         # DataSourcesModule — aggregates @DataSourceContributor() providers into the catalog
│   ├── providers/
│   │   └── owid/             # OwidModule — cached OWID provider client (Grapher CSV + API v1 JSON) + OwidProviderStatus (the single OWID data-source declaration)
│   └── water-footprint/      # WaterFootprintModule — module, controller, service
│       └── data/
│           └── water-footprint.json  # Static product dataset (60 products, with citations)
├── common/
│   ├── errors/               # `ProviderError` / `ProviderDataError` — mapped to 502 by the global filter
│   ├── snapshots/            # `ProviderSnapshotService.resolve`: last good provider payload in GCS (`SNAPSHOT_BUCKET`), disabled when unset
│   ├── series/               # `buildYearAlignedEntities`: generic year-aligned country-entity builder shared by the OWID-backed categories
│   ├── fallback/             # Catch-all JSON 404 fallback for unknown routes
│   ├── filters/              # Global exception filter (`AllExceptionsFilter`)
│   ├── publishers/           # `resolvePublisher`: licensor that republishes a source URL
│   └── http/                 # Outbound HTTP client + errors + injectable OUTBOUND_FETCH token
└── main.ts
```

### Cross-cutting concerns (AppModule)

| Concern            | Solution                                                          | Configuration                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Env validation     | `@nestjs/config` + Joi                                            | Validates `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `CORS_ORIGIN_PATTERN`, `SWAGGER_ENABLED`, `TRUST_PROXY_HOPS`, `INTERNAL_API_KEY`, `SNAPSHOT_BUCKET`, `SNAPSHOT_PREFIX`, and `OWID_*` vars on startup; `abortEarly: true` |
| Rate limiting      | `@nestjs/throttler` + global `ThrottlerGuard`                     | 60 requests per 60 s per real client IP (`req.ip` with `trust proxy` = `TRUST_PROXY_HOPS`), **per instance, in-memory**. Requests with a valid `X-Internal-Api-Key` header skip it. `GET /health` is exempt           |
| Security headers   | `helmet` (Express middleware)                                     | Applied at bootstrap, before NestJS routing                                                                                                                                                                           |
| CORS               | NestJS built-in `enableCors`                                      | Restricted to `CORS_ORIGIN` (exact list) plus optional `CORS_ORIGIN_PATTERN` regex                                                                                                                                    |
| Request validation | `class-validator` + `class-transformer` + global `ValidationPipe` | `whitelist`, `forbidNonWhitelisted`, `transform`                                                                                                                                                                      |
| Outbound HTTP      | `OutboundHttpClient` (`common/http/`)                             | Node 24 native `fetch` with per-attempt timeout, bounded retry, and identifiable `User-Agent`; stubbed via `OUTBOUND_FETCH` in tests                                                                                  |
| Provider caching   | `@nestjs/cache-manager` + in-memory store                         | Module-scoped inside `OwidModule`; TTL from `OWID_CACHE_TTL_SECONDS`; parsed payloads only; callers always receive copies, never cache refs                                                                           |

### AppConfigService

Typed accessor for environment variables. Required variables (`PORT`, `NODE_ENV`, `CORS_ORIGIN`) are read with `ConfigService.getOrThrow()` — if missing they throw at startup instead of failing silently at runtime. Optional variables (`CORS_ORIGIN_PATTERN`, `SWAGGER_ENABLED`) are read with `get()` and fall back to no-pattern / `false` when unset.

```typescript
appConfig.port; // PORT
appConfig.nodeEnv; // NODE_ENV
appConfig.corsOrigins; // CORS_ORIGIN (+ optional CORS_ORIGIN_PATTERN as a RegExp)
appConfig.owidGrapherBaseUrl; // OWID_GRAPHER_BASE_URL
appConfig.owidApiBaseUrl; // OWID_API_BASE_URL
appConfig.owidHttpTimeoutMs; // OWID_HTTP_TIMEOUT_MS
appConfig.owidCacheTtlSeconds; // OWID_CACHE_TTL_SECONDS
appConfig.trustProxyHops; // TRUST_PROXY_HOPS (default 0)
appConfig.internalApiKey; // INTERNAL_API_KEY (undefined when unset or empty)
```

---

## Endpoints

| Method | Path                               | Description                                                                                                                                                                                                                                                                                                                                      | Response                                            |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `GET`  | `/api/v1/health`                   | Liveness check                                                                                                                                                                                                                                                                                                                                   | `{ status: 'ok' }`                                  |
| `GET`  | `/api/v1/health/dependencies`      | Provider reachability check (Terminus). Not the `ApiResponse` envelope; `GET /health` stays liveness-only                                                                                                                                                                                                                                        | `{ status, info, error, details }` — `200` or `503` |
| `GET`  | `/api/v1/co2-emissions`            | Annual CO2 emissions since 1950 (total in Mt, per capita in t) for every country plus World, year-aligned arrays; provider failures answer `200` with `meta.stale: true` from the stored snapshot, or `502` without one                                                                                                                          | `ApiResponse<Co2EmissionsData>`                     |
| `GET`  | `/api/v1/energy-sources`           | Electricity generation (TWh) by source since 2000 for every country plus World, year-aligned arrays (`null` = no value); Ember credit in `data.origin`; provider failures answer `200` with `meta.stale: true` from the stored snapshot, or `502` without one                                                                                    | `ApiResponse<EnergySourcesData>`                    |
| `GET`  | `/api/v1/global-temperature`       | Annual temperature anomaly since 1940 (°C vs 1991-2020) for every country plus World, year-aligned arrays, plus `data.global` (World since 1850 vs 1861-1890 with 95% bounds); upstream credits in `data.origin` and `data.global.origin`; provider failures answer `200` with `meta.stale: true` from the stored snapshot, or `502` without one | `ApiResponse<GlobalTemperatureData>`                |
| `GET`  | `/api/v1/water-footprint/products` | Static product dataset — optional `category` query filter (`food-beverages`, `textiles`, `technology`, `manufactured`, `digital-computing`, `vehicles`, `energy-extractives`)                                                                                                                                                                    | `ApiResponse<WaterFootprintProduct[]>`              |
| `GET`  | `/api/v1/data-sources`             | Catalog of the data sources in use (live providers with their upstream origins, and static datasets with their publications), declared by each module                                                                                                                                                                                            | `ApiResponse<DataSourcesCatalog>`                   |

---

## Environment Variables

Copy `.env.example` before running locally:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable                 | Default                              | Description                                                                                                                                                      |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                   | `3001`                               | Port the server listens on                                                                                                                                       |
| `NODE_ENV`               | `development`                        | `development` \| `test` \| `production`                                                                                                                          |
| `CORS_ORIGIN`            | `http://localhost:3000`              | Comma-separated list of exact allowed CORS origins — single origin is valid; no wildcards                                                                        |
| `CORS_ORIGIN_PATTERN`    | —                                    | Optional anchored regex (`^...$`) for pattern-based origins such as Vercel previews — empty/unset means no pattern                                               |
| `SWAGGER_ENABLED`        | `false`                              | Enable OpenAPI/Swagger UI at `/api/docs` — set to `true` for local development                                                                                   |
| `OWID_GRAPHER_BASE_URL`  | `https://ourworldindata.org/grapher` | OWID Grapher base URL; must not end with a trailing slash (Joi rejects trailing slashes at startup)                                                              |
| `OWID_API_BASE_URL`      | `https://api.ourworldindata.org/v1`  | OWID API v1 base URL; must not end with a trailing slash                                                                                                         |
| `OWID_HTTP_TIMEOUT_MS`   | `10000`                              | Per-attempt HTTP timeout for OWID outbound requests in milliseconds (1 000–60 000)                                                                               |
| `OWID_CACHE_TTL_SECONDS` | `86400`                              | In-memory cache TTL for parsed OWID responses in seconds (60–604 800); converted to milliseconds for cache-manager                                               |
| `TRUST_PROXY_HOPS`       | `0`                                  | Number of trusted proxy hops (non-negative integer). `0` ignores `X-Forwarded-For` (local dev); Cloud Run uses `1`, set by the deploy workflow                   |
| `SNAPSHOT_BUCKET`        | —                                    | Optional GCS bucket name for provider snapshots (empty/unset = persistence disabled, behavior identical to before). Application Default Credentials only         |
| `SNAPSHOT_PREFIX`        | —                                    | Kebab-case object prefix of this environment (`production`, `development`); **required when `SNAPSHOT_BUCKET` is set** (a half-configured service fails at boot) |
| `INTERNAL_API_KEY`       | —                                    | Optional shared secret (min 32 chars; empty = unset). A request whose `X-Internal-Api-Key` header matches skips throttling; never a 401/403                      |

---

## Build

The API uses **webpack** via `NxAppWebpackPlugin` instead of the standard NestJS CLI. This bundles the application into a single output under `dist/` and generates a pruned `package.json` for deployment.

```bash
# Production build (default — NODE_ENV=production)
npx nx build api

# Development build (NODE_ENV=development, absolute source paths in source maps)
npx nx build api --configuration=development

# Development server (development build + watch + restart)
npx nx serve api
```

Build output: `apps/api/dist/`

---

## Testing

```bash
npx nx test api
```

- **Runner:** Jest with **SWC** compiler (`.spec.swcrc`) for fast TypeScript compilation
- **Test location:** `__tests__/` mirroring `src/` (e.g. `src/health/health.controller.ts` → `__tests__/health/health.controller.test.ts`)
- **Coverage thresholds:** 80% statements / functions / lines; branches threshold intentionally omitted — NestJS decorators compiled with SWC produce phantom branches that cannot be exercised by unit tests

---

## Deploy (Cloud Run)

`apps/api` deploys to two Google Cloud Run services via the root `Dockerfile` and `.github/workflows/deploy-api.yml`: `main` → `eco-metrics-api` (production) and `develop` → `eco-metrics-api-dev` (consumed by Vercel previews). The deploy is a reusable workflow with a `target` input (`production` | `development`), called by the `deploy-api-production` and `deploy-api-development` jobs of `ci.yml`, which `needs` the CI job: it runs only after CI passes on the same commit. Before building, a change-detection step compares the commit being deployed with the commit of the image that is serving on the target's service and skips the build when no API inputs changed (`apps/api/**`, `packages/shared/**`, `Dockerfile`, `.dockerignore`, the deploy workflow and the root build manifests); when in doubt it deploys. A manual `workflow_dispatch` skips both the CI gate and change detection; `production` is accepted only from `main`. Deploys never cancel a running rollout; each target has its own concurrency group (`deploy-api-production`, `deploy-api-development`).

The image is multi-stage, based on `node:24-alpine` pinned by digest (`node:24-alpine@sha256:...`, the same multi-arch index digest in both stages) so builds are reproducible at the base level. Dependabot opens weekly `chore(deps)` PRs against `develop` for the digest and for the GitHub Actions versions (`.github/dependabot.yml`), and ignores Node major bumps on purpose (Node 24 LTS); it reads its config from the default branch, so it is active once the file is on `main`. The builder runs `HUSKY=0 npm ci`, `npx nx run api:prune`, and `npm ci --omit=dev` inside `apps/api/dist` from the pruned lockfile (the root `overrides` security pins are already resolved in it, so the install is reproducible). A CI step runs the same `npm ci --dry-run` so an inconsistent pruned lockfile fails CI instead of the deploy. The runtime stage removes the package managers bundled with the base image (npm, npx, corepack, yarn), which `node main.js` does not need, ships only the self-contained `dist` directory, runs as non-root `USER node`, exposes port `8080`, and starts with `CMD ["node", "main.js"]`.

Authentication uses Workload Identity Federation (OIDC) — no service-account JSON keys. Images are tagged by commit SHA and pushed to Artifact Registry; `google-github-actions/deploy-cloudrun@v3` deploys the target's service with a startup probe on `/api/v1/health`, scale-to-zero (`--min-instances=0`), and the env vars `NODE_ENV`, `CORS_ORIGIN`, `CORS_ORIGIN_PATTERN` (optional), `SWAGGER_ENABLED`, and `TRUST_PROXY_HOPS=1`, `SNAPSHOT_BUCKET` and `SNAPSHOT_PREFIX` (optional, only when the `SNAPSHOT_BUCKET` repository variable is set), plus `INTERNAL_API_KEY` mounted from the Secret Manager secret `internal-api-key` (Cloud Run injects `PORT`, so it is never set manually).

Required GitHub **variables** (Settings → Secrets and variables → Actions → Variables):

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `CORS_ORIGIN` (production) and `CORS_ORIGIN_DEV` (development) — each checked only for its own target

Optional GitHub **variables**:

- `CORS_ORIGIN_PATTERN` (production) and `CORS_ORIGIN_PATTERN_DEV` (development) — anchored regex for Vercel preview origins (e.g. `^https://eco-metrics-earth-[a-z0-9-]+\.vercel\.app$`); unset or empty means no pattern is passed to the service. Previews use the dev service, so only `CORS_ORIGIN_PATTERN_DEV` normally needs it

See [`docs/deploy/cloud-run.md`](../../docs/deploy/cloud-run.md) for the full GCP/gcloud/GitHub/Vercel runbook.

### Rate limiting and graceful shutdown

- **Per-instance limit:** the throttler uses in-memory storage. The 60 req / 60 s limit is enforced per Cloud Run instance, so the effective per-client limit scales with the number of instances and resets on cold start or scale-to-zero. This is accepted: it is abuse dampening, not a quota.
- **Client identity:** `req.ip` with `trust proxy` = `TRUST_PROXY_HOPS`. With `1` hop the rightmost `X-Forwarded-For` entry is the client; entries to its left are client-supplied and ignored. See the post-deploy verification in [`docs/deploy/cloud-run.md`](../../docs/deploy/cloud-run.md).
- **Trusted bypass:** the Next.js server sends `X-Internal-Api-Key` (value of `INTERNAL_API_KEY`); the comparison is constant-time and a wrong or missing header is simply throttled normally.
- **Shutdown:** `enableShutdownHooks()` makes `SIGTERM` stop the HTTP server, drain in-flight requests and exit. The OWID cache holds no handles, so it needs no shutdown hook.
- **E2E caveat:** `npm run e2e` spawns the API with `TRUST_PROXY_HOPS=1` and a fixed non-secret `INTERNAL_API_KEY`. If you start the API yourself and the wrapper adopts it, it keeps its own environment and `apps/web/e2e/rate-limit.spec.ts` fails with an actionable message. Stop your API, or start it with `TRUST_PROXY_HOPS=1 INTERNAL_API_KEY=<the constant in apps/web/e2e/utils/api-env.ts>`.

---

## Adding a New Eco-Category Module

See [AGENTS.md — Adding a new eco-category module](../../AGENTS.md#adding-a-new-eco-category-module-api) for the step-by-step guide:

1. Create `src/modules/<category>/` with `<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`
2. Import the new module in `AppModule`
3. Write unit tests in `__tests__/<category>/`
