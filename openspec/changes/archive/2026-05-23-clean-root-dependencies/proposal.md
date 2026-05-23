## Why

The root `package.json` currently declares 9 runtime dependencies (`@nestjs/*`, `next`, `react`, `react-dom`, `reflect-metadata`, `rxjs`) and 1 dev dependency (`@nestjs/testing`) that are already declared in their respective app-level `package.json` files (`apps/api/` and `apps/web/`). This duplication violates the monorepo pattern where root should only contain workspace-level tools (NX, ESLint, Jest, TypeScript), not app-specific dependencies. It creates unnecessary coupling, makes it harder to upgrade individual apps independently, and bloats the root dependency graph.

Additionally, `@types/react` and `@types/react-dom` are in root `devDependencies` but are only needed by the `web` app — the API (NestJS) does not use React at all.

## What Changes

- Remove 9 runtime dependencies from root `package.json` `dependencies`:
  - `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `@nestjs/platform-express`
  - `next`, `react`, `react-dom`
  - `reflect-metadata`, `rxjs`
- Remove 1 dev dependency from root `package.json` `devDependencies`:
  - `@nestjs/testing` (already in `apps/api/` devDeps)
- Move 2 type dev dependencies from root to `apps/web/package.json` `devDependencies`:
  - `@types/react`, `@types/react-dom`
- No additions needed to `apps/api/` or `apps/web/` — all runtime deps are already declared there
- Verify with `npm install && npm run build && npm run test`

## Capabilities

### New Capabilities

- `app-specific-dependencies`: Each app declares only its own runtime dependencies; root `package.json` contains only workspace-level tooling (build, lint, test, format, CI/CD). No app-specific packages leak into the root dependency graph.

### Modified Capabilities

None. This is a structural cleanup — no behavior or feature requirements change.

## Impact

- **Root `package.json`**: 10 packages removed (9 deps + 1 devDep), 2 type packages relocated
- **`apps/web/package.json`**: 2 new devDependencies (`@types/react`, `@types/react-dom`)
- **`apps/api/package.json`**: No changes (already declares all its own deps)
- **`packages/shared/package.json`**: No changes
- **`node_modules`**: Should produce identical hoisted tree after `npm install` — all removed deps are already declared in their respective apps
- **Build/Test**: Must pass with zero errors after the change

## Non-Goals

- Not removing workspace-level tools from root (NX, ESLint, Jest, TypeScript, Prettier, etc.) — those correctly belong in root
- Not restructuring npm workspaces configuration
- Not changing dependency versions
