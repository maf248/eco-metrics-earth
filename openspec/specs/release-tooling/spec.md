# release-tooling Specification

## Purpose

The release/commit toolchain for the three semantic-release streams (root, `web`, `api`) — dependency hygiene, ESM release configurations, scope-filtered release triggering, and commit-msg/pre-commit validation.

## Requirements

### Requirement: Release configuration files are ESM modules

The release configuration for each of the three release streams (repository root, `apps/web`, `apps/api`) SHALL be an ESM module named `.releaserc.mjs` that imports the `conventional-changelog-conventionalcommits` preset via `import` and exports the semantic-release configuration as the default export. No `.releaserc.cjs` file SHALL exist. The plugin chain and order SHALL be `@semantic-release/npm`, `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/git`, with `branches: ['main']`, per-stream `tagFormat` (`v${version}` / `web-v${version}` / `api-v${version}`), `npmPublish: false`, `parserOpts.noteKeywords`, the app configs' `writerOpts` transform with `ALLOWED_SCOPES`, `changelogFile: 'CHANGELOG.md'`, and the `@semantic-release/git` assets and release commit messages.

#### Scenario: Root config loads as an ESM module with all plugins initialized

- **WHEN** the root `.releaserc.mjs` is imported as an ES module (or loaded by `semantic-release` during a dry-run)
- **THEN** the import SHALL resolve without `ERR_PACKAGE_PATH_NOT_EXPORTED` and the default export SHALL contain the five plugins in order: `@semantic-release/npm`, `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/git`

#### Scenario: App configs load with the custom writer options intact

- **WHEN** `apps/web/.releaserc.mjs` or `apps/api/.releaserc.mjs` is imported as an ES module
- **THEN** the preset's writer options SHALL be destructured (the default `transform` separated from the rest) and the exported `writerOpts` SHALL include the custom scope-filtering `transform` delegating to the preset's default transform

#### Scenario: No CommonJS release configs remain

- **WHEN** the repository is searched for release configuration files (excluding `node_modules` and `openspec/changes/archive/`)
- **THEN** no `.releaserc.cjs` SHALL exist at the repository root, `apps/web/`, or `apps/api/`, and no source file SHALL `require('conventional-changelog-conventionalcommits')`

---

### Requirement: Scope-filtered release triggering for app streams

The `web-v*` and `api-v*` release streams SHALL NOT trigger a release for commits whose scope is excluded for that stream. The `releaseRules` of each app config SHALL consist of exactly the five scope exclusions (`api`/`web` cross-app, `tooling`, `docs`, `postman`, `release`) plus `{ breaking: true, release: 'major' }`; no `{ type: 'feat' }` or `{ type: 'fix' }` entries SHALL be present (they duplicate the preset defaults and shadow the exclusions, because the analyzer resolves multiple matching rules by highest release level). The root config's `releaseRules` SHALL be exactly `[{ breaking: true, release: 'major' }]` (the root stream has no scope exclusions by design).

#### Scenario: fix with an excluded scope triggers no app release

- **WHEN** a commit such as `fix(tooling): ...` (or `fix(docs)`, `fix(postman)`, `fix(release)`) is analyzed with the web or api `releaseRules`
- **THEN** the analyzer SHALL determine there is no release for that stream

#### Scenario: Cross-app fix triggers no release for the other app

- **WHEN** a commit `fix(api): ...` is analyzed with the web `releaseRules` (or `fix(web): ...` with the api `releaseRules`)
- **THEN** the analyzer SHALL determine there is no release for that stream

#### Scenario: Own-scope, unlisted-scope, or unscoped feat/fix bumps via preset defaults

- **WHEN** a commit `fix(web): ...` or `feat(web): ...` (own scope), `fix(ci): ...` (unlisted scope), or `fix: ...` (no scope) is analyzed with the web `releaseRules`
- **THEN** the analyzer SHALL fall back to the conventionalcommits preset defaults — `fix` → patch, `feat` → minor

#### Scenario: BREAKING CHANGE bumps major on all three streams

- **WHEN** a commit carrying a `BREAKING CHANGE` / `BREAKING CHANGES` footer (any scope, including excluded scopes) is analyzed with the root, web, or api `releaseRules`
- **THEN** the analyzer SHALL determine a major release for that stream

