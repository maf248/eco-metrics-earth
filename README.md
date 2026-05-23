# eco-metrics earth 🌍

An environmental metrics dashboard monorepo — tracking air quality, CO₂ emissions, global temperature, deforestation, ocean health, endangered species, reforestation, glacier melting, plastic pollution, renewable energy, waste recycling, and water footprint.

## Tech Stack

| Layer          | Technology                                                         | Version | Docs                                                                                         |
| -------------- | ------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| **Monorepo**   | [NX](https://nx.dev)                                               | 22.7.2  | [nx.dev/docs](https://nx.dev/getting-started/intro)                                          |
| **Runtime**    | [Node.js](https://nodejs.org) LTS                                  | 24.x    | [nodejs.org/docs](https://nodejs.org/docs/latest-v24.x/api/)                                 |
| **Frontend**   | [Next.js](https://nextjs.org) (App Router)                         | 16.2.6  | [nextjs.org/docs](https://nextjs.org/docs)                                                   |
| **UI**         | [React](https://react.dev)                                         | 19.2.6  | [react.dev](https://react.dev/reference/react)                                               |
| **Styling**    | [Tailwind CSS](https://tailwindcss.com)                            | 4.3.0   | [tailwindcss.com/docs](https://tailwindcss.com/docs)                                         |
| **Backend**    | [NestJS](https://nestjs.com)                                       | 11.1.21 | [docs.nestjs.com](https://docs.nestjs.com)                                                   |
| **Language**   | [TypeScript](https://www.typescriptlang.org)                       | 5.9.3   | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)                              |
| **Testing**    | [Jest](https://jestjs.io)                                          | 30.4.2  | [jestjs.io/docs](https://jestjs.io/docs/getting-started)                                     |
| **Testing**    | [Testing Library](https://testing-library.com)                     | 16.3.2  | [testing-library.com/docs](https://testing-library.com/docs/)                                |
| **E2E**        | [Playwright](https://playwright.dev)                               | 1.60.0  | [playwright.dev/docs](https://playwright.dev/docs/intro)                                      |
| **A11y**       | [axe-core](https://github.com/dequelabs/axe-core-npm) (Playwright) | 4.10.1  | [github.com/dequelabs/axe-core-npm](https://github.com/dequelabs/axe-core-npm)               |
| **Linting**    | [ESLint](https://eslint.org)                                       | 10.4.0  | [eslint.org/docs](https://eslint.org/docs/latest/)                                           |
| **Formatting** | [Prettier](https://prettier.io)                                    | 3.8.3   | [prettier.io/docs](https://prettier.io/docs/en/)                                             |
| **Config**     | [@nestjs/config](https://docs.nestjs.com/techniques/configuration) | 4.0.4   | [docs.nestjs.com/techniques/configuration](https://docs.nestjs.com/techniques/configuration) |
| **Reactive**   | [RxJS](https://rxjs.dev)                                           | 7.8.2   | [rxjs.dev/guide](https://rxjs.dev/guide/overview)                                            |

### Packages

| Package           | Name                  | Description                                                                |
| ----------------- | --------------------- | -------------------------------------------------------------------------- |
| `packages/shared` | `@eco-metrics/shared` | Shared TypeScript types: `ApiResponse<T>`, `EcoCategory`, `ECO_CATEGORIES` |

### Deploy Targets

| App        | Platform                       | URL |
| ---------- | ------------------------------ | --- |
| `apps/web` | [Vercel](https://vercel.com)   | —   |
| `apps/api` | [Railway](https://railway.app) | —   |

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
npm run e2e              # Run all E2E tests (Chromium, port 3000)

# Lint
npm run lint             # Lint all projects with ESLint

# Format
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without writing

# Single project
npx nx serve web         # http://localhost:3000
npx nx serve api         # http://localhost:3001
npx nx test web
npx nx test api
npx nx test shared
npx nx e2e web           # Run only web E2E tests (default: chromium-desktop)
npx nx build web
npx nx build api

# Type check (only affected projects)
npm run typecheck

# Clean test reports and coverage
npm run clean:reports

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
│   ├── api/                     # NestJS BFF
│   │   └── src/
│   │       ├── app/             # AppModule, AppController, AppService
│   │       ├── health/          # HealthController (GET /api/v1/health)
│   │       ├── modules/         # Future: per-category eco modules
│   │       ├── common/          # Shared pipes, guards, interceptors, filters
│   │       ├── config/          # AppConfigService (typed env vars)
│   │       └── main.ts          # Bootstrap — port 3001, prefix /api/v1
│   └── web/                     # Next.js App Router
│       ├── e2e/                 # Playwright E2E tests
│       └── src/
│           ├── app/             # Routes, layouts, pages
│           ├── components/      # Reusable UI components
│           ├── lib/             # Utilities and helpers
│           └── types/           # Frontend-local TypeScript types
├── packages/
│   └── shared/                  # @eco-metrics/shared
│       └── src/lib/
│           ├── api-response.ts  # ApiResponse<T> interface
│           └── eco-category.ts  # EcoCategory type + ECO_CATEGORIES const
├── dev/                         # Local development tooling (Caddy reverse proxy)
├── openspec/                    # Spec-Driven Development artifacts
│   └── changes/                 # Per-change: proposal, design, specs, tasks
│       └── archive/             # Completed changes moved here via /opsx:archive
├── .nvmrc                       # Node.js v24
├── nx.json                      # NX workspace config (cache, targets)
├── tsconfig.base.json           # Root TS config + path aliases
└── package.json                 # Root workspace (npm workspaces)
```

---

## API Endpoints

| Method | Path                      | Description                                                    |
| ------ | ------------------------- | -------------------------------------------------------------- |
| `GET`  | `/api/v1/health`          | Health check — returns `{ status: 'ok' }`                      |
| `GET`  | `/api/v1/demo-validation` | Echo query params (`fromDate`, `toDate`, `category`) — mock    |
| `POST` | `/api/v1/demo-validation` | Echo body (`name`, `value`, `unit`) with validation — mock     |

Base URL (development): `http://localhost:3001`

---

## Versioning & Releases

This monorepo uses **independent versioning** via [semantic-release](https://semantic-release.gitbook.io/semantic-release) with [Conventional Commits](https://www.conventionalcommits.org/).

### Strategy

Each package/app has its own version number and Git tag:

| Package | Tag format | Config | Scope filter (commit-analyzer) | Scope filter (changelog) |
|---------|-----------|--------|-------------------------------|--------------------------|
| **Root** (`package.json`) | `v1.6.1` | `.releaserc.cjs` | All commits bump version | All commits appear |
| **Web** (`apps/web`) | `web-v1.7.1` | `apps/web/.releaserc.cjs` | Ignores `api`, `tooling`, `docs`, `postman`, `release` | `web`, `shared`, unscoped |
| **API** (`apps/api`) | `api-v1.7.1` | `apps/api/.releaserc.cjs` | Ignores `web`, `tooling`, `docs`, `postman`, `release` | `api`, `shared`, unscoped |
| **Shared** (`@eco-metrics/shared`) | `v1.2.0` | Manual | Not independently released | — |

### How it works

- **Commit-analyzer** decides which packages get a version bump based on commit scope (`feat(api): ...` bumps API, `feat(web): ...` bumps web, `feat(shared): ...` bumps both apps since they depend on it).
- **Release-notes-generator** filters commits by scope so each `CHANGELOG.md` only shows changes relevant to that package:
  - Root `CHANGELOG.md` → complete monorepo history
  - Web `CHANGELOG.md` → only `web` and `shared` changes
  - API `CHANGELOG.md` → only `api` and `shared` changes
- **Unscoped commits** (e.g., `feat: add global config`) affect all packages.

### Release workflow

Releases are automated via `.github/workflows/release.yml` on every push to `main`. The workflow runs semantic-release sequentially: root → web → api.



---

## Environment Variables

Copy the example files before running locally:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### `apps/api/.env.example`

| Variable      | Default                 | Description                                                          |
| ------------- | ----------------------- | -------------------------------------------------------------------- |
| `PORT`        | `3001`                  | Port the API listens on                                              |
| `NODE_ENV`    | `development`           | Node environment                                                     |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origin for CORS (set to deployed frontend URL in production) |

### `apps/web/.env.example`

| Variable               | Default                 | Description                                                              |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical base URL for SEO metadata (Open Graph, canonical links)        |
| `ANALYZE`              | `false`                 | Set to `true` to generate bundle analysis report on build (webpack only) |

---

## Shared Types (`@eco-metrics/shared`)

```typescript
// API response wrapper (discriminated union)
type ApiResponse<T> =
  | { success: true; data: T; status: number }
  | { success: false; error: string; status: number };

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
  RENEWABLE_ENERGY: 'renewable-energy',
  WATER_FOOTPRINT: 'water-footprint',
} as const;

type EcoCategory = (typeof ECO_CATEGORIES)[keyof typeof ECO_CATEGORIES];
```

---

## Development Conventions

- **Language:** all code, comments, and commit messages in English.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description`
- **Branches:** feature branches only — no direct pushes to `main`
- **Tests:** always use `it('...')`, group with `describe('...')`
- **TypeScript:** strict mode enabled across all projects

See [`AGENTS.md`](./AGENTS.md) for the full development guide.

---

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for planned improvements and features.
