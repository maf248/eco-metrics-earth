# api — NestJS BFF

Backend For Frontend for eco-metrics earth. Exposes a REST API under `/api/v1` consumed by the Next.js frontend.

- **Framework:** NestJS 12
- **Port:** 3001 (development)
- **Global prefix:** `/api/v1`
- **Deploy target:** Cloud Run

---

## Architecture

### Bootstrap (`src/main.ts`)

1. Creates the NestJS application via `NestFactory.create(AppModule)`
2. Registers a global `ValidationPipe` (`class-validator` + `class-transformer`) — validates, strips unknown fields, and auto-transforms types
3. Applies `helmet` (security HTTP headers)
4. Sets global route prefix `api/v1`
5. Enables CORS restricted to `CORS_ORIGIN` (read from `AppConfigService`)
6. Listens on the configured port

### Module structure

```
src/
├── app/
│   ├── app.module.ts       # Root module — wires all imports and global providers
│   ├── app.controller.ts   # Root controller (no active routes — placeholder)
│   └── app.service.ts      # Root service (no-op)
├── health/
│   ├── health.module.ts
│   └── health.controller.ts  # GET /api/v1/health
├── config/
│   └── app-config.service.ts # Typed wrapper over @nestjs/config
├── modules/
│   └── water-footprint/      # WaterFootprintModule — module, controller, service
├── data/
│   └── water-footprint.json  # Static product dataset (53 products, with citations)
├── common/
│   └── dto/                  # Shared DTOs with `class-validator` decorators
└── main.ts
```

### Cross-cutting concerns (AppModule)

| Concern            | Solution                                                          | Configuration                                                              |
| ------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Env validation     | `@nestjs/config` + Joi                                            | Validates `PORT`, `NODE_ENV`, `CORS_ORIGIN` on startup; `abortEarly: true` |
| Rate limiting      | `@nestjs/throttler` + global `ThrottlerGuard`                     | 60 requests per 60 s per IP                                                |
| Security headers   | `helmet` (Express middleware)                                     | Applied at bootstrap, before NestJS routing                                |
| CORS               | NestJS built-in `enableCors`                                      | Restricted to `CORS_ORIGIN`                                                |
| Request validation | `class-validator` + `class-transformer` + global `ValidationPipe` | `whitelist`, `forbidNonWhitelisted`, `transform`                           |

### AppConfigService

Typed accessor for environment variables. Each getter calls `ConfigService.getOrThrow()` — if the variable is missing or invalid it throws at startup instead of failing silently at runtime.

```typescript
appConfig.port; // PORT
appConfig.nodeEnv; // NODE_ENV
appConfig.corsOrigin; // CORS_ORIGIN
```

---

## Endpoints

| Method | Path                               | Description                                                                                                                                 | Response                               |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `GET`  | `/api/v1/health`                   | Liveness check                                                                                                                              | `{ status: 'ok' }`                     |
| `GET`  | `/api/v1/demo-validation`          | **Mock** — query param validation demo                                                                                                      | `{ query: GetMetricsQueryDto }`        |
| `POST` | `/api/v1/demo-validation`          | **Mock** — body validation demo                                                                                                             | `{ body: CreateMetricDto }`            |
| `GET`  | `/api/v1/water-footprint/products` | Static product dataset — optional `category` query filter (`food-beverages`, `textiles`, `technology`, `manufactured`, `digital-computing`) | `ApiResponse<WaterFootprintProduct[]>` |

---

## Environment Variables

Copy `.env.example` before running locally:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable          | Default                 | Description                                                                    |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `PORT`            | `3001`                  | Port the server listens on                                                     |
| `NODE_ENV`        | `development`           | `development` \| `test` \| `production`                                        |
| `CORS_ORIGIN`     | `http://localhost:3000` | Allowed CORS origin — set to the deployed web URL in production                |
| `SWAGGER_ENABLED` | `false`                 | Enable OpenAPI/Swagger UI at `/api/docs` — set to `true` for local development |

---

## Build

The API uses **webpack** via `NxAppWebpackPlugin` instead of the standard NestJS CLI. This bundles the application into a single output under `dist/` and generates a pruned `package.json` for deployment.

```bash
# Development build (source maps enabled)
npx nx build api

# Production build
npx nx build api --configuration=production

# Development server (build + watch + restart)
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

`apps/api` deploys to Google Cloud Run from `develop` via the root `Dockerfile` and `.github/workflows/deploy-api.yml`. The image is multi-stage `node:24-alpine`: the builder runs `HUSKY=0 npm ci`, `npx nx run api:prune`, and a production install inside `apps/api/dist` using the root `overrides` security pins; the runtime stage ships only the self-contained `dist` directory, runs as non-root `USER node`, exposes port `8080`, and starts with `CMD ["node", "main.js"]`.

Authentication uses Workload Identity Federation (OIDC) — no service-account JSON keys. Images are tagged by commit SHA and pushed to Artifact Registry; `google-github-actions/deploy-cloudrun@v3` deploys the `eco-metrics-api` service with a startup probe on `/api/v1/health`, scale-to-zero (`--min-instances=0`), and the env vars `NODE_ENV`, `CORS_ORIGIN`, and `SWAGGER_ENABLED` (Cloud Run injects `PORT`, so it is never set manually).

Required GitHub **variables** (Settings → Secrets and variables → Actions → Variables):

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `CORS_ORIGIN`

See [`docs/deploy/cloud-run.md`](../../docs/deploy/cloud-run.md) for the full GCP/gcloud/GitHub/Vercel runbook.

---

## Adding a New Eco-Category Module

See [AGENTS.md — Adding a new eco-category module](../../AGENTS.md#adding-a-new-eco-category-module-api) for the step-by-step guide:

1. Create `src/modules/<category>/` with `<category>.module.ts`, `<category>.controller.ts`, `<category>.service.ts`
2. Import the new module in `AppModule`
3. Write unit tests in `__tests__/<category>/`
