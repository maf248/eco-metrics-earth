# nx-workspace Specification

## Purpose

Defines the NX monorepo workspace structure, project layout, and toolchain configuration.

## Requirements

### Requirement: NX workspace initialized with apps and packages

The NX workspace SHALL contain the `web` and `api` apps and the `shared` package, all recognized by NX and runnable through its task runner — on **NX 23.2.1** (all `nx` / `@nx/*` package families pinned to the exact version `23.2.1`, no `^` or `~`, in lockstep). Targets SHALL continue to be inferred via the `nx.json` plugins (`@nx/js/typescript`, `@nx/jest/plugin`, `@nx/next/plugin`, `@nx/eslint/plugin`, `@nx/webpack/plugin`, `@nx/playwright/plugin`) and the `nx.targets` blocks in each project's `package.json` — without `project.json` or deprecated executors.

#### Scenario: Start all apps in development

- **GIVEN** the workspace migrated to NX 23.2.1 with the cache reset (`npx nx reset`)
- **WHEN** `nx run-many --targets=dev,serve --all` is executed
- **THEN** the `web` and `api` apps start in parallel without errors or deprecation warnings
- **AND** HMR for `@eco-metrics/shared` works in `web` (via explicit `transpilePackages` in `next.config.ts`)

#### Scenario: Run all monorepo tests

- **WHEN** `nx run-many --target=test --all` is executed
- **THEN** Jest runs in the three projects (279 tests) and returns results without errors or configuration warnings

#### Scenario: Build all apps

- **WHEN** `nx run-many --target=build --all` is executed
- **THEN** `shared` (tsc), `api` (webpack via `NxAppWebpackPlugin`), and `web` (Next) compile without TypeScript errors
- **AND** the build log contains no NX 23 deprecation warnings

### Requirement: TypeScript strict enabled across the workspace

All apps and packages SHALL have `strict: true` in their `tsconfig.json`. The compiler SHALL reject code with implicit `any` types or unsafe assignments.

#### Scenario: Code with implicit any type fails compilation

- **WHEN** a function is written without typing its parameters
- **THEN** `tsc` reports an error and the build fails

### Requirement: ESLint and Prettier configured in a unified way

The workspace SHALL have shared ESLint and Prettier configuration. Both apps SHALL inherit the same base rules.

#### Scenario: Poorly formatted code is detected

- **WHEN** `nx run-many --target=lint --all` is executed
- **THEN** ESLint reports style violations without configuration errors

### Requirement: Environment variables documented

Each app SHALL have a `.env.example` file with all required environment variables documented with comments.

#### Scenario: New developer can start the project

- **WHEN** a developer copies `.env.example` to `.env.local`
- **THEN** they can start the apps in development without additional configuration

### Requirement: NX toolchain free of known auditable vulnerabilities

The workspace dependency tree SHALL be free of `npm audit` advisories whose fix path goes through `nx`, any `@nx/*` package, or `@module-federation/*`. Audit counts before and after the migration SHALL be documented; remaining advisories outside the NX subtree (NestJS, release tooling, and advisories with no upstream fix available) remain explicitly out of scope.

#### Scenario: Audit without NX subtree advisories

- **GIVEN** the workspace on NX 23.2.1 with `package-lock.json` regenerated
- **WHEN** `npm audit --json` is executed
- **THEN** no listed advisory has a fix path through the `nx` / `@nx/*` / `@module-federation/*` family
- **AND** the NX subtree baseline block (advisories against `@nx/*` ≤22.7.6, `@module-federation/*`, `webpack-dev-server`, `svgo`, `undici`, `ws`, `adm-zip`, `axios`/`tmp`/`yaml`/`form-data`/`brace-expansion` from `nx@22.7.2`) has disappeared from the report

#### Scenario: Audit counts recorded

- **WHEN** the migration completes
- **THEN** the exact before/after counts (by severity) are recorded in ROADMAP.md (status table, "Dependencias" row)
- **AND** the remaining families are documented with their owner in ROADMAP

### Requirement: Toolchain operation without warnings on NX 23

The workspace SHALL operate on NX 23 without deprecation warnings in build, test, or lint. The Next.js configuration SHALL use only supported APIs (without the deprecated `withNx` / `composePlugins` helpers from `@nx/next`), with `transpilePackages: ['@eco-metrics/shared']` declared explicitly.

#### Scenario: next.config.ts without deprecated helpers

- **GIVEN** `apps/web/next.config.ts` migrated (without `withNx`/`composePlugins`, with explicit `transpilePackages`)
- **WHEN** `npx nx build web` and `npx nx dev web` are executed
- **THEN** both commands complete without NX deprecation warnings
- **AND** the rest of the configuration (trailing slash, security headers/CSP, bundle analyzer) remains unchanged in behavior

#### Scenario: NX versions in lockstep with exact pin

- **WHEN** the root `package.json` is inspected after the migration
- **THEN** the ten NX family packages (`nx`, `@nx/devkit`, `@nx/jest`, `@nx/js`, `@nx/nest`, `@nx/next`, `@nx/node`, `@nx/playwright`, `@nx/react`, `@nx/webpack`) are pinned to the exact `"23.2.1"`
- **AND** `npm ls` shows no nested NX family copies in 22.x versions