#### Scenario: Root stream keeps releasing on tooling commits

- **WHEN** a commit `fix(tooling): ...` is analyzed with the root `releaseRules`
- **THEN** the root stream SHALL still release (patch via preset defaults) — the root config has no scope exclusions by design

---

### Requirement: Changelog note filtering per app stream

The release-notes-generator `writerOpts.transform` of each app stream SHALL exclude commits scoped to the other app or to excluded scopes from that stream's changelog notes, while including unscoped commits and commits scoped to the stream's allowed scopes (`web`/`shared` for the web stream, `api`/`shared` for the api stream).

#### Scenario: Other apps' and excluded scopes' commits are excluded from notes

- **WHEN** the web stream generates release notes for a commit range containing `fix(api): ...` and `fix(tooling): ...` commits
- **THEN** those commits SHALL NOT appear in the web `CHANGELOG.md` release notes

#### Scenario: Own-scope and unscoped commits appear in notes

- **WHEN** the web stream generates release notes for a commit range containing `fix(web): ...`, `feat(shared): ...`, and `fix: ...` commits
- **THEN** those commits SHALL appear in the web `CHANGELOG.md` release notes

---

### Requirement: Zero known vulnerabilities in the dependency tree

The repository's dependency tree SHALL carry no known vulnerabilities.

#### Scenario: npm audit is clean

- **WHEN** `npm audit` is run at the repository root
- **THEN** it SHALL report `found 0 vulnerabilities`

---

### Requirement: Release tooling dependency hygiene

The root `package.json` devDependencies SHALL pin the release/commit toolchain at exact versions with no `^` or `~` ranges, and SHALL NOT contain unused release dependencies.

#### Scenario: Exact pins at the current versions

- **WHEN** the root `package.json` devDependencies are read
- **THEN** the release/commit toolchain SHALL be pinned exactly at `semantic-release` 25.0.9, `@commitlint/cli` 21.2.3, `@commitlint/config-conventional` 21.2.3, `lint-staged` 17.5.1, `concurrently` 10.0.5, `@semantic-release/changelog` 7.0.0, `@semantic-release/git` 11.0.1, and `conventional-changelog-conventionalcommits` 10.4.0, with `@semantic-release/commit-analyzer` 13.0.1, `@semantic-release/release-notes-generator` 14.1.1, and `husky` 9.1.7
- **AND** no release/commit toolchain entry SHALL use a `^` or `~` range

#### Scenario: semantic-release-monorepo is absent

- **WHEN** the root `package.json` and all release configuration files are inspected
- **THEN** `semantic-release-monorepo` SHALL NOT appear in devDependencies and no release config SHALL reference it (via `extends` or otherwise)

---

### Requirement: Commit message validation under commitlint 21

The commit-msg hook SHALL validate commit messages with commitlint 21 against the existing `commitlint.config.js` rules.

#### Scenario: Invalid commit message is rejected

- **WHEN** a commit message violating the rules (e.g. `invalid message` — fails `type-enum`) is checked with `npx --no -- commitlint --edit`
- **THEN** commitlint SHALL exit with code 1 and the commit SHALL be rejected

#### Scenario: Valid commit message is accepted

- **WHEN** a valid Conventional Commits message (e.g. `fix(api): correct health check response`) is checked with `npx --no -- commitlint --edit`
- **THEN** commitlint SHALL exit with code 0 and the commit SHALL proceed

---

### Requirement: Pre-commit formatting under lint-staged 17

The pre-commit hook SHALL run lint-staged 17 on staged files with the existing configuration (ESLint `--fix` + Prettier `--write` on staged `.ts`/`.tsx`/`.js`, Prettier `--write` on staged `.json`/`.md`/`.css`).

#### Scenario: lint-staged runs on staged files

- **WHEN** a developer stages a `.ts` file with auto-fixable lint or formatting issues and runs `git commit`
- **THEN** lint-staged SHALL auto-fix and re-stage the file and the commit SHALL proceed

#### Scenario: Hook chain is intact

- **WHEN** the husky hooks are invoked
- **THEN** `.husky/pre-commit` (lint-staged + typecheck) and `.husky/commit-msg` (commitlint) SHALL run unchanged
