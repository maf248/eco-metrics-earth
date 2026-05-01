## MODIFIED Requirements

### Requirement: NX production build cache excludes jest config files correctly

The `production` namedInput in `nx.json` MUST exclude `jest.config.cts` files in addition to `jest.config.[jt]s`, so that changes to any jest config variant do not incorrectly invalidate production build cache entries.

#### Scenario: jest.config.cts change does not bust production cache

- **WHEN** `apps/web/jest.config.cts` is modified
- **THEN** the NX `production` namedInput excludes it and the production build cache for `web` remains valid

---

### Requirement: NX lint targets are auto-inferred via @nx/eslint/plugin

`nx.json` MUST register `@nx/eslint/plugin` in its `plugins` array so that a `lint` target is automatically inferred for every project that has an ESLint configuration. No manual `lint` target definition in `project.json` files is required.

#### Scenario: nx lint web succeeds

- **WHEN** `npx nx lint web` is executed
- **THEN** the command resolves a lint target, runs ESLint against `apps/web`, and exits with code 0 (assuming no lint errors)

#### Scenario: nx lint api succeeds

- **WHEN** `npx nx lint api` is executed
- **THEN** the command resolves a lint target, runs ESLint against `apps/api`, and exits with code 0

#### Scenario: nx lint shared succeeds

- **WHEN** `npx nx lint @eco-metrics/shared` is executed
- **THEN** the command resolves a lint target, runs ESLint against `packages/shared`, and exits with code 0

#### Scenario: nx run-many lint runs for all projects

- **WHEN** `npx nx run-many --target=lint --all` is executed
- **THEN** ESLint runs for all three projects without "target not found" errors
