## Why

Several major-version dependency upgrades were deferred from Phase 1 due to potential breaking changes (ESLint 10, TypeScript 6, reflect-metadata 0.2, webpack-cli 7). A concurrent audit also identified four devDependencies that are declared but never referenced in any build, test, or lint pipeline, adding install cost and maintenance noise without benefit.

## What Changes

- **BREAKING** `eslint` 9.17.0 → 10.4.0: Removes legacy `.eslintrc` support (already migrated to flat config in a prior change — minimal impact expected). Rule-behavior changes must be verified.
- **BREAKING** `@eslint/js` 9.17.0 → 10.0.1: Companion bump for the ESLint core upgrade.
- **BREAKING** `reflect-metadata` 0.1.14 → 0.2.2: API surface changed; NestJS 11 supports 0.2. Must validate that no code uses `Reflect.metadata` directly outside NestJS decorators.
- **BREAKING** `typescript` 5.9.3 → 6.0.3: Stricter type narrowing and inference changes; all three projects must compile cleanly.
- **BREAKING** `webpack-cli` 5.1.4 → 7.0.2: Used directly in the API build command (`webpack-cli build`). CLI interface changes across two major versions must be verified.
- Remove unused devDependency `ts-jest` (declared in root; all jest transforms use `@swc/jest` or `next/jest`).
- Remove unused devDependency `@nestjs/schematics` (declared in root; NX generators are used — `nest g` is not part of the workflow).
- Remove unused devDependency `@nx/web` (declared in root; no executor, plugin, or config references it).
- Remove unused devDependency `ts-node` (declared in root; NX uses `@swc-node/register` for TypeScript execution — no reference found in any config or script).

## Capabilities

### New Capabilities

- `phase2-breaking-deps`: Upgrade all four deferred breaking-version dependencies and remove four unused devDependencies, restoring full currency of the tooling stack.

### Modified Capabilities

*(none — no product-facing behavior changes)*

## Impact

- **`package.json` (root):** version bumps for `eslint`, `@eslint/js`, `typescript`, `webpack-cli`; removals of `ts-jest`, `@nestjs/schematics`, `@nx/web`, `ts-node`.
- **`apps/api/package.json`:** version bump for `reflect-metadata`.
- **`eslint.config.mjs`:** may need rule adjustments if ESLint 10 changes rule behavior or removes deprecated APIs.
- **`apps/api/webpack.config.js` + build target:** verify `webpack-cli build` command is still valid in v7.
- **All three projects (`web`, `api`, `shared`):** must typecheck and pass all 162 tests after the TypeScript 6 upgrade.
- **`package-lock.json`:** full regeneration after dep changes.

## Non-Goals

- Phase 3 upgrades (e.g., `eslint` 11+, NestJS 12, Next.js 17) — out of scope.
- Migrating the API bundler away from webpack (e.g., to esbuild or Rollup).
- Adding new lint rules beyond what is required to make ESLint 10 pass.
- Addressing `@types/jest` compatibility if already resolved by `@swc/jest`.
- CI/CD or E2E changes (separate roadmap items P1 and P3).
