# eco-metrics earth 🌍

An environmental metrics dashboard monorepo — tracking air quality, CO₂ emissions, global temperature, deforestation, ocean health, endangered species, reforestation, glacier melting, plastic pollution, energy sources, waste recycling, and water footprint.

## Tech Stack

| Layer          | Technology                                                               | Version | Docs                                                                                         |
| -------------- | ------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| **Monorepo**   | [NX](https://nx.dev)                                                     | 23.2.1  | [nx.dev/docs](https://nx.dev/getting-started/intro)                                          |
| **Runtime**    | [Node.js](https://nodejs.org) LTS                                        | 24.x    | [nodejs.org/docs](https://nodejs.org/docs/latest-v24.x/api/)                                 |
| **Frontend**   | [Next.js](https://nextjs.org) (App Router)                               | 16.4.2  | [nextjs.org/docs](https://nextjs.org/docs)                                                   |
| **UI**         | [React](https://react.dev)                                               | 19.3.0  | [react.dev](https://react.dev/reference/react)                                               |
| **Styling**    | [Tailwind CSS](https://tailwindcss.com)                                  | 4.3.3   | [tailwindcss.com/docs](https://tailwindcss.com/docs)                                         |
| **Theming**    | React Context + localStorage                                             | —       | Light and dark mode support with persistent user preference via a theme toggle               |
| **Backend**    | [NestJS](https://nestjs.com)                                             | 12.1.2  | [docs.nestjs.com](https://docs.nestjs.com)                                                   |
| **Language**   | [TypeScript](https://www.typescriptlang.org)                             | 5.9.3   | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)                              |
| **Testing**    | [Jest](https://jestjs.io)                                                | 30.5.2  | [jestjs.io/docs](https://jestjs.io/docs/getting-started)                                     |
| **Testing**    | [Testing Library](https://testing-library.com)                           | 16.3.3  | [testing-library.com/docs](https://testing-library.com/docs/)                                |
| **E2E**        | [Playwright](https://playwright.dev)                                     | 1.63.0  | [playwright.dev/docs](https://playwright.dev/docs/intro)                                     |
| **A11y**       | [axe-core](https://github.com/dequelabs/axe-core-npm) (Playwright)       | 4.13.0  | [github.com/dequelabs/axe-core-npm](https://github.com/dequelabs/axe-core-npm)               |
| **Linting**    | [ESLint](https://eslint.org)                                             | 10.12.0 | [eslint.org/docs](https://eslint.org/docs/latest/)                                           |
| **Formatting** | [Prettier](https://prettier.io)                                          | 3.9.9   | [prettier.io/docs](https://prettier.io/docs/en/)                                             |
| **Config**     | [@nestjs/config](https://docs.nestjs.com/techniques/configuration)       | 12.0.1  | [docs.nestjs.com/techniques/configuration](https://docs.nestjs.com/techniques/configuration) |
| **API Docs**   | [@nestjs/swagger](https://docs.nestjs.com/openapi/introduction)          | 12.0.2  | [docs.nestjs.com/openapi/introduction](https://docs.nestjs.com/openapi/introduction)         |
| **Reactive**   | [RxJS](https://rxjs.dev)                                                 | 7.8.2   | [rxjs.dev/guide](https://rxjs.dev/guide/overview)                                            |
| **Validation** | [class-validator](https://github.com/typestack/class-validator)          | 0.15.1  | [docs.nestjs.com/techniques/validation](https://docs.nestjs.com/techniques/validation)       |
| **Env schema** | [Joi](https://joi.dev)                                                   | 18.2.9  | [joi.dev/api](https://joi.dev/api/)                                                          |
| **Security**   | [Helmet](https://helmetjs.github.io)                                     | 8.3.0   | [helmetjs.github.io](https://helmetjs.github.io/)                                            |
| **Rate limit** | [@nestjs/throttler](https://docs.nestjs.com/security/rate-limiting)      | 6.7.1   | [docs.nestjs.com/security/rate-limiting](https://docs.nestjs.com/security/rate-limiting)     |
| **Compiler**   | [SWC](https://swc.rs) (Jest transform)                                   | 1.16.13 | [swc.rs/docs](https://swc.rs/docs/getting-started)                                           |
| **Releases**   | [semantic-release](https://semantic-release.gitbook.io/semantic-release) | 25.0.9  | [semantic-release docs](https://semantic-release.gitbook.io/semantic-release)                |
| **Git hooks**  | [Husky](https://typicode.github.io/husky)                                | 9.1.7   | [typicode.github.io/husky](https://typicode.github.io/husky/)                                |
| **Git hooks**  | [lint-staged](https://github.com/lint-staged/lint-staged)                | 17.6.0  | [github.com/lint-staged/lint-staged](https://github.com/lint-staged/lint-staged)             |
| **Commits**    | [commitlint](https://commitlint.js.org)                                  | 21.2.3  | [commitlint.js.org](https://commitlint.js.org/)                                              |

### Packages

| Package           | Name                  | Description                                                                                                                                                                                                     |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | `@eco-metrics/shared` | Shared TypeScript types: `ApiResponse<T>`, `ApiResponseMeta`, `EcoCategory`, `ECO_CATEGORIES`, `MetricPoint`, `MetricSeries`, `DataSourceAttribution`, data sources catalog types, water-footprint domain types |

### Deploy Targets

| App        | Platform                                         | Trigger                                                                                                                                 | Details                                                                                                                                                                                   |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web` | [Vercel](https://vercel.com)                     | Auto-deploy from GitHub (`vercel.json`, `scripts/vercel-ignore.sh`); production waits for the CI check                                  | See [`docs/deploy/vercel.md`](./docs/deploy/vercel.md)                                                                                                                                    |
| `apps/api` | [Google Cloud Run](https://cloud.google.com/run) | `.github/workflows/deploy-api.yml`, called by `ci.yml` after CI passes (API-related changes only): `main` → production, `develop` → dev | Services `eco-metrics-api` (`https://eco-metrics-api-fexi2yqv2q-uc.a.run.app`) and `eco-metrics-api-dev` (Vercel previews) — see [`docs/deploy/cloud-run.md`](./docs/deploy/cloud-run.md) |

---

## Prerequisites

- **Node.js** v24 LTS — install via [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- **npm** v11+ (bundled with Node 24)
- **Caddy** _(optional)_ — only needed for `npm run dev:local` (custom domain). See [`dev/README.md`](./dev/README.md)

---

## Getting Started

```bash
# Clone
git clone git@github.com:maf248/eco-metrics-earth.git
cd eco-metrics-earth

# Use correct Node version
nvm use

# Install dependencies
npm install

# Start both apps in parallel (web: 3000, api: 3001)
npm run dev

# Or start with custom local domain (requires Caddy — see dev/README.md)
npm run dev:local   # → https://eco-metrics.localhost
```

---

## Commands

```bash
# Development
npm run dev              # Start web (port 3000) + api (port 3001) in parallel
npm run dev:local        # Start apps + Caddy proxy → https://eco-metrics.localhost (requires Caddy)

# Build
npm run build            # Build all apps and packages

# Test
npm run test             # Run all unit tests across all projects
npm run e2e              # Run all E2E tests (full suite on chromium-desktop, @smoke on Firefox, WebKit and mobile)
npm run update-snapshots # Re-run unit tests updating Jest snapshots

# Lint
npm run lint             # Lint all projects with ESLint

# Format
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without writing

# Single project
npx nx dev web           # http://localhost:3000 (Next.js dev server)
npx nx serve api         # http://localhost:3001
npx nx test web
npx nx test api
npx nx test shared
npx nx e2e web           # Run only web E2E tests (starts web + api dev servers automatically)
npx nx build web
npx nx build api

# Type check
npm run typecheck

# Clean test reports and coverage
npm run clean:reports

# Reset workspace (removes node_modules, NX cache and build outputs, then reinstalls)
npm run reset

# Run only affected projects (useful after partial changes)
npx nx affected --target=test
npx nx affected --target=build

# Bundle analysis (webpack build only — opens HTML report in browser)
npm run analyze          # equivalent to: ANALYZE=true npx nx build web -- --webpack
```

---

## Project Structure

```
eco-metrics-earth/
├── apps/
│   ├── api/                     # NestJS BFF (deployed to Cloud Run)
│   │   └── src/
│   │       ├── app/             # AppModule, global pipeline helper
│   │       ├── health/          # HealthController (GET /api/v1/health)
│   │       ├── modules/         # Per-category eco modules
│   │       │   ├── providers/owid/   # Cached OWID provider client (Grapher CSV + API v1 JSON)
│   │       │   ├── data-sources/     # Catalog of sources
│   │       │   └── water-footprint/  # Module, controller, service + static dataset (data/)
│   │       ├── common/          # Outbound HTTP client, global exception filter, catch-all 404 fallback
│   │       ├── config/          # AppConfigService (typed env vars)
│   │       └── main.ts          # Bootstrap — port 3001, prefix /api/v1
│   └── web/                     # Next.js App Router (deployed to Vercel)
│       ├── e2e/                 # Playwright E2E tests
│       └── src/
│           ├── app/             # Routes, layouts, pages
│           ├── components/      # Reusable UI components
│           └── lib/             # Utilities and helpers
├── packages/
│   └── shared/                  # @eco-metrics/shared
│       └── src/lib/
│           ├── api-response.ts             # ApiResponse<T> union + ApiResponseMeta
│           ├── data-source-attribution.ts  # DataSourceAttribution (provider, license, source)
│           ├── data-sources.ts             # Data sources catalog types
│           ├── eco-category.ts             # EcoCategory type + ECO_CATEGORIES const
│           ├── metric-series.ts            # MetricPoint + MetricSeries time-series shapes
│           └── water-footprint.ts          # Water-footprint product, category and water-type types
├── dev/                         # Local development tooling (Caddy reverse proxy)
├── docs/                        # Data sources, deploy runbooks, design system, planning
├── openspec/                    # Spec-Driven Development artifacts
│   ├── specs/                   # Canonical specs per capability
│   └── changes/                 # Per-change: proposal, design, specs, tasks
│       └── archive/             # Completed changes moved here via /opsx:archive
├── postman/                     # Postman collections (collections/, environments/) for data provider APIs
├── scripts/                     # Helper scripts (Vercel ignore step, PWA icons)
├── Dockerfile                   # Multi-stage image for apps/api (Cloud Run)
├── vercel.json                  # Vercel build config for apps/web
├── .nvmrc                       # Node.js v24
├── nx.json                      # NX workspace config (cache, targets)
├── tsconfig.base.json           # Root TS config + path aliases
└── package.json                 # Root workspace (npm workspaces)
```

---

## API Endpoints

| Method | Path                               | Description                                                                                                                                                                                                           |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/health`                   | Health check — returns `{ status: 'ok' }`                                                                                                                                                                             |
| `GET`  | `/api/v1/water-footprint/products` | Static product water-footprint dataset (60 products, with citations) — optional `category` filter (`food-beverages`, `textiles`, `technology`, `manufactured`, `digital-computing`, `vehicles`, `energy-extractives`) |
| `GET`  | `/api/v1/data-sources`             | Catalog of the data sources in use (live providers and static datasets with their publications)                                                                                                                       |

Base URL (development): `http://localhost:3001`

Base URL (production): `https://eco-metrics-api-fexi2yqv2q-uc.a.run.app`

Swagger UI (when `SWAGGER_ENABLED=true`, disabled in production): `http://localhost:3001/api/docs`

See [`apps/api/README.md`](./apps/api/README.md) for the BFF architecture, cross-cutting concerns and deploy details.

---

## Versioning & Releases

This monorepo uses **independent versioning** via [semantic-release](https://semantic-release.gitbook.io/semantic-release) with [Conventional Commits](https://www.conventionalcommits.org/).

### Strategy

Each package/app has its own version number and Git tag:

| Package                            | Tag format   | Config                    | Scope filter (commit-analyzer)                         | Scope filter (changelog)  |
| ---------------------------------- | ------------ | ------------------------- | ------------------------------------------------------ | ------------------------- |
| **Root** (`package.json`)          | `v2.5.0`     | `.releaserc.mjs`          | All commits bump version                               | All commits appear        |
| **Web** (`apps/web`)               | `web-v2.5.0` | `apps/web/.releaserc.mjs` | Ignores `api`, `tooling`, `docs`, `postman`, `release` | `web`, `shared`, unscoped |
| **API** (`apps/api`)               | `api-v2.5.0` | `apps/api/.releaserc.mjs` | Ignores `web`, `tooling`, `docs`, `postman`, `release` | `api`, `shared`, unscoped |
| **Shared** (`@eco-metrics/shared`) | `v1.2.0`     | Manual                    | Not independently released                             | —                         |

### How it works

- **Commit-analyzer** decides which packages get a version bump based on commit scope (`feat(api): ...` bumps API, `feat(web): ...` bumps web, `feat(shared): ...` bumps both apps since they depend on it).
- **Release-notes-generator** filters commits by scope so each `CHANGELOG.md` only shows changes relevant to that package:
  - Root `CHANGELOG.md` → complete monorepo history
  - Web `CHANGELOG.md` → only `web` and `shared` changes
  - API `CHANGELOG.md` → only `api` and `shared` changes
- **Unscoped commits** (e.g., `feat: add global config`) affect all packages.

### Release workflow

Releases are automated via `.github/workflows/release.yml` on every push to `main`. The workflow runs semantic-release sequentially (root → web → api), then syncs the workspace `version` fields in `package-lock.json` with the bumped `package.json` versions via `scripts/sync-lockfile-versions.mjs` (a deterministic patch — no dependency resolution, no transitive changes), and finally auto-back-merges `main` into `develop` to keep both branches synchronized with the same versions and changelogs.

### CI

`.github/workflows/ci.yml` runs on every push (any branch) and on PRs to `main`: format check → lint → typecheck → build → unit tests → E2E (Playwright). The job runs inside the official Playwright container (`mcr.microsoft.com/playwright:v<version>-noble`), so CI never installs browsers or OS packages; `scripts/check-playwright-image.mjs` fails the run early if the image tag differs from the installed `@playwright/test` version.

---

## Environment Variables

Copy the example files before running locally:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### `apps/api/.env.example`

| Variable                 | Default                              | Description                                                                                                                                               |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                   | `3001`                               | Port the API listens on (injected by Cloud Run in production — never set it manually there)                                                               |
| `NODE_ENV`               | `development`                        | Node environment                                                                                                                                          |
| `CORS_ORIGIN`            | `http://localhost:3000`              | Comma-separated list of exact allowed CORS origins (single origin is valid; no wildcards)                                                                 |
| `CORS_ORIGIN_PATTERN`    | —                                    | Optional anchored regex (`^...$`) for pattern-based origins such as Vercel preview URLs (empty/unset = no pattern)                                        |
| `SWAGGER_ENABLED`        | `false`                              | Enable OpenAPI/Swagger UI. Set to `true` for local development, `false` in production.                                                                    |
| `OWID_GRAPHER_BASE_URL`  | `https://ourworldindata.org/grapher` | OWID Grapher base URL; must not end with a trailing slash                                                                                                 |
| `OWID_API_BASE_URL`      | `https://api.ourworldindata.org/v1`  | OWID API v1 base URL; must not end with a trailing slash                                                                                                  |
| `OWID_HTTP_TIMEOUT_MS`   | `10000`                              | Per-attempt HTTP timeout for OWID requests, in milliseconds (1 000–60 000)                                                                                |
| `OWID_CACHE_TTL_SECONDS` | `86400`                              | In-memory cache TTL for parsed OWID responses, in seconds (60–604 800 = 7 days)                                                                           |
| `TRUST_PROXY_HOPS`       | `0`                                  | Trusted reverse-proxy hops in front of the API (Express `trust proxy`). Cloud Run uses `1` (set by the deploy workflow)                                   |
| `INTERNAL_API_KEY`       | —                                    | Optional shared secret (min 32 chars); requests with a matching `X-Internal-Api-Key` header skip rate limiting. Mounted from Secret Manager in production |

### `apps/web/.env.example`

| Variable               | Default                        | Description                                                                                                                        |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`        | Canonical base URL for SEO metadata (Open Graph, canonical links)                                                                  |
| `API_BASE_URL`         | `http://localhost:3001/api/v1` | Base URL of the NestJS BFF (server-side only). On Vercel: Production → `eco-metrics-api`, Preview → `eco-metrics-api-dev`          |
| `INTERNAL_API_KEY`     | —                              | Server-only shared secret sent as `X-Internal-Api-Key` so the API skips rate limiting for the Next.js server. Never `NEXT_PUBLIC_` |
| `ANALYZE`              | `false`                        | Set to `true` to generate bundle analysis report on build (webpack only)                                                           |

---

## Shared Types (`@eco-metrics/shared`)

```typescript
// API response wrapper (discriminated union)
type ApiResponse<T> =
  | { success: true; data: T; status: number; meta?: ApiResponseMeta }
  | { success: false; error: string; status: number; meta?: ApiResponseMeta };

interface ApiResponseMeta {
  source: DataSourceAttribution;
  fetchedAt: string;
}

interface DataSourceAttribution {
  provider: string;
  license: string;
  sourceUrl: string;
  lastUpdated: string;
}

// Eco categories
const ECO_CATEGORIES = {
  WASTE_RECYCLING: 'waste-recycling',
  AIR_QUALITY: 'air-quality',
  ENDANGERED_SPECIES: 'endangered-species',
  GLOBAL_TEMPERATURE: 'global-temperature',
  DEFORESTATION: 'deforestation',
  OCEAN_HEALTH: 'ocean-health',
  CO2_EMISSIONS: 'co2-emissions',
  REFORESTATION: 'reforestation',
  GLACIER_MELTING: 'glacier-melting',
  PLASTIC_POLLUTION: 'plastic-pollution',
  ENERGY_SOURCES: 'energy-sources',
  WATER_FOOTPRINT: 'water-footprint',
} as const;

type EcoCategory = (typeof ECO_CATEGORIES)[keyof typeof ECO_CATEGORIES];

// Time-series shape used by provider clients and BFF endpoints
interface MetricPoint {
  year: number;
  value: number | null;
}

interface MetricSeries {
  entityName: string;
  entityCode: string;
  points: MetricPoint[];
}

// Water footprint (see packages/shared/src/lib/water-footprint.ts)
type WaterFootprintWaterType = 'blue' | 'green-blue-grey' | 'lifecycle-onsite' | 'lifecycle-total';

interface WaterFootprintProduct {
  product: string;
  category: WaterFootprintCategory;
  waterFootprintLiters: number | null;
  unit: string;
  waterType: WaterFootprintWaterType;
  source: string;
  sourceUrl: string;
  methodology?: string;
}
```

---

## Development Conventions

- **Language:** all code, comments, and commit messages in English.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description`
- **Branches:** `develop` is the integration branch; work lands there or in short-lived `feature/*` branches off it. `main` is protected — changes reach it only through Pull Requests.
- **Specs:** non-trivial changes follow the Spec-Driven Development workflow with [OpenSpec](./openspec/) (proposal → approval → implementation → archive).
- **Tests:** always use `it('...')`, group with `describe('...')`; Playwright E2E tests use `test('...')`.
- **TypeScript:** strict mode enabled across all projects

See [`AGENTS.md`](./AGENTS.md) for the full development guide.

---

## Documentation

| Path                                                           | Content                                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [`docs/data-sources/`](./docs/data-sources/)                   | Research on data providers and licensing per eco category       |
| [`docs/deploy/cloud-run.md`](./docs/deploy/cloud-run.md)       | GCP / gcloud / GitHub / Vercel runbook for deploying `apps/api` |
| [`docs/deploy/vercel.md`](./docs/deploy/vercel.md)             | Vercel Deployment Checks runbook: gate web production on CI     |
| [`docs/design-system.md`](./docs/design-system.md)             | Presentation source of truth: theming, palettes, a11y           |
| [`docs/technical/libraries.md`](./docs/technical/libraries.md) | Library candidates catalogue (research, not decisions)          |
| [`docs/planning/`](./docs/planning/)                           | Feature planning notes                                          |

---

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for planned improvements and features.
