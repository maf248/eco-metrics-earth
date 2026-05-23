## Context

The eco-metrics earth monorepo uses npm workspaces with NX v22. npm workspaces hoist all dependencies to the root `node_modules/` regardless of which `package.json` declares them. This means having app-specific dependencies in root has no functional benefit — npm would hoist them there anyway from the app-level declarations.

The current state has 10 packages duplicated between root and their respective apps:

| Package | Root | apps/api | apps/web |
|---------|------|----------|----------|
| `@nestjs/common` | dep | dep | — |
| `@nestjs/config` | dep | dep | — |
| `@nestjs/core` | dep | dep | — |
| `@nestjs/platform-express` | dep | dep | — |
| `reflect-metadata` | dep | dep | — |
| `rxjs` | dep | dep | — |
| `next` | dep | — | dep |
| `react` | dep | — | dep |
| `react-dom` | dep | — | dep |
| `@nestjs/testing` | devDep | devDep | — |
| `@types/react` | devDep | — | — |
| `@types/react-dom` | devDep | — | — |

None of these are referenced by root-level configuration files (`jest.preset.js`, `tsconfig.base.json`, or root scripts).

## Goals / Non-Goals

**Goals:**
- Root `package.json` `dependencies` contains zero app-specific runtime packages
- Root `package.json` `devDependencies` contains only workspace-level tooling
- Each app fully owns its own dependency declarations
- `npm install`, `npm run build`, and `npm run test` pass with zero errors

**Non-Goals:**
- Not removing workspace-level tools from root (NX, ESLint, Jest, TypeScript, SWC, Prettier, semantic-release, etc.)
- Not changing npm workspaces configuration (`workspaces` array in root `package.json`)
- Not changing dependency versions
- Not creating a CI check to enforce this pattern (future enhancement)

## Decisions

### Decision 1: Remove from root rather than remove from apps

**Choice:** Remove app-specific packages from root, keep them in each app's `package.json`.

**Rationale:** Each app is the canonical owner of its dependencies. The web app needs `next`/`react`/`react-dom`; the API needs `@nestjs/*`/`reflect-metadata`/`rxjs`. Keeping them in the app-level `package.json` maintains the Single Source of Truth principle. The root should only declare what's shared across the entire workspace (tooling).

**Alternative considered:** Remove from apps and keep in root. Rejected because it would make apps non-self-describing — you couldn't look at `apps/web/package.json` and know what it needs to run.

### Decision 2: Move `@types/react` and `@types/react-dom` to web

**Choice:** Move them from root `devDependencies` to `apps/web/package.json` `devDependencies`.

**Rationale:** These are type definitions used exclusively by the web app (React + Next.js). The API (NestJS) does not use React. npm workspaces hoisting means they'll still be available in `node_modules/@types/` for IDE support across the workspace.

**Alternative considered:** Leave them in root for "global IDE support." Rejected because it violates the principle that root should not carry app-specific concerns. The web app's `tsconfig.json` includes the necessary type roots.

### Decision 3: No CI enforcement for now

**Choice:** Rely on manual review and developer discipline rather than adding a CI check.

**Rationale:** Adding a lint rule or CI check to prevent future regressions adds complexity disproportionate to the risk. Future regressions would be caught by code review.

## Risks / Trade-offs

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Removing from root breaks hoisting | Low | All removed packages are already declared in their apps; npm workspaces hoist regardless of source |
| `npm install` produces different `node_modules` | Low | Same hoisting behavior — identical `node_modules` expected |
| Future dev mistakenly adds app-specific dep to root | Medium | Code review; documented in AGENTS.md |

## Migration Plan

1. Edit root `package.json`: remove 9 `dependencies` entries
2. Edit root `package.json`: remove `@nestjs/testing` from `devDependencies`
3. Edit root `package.json`: remove `@types/react` and `@types/react-dom` from `devDependencies`
4. Edit `apps/web/package.json`: add `@types/react` and `@types/react-dom` to `devDependencies`
5. Run `npm install` to rebuild `node_modules` and `package-lock.json`
6. Run `npm run build` to verify builds
7. Run `npm run test` to verify all 194 tests pass

**Rollback:** Revert the `package.json` edits and re-run `npm install`.

## Open Questions

None. All decisions are straightforward.
