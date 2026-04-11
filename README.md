# eco-metrics earth 🌍

An environmental metrics dashboard monorepo — tracking air quality, endangered species, global temperature, deforestation, ocean health, and CO₂ emissions.

## Tech Stack

| Layer | Technology | Version | Docs |
|---|---|---|---|
| **Monorepo** | [NX](https://nx.dev) | 22.6.5 | [nx.dev/docs](https://nx.dev/getting-started/intro) |
| **Runtime** | [Node.js](https://nodejs.org) LTS | 20.x | [nodejs.org/docs](https://nodejs.org/docs/latest-v20.x/api/) |
| **Frontend** | [Next.js](https://nextjs.org) (App Router) | 16.1.7 | [nextjs.org/docs](https://nextjs.org/docs) |
| **UI** | [React](https://react.dev) | 19.2.5 | [react.dev](https://react.dev/reference/react) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) | 3.4.19 | [tailwindcss.com/docs](https://tailwindcss.com/docs) |
| **Backend** | [NestJS](https://nestjs.com) | 11.1.18 | [docs.nestjs.com](https://docs.nestjs.com) |
| **Language** | [TypeScript](https://www.typescriptlang.org) | 5.9.3 | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/) |
| **Testing** | [Jest](https://jestjs.io) | 30.3.0 | [jestjs.io/docs](https://jestjs.io/docs/getting-started) |
| **Testing** | [Testing Library](https://testing-library.com) | 16.3.0 | [testing-library.com/docs](https://testing-library.com/docs/) |
| **Linting** | [ESLint](https://eslint.org) | 10.2.0 | [eslint.org/docs](https://eslint.org/docs/latest/) |
| **Formatting** | [Prettier](https://prettier.io) | 3.8.2 | [prettier.io/docs](https://prettier.io/docs/en/) |
| **Config** | [@nestjs/config](https://docs.nestjs.com/techniques/configuration) | 4.0.4 | [docs.nestjs.com/techniques/configuration](https://docs.nestjs.com/techniques/configuration) |
| **Reactive** | [RxJS](https://rxjs.dev) | 7.8.2 | [rxjs.dev/guide](https://rxjs.dev/guide/overview) |

### Packages

| Package | Name | Description |
|---|---|---|
| `packages/shared` | `@eco-metrics/shared` | Shared TypeScript types: `ApiResponse<T>`, `EcoCategory`, `ECO_CATEGORIES` |

### Deploy Targets

| App | Platform | URL |
|---|---|---|
| `apps/web` | [Vercel](https://vercel.com) | — |
| `apps/api` | [Railway](https://railway.app) | — |

---

## Prerequisites

- **Node.js** v20 LTS — install via [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- **npm** v10+ (bundled with Node 20)

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
```

---

## Commands

```bash
# Development
npm run dev              # Start web (port 3000) + api (port 3001) in parallel

# Build
npm run build            # Build all apps and packages

# Test
npm run test             # Run all tests across all projects

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
npx nx build web
npx nx build api

# Run only affected projects (useful after partial changes)
npx nx affected --target=test
npx nx affected --target=build
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
├── openspec/                    # Spec-Driven Development artifacts
│   └── changes/                 # Per-change: proposal, design, specs, tasks
├── .nvmrc                       # Node.js v20
├── nx.json                      # NX workspace config (cache, targets)
├── tsconfig.base.json           # Root TS config + path aliases
└── package.json                 # Root workspace (npm workspaces)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check — returns `{ status: 'ok' }` |

Base URL (development): `http://localhost:3001`

---

## Environment Variables

Copy the example files before running locally:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### `apps/api/.env.example`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the API listens on |
| `NODE_ENV` | `development` | Node environment |

### `apps/web/.env.example`

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | BFF base URL |

---

## Shared Types (`@eco-metrics/shared`)

```typescript
// API response wrapper
interface ApiResponse<T> {
  data: T;
  timestamp: string;
  error?: string;
}

// Eco categories
const ECO_CATEGORIES = {
  AIR_QUALITY: 'air-quality',
  ENDANGERED_SPECIES: 'endangered-species',
  GLOBAL_TEMPERATURE: 'global-temperature',
  DEFORESTATION: 'deforestation',
  OCEAN_HEALTH: 'ocean-health',
  CO2_EMISSIONS: 'co2-emissions',
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
