## MODIFIED Requirements

### Requirement: nx.json lint cache inputs reference eslint.config.mjs

The `lint` target defined in `nx.json` MUST include `"{workspaceRoot}/eslint.config.mjs"` in its `inputs` array. Legacy entries referencing `{workspaceRoot}/.eslintrc.json` or `{workspaceRoot}/.eslintignore` MUST be removed. NX SHALL invalidate the lint cache whenever `eslint.config.mjs` changes, ensuring stale lint results are never served from cache after an ESLint configuration update.

#### Scenario: Lint cache is invalidated after eslint.config.mjs changes

- **WHEN** `eslint.config.mjs` is modified and `nx run-many --target=lint --all` is executed
- **THEN** NX treats all affected projects as cache misses and re-runs ESLint, reflecting the updated configuration

#### Scenario: Lint cache is NOT invalidated by unrelated file changes

- **WHEN** a source file unrelated to ESLint config is modified and `nx run-many --target=lint --all` is executed
- **THEN** projects whose source files are unchanged are served from cache without re-running ESLint

## ADDED Requirements

### Requirement: API Webpack build emits dist/package.json via generatePackageJson

The API Webpack build configuration MUST set `generatePackageJson: true`. On every successful build, a `dist/apps/api/package.json` file SHALL be emitted containing the production dependency manifest derived from the workspace lockfile. The `prune-lockfile` target MUST be able to depend on this file being present without requiring a manual or separate generation step.

#### Scenario: dist/package.json is present after a clean API build

- **WHEN** `nx build api` is executed from a clean state
- **THEN** a `dist/apps/api/package.json` file is created alongside the compiled JavaScript output

#### Scenario: prune-lockfile target finds dist/package.json without extra steps

- **WHEN** the `prune-lockfile` target runs after `nx build api` completes
- **THEN** it locates `dist/apps/api/package.json` and proceeds without a "file not found" error
