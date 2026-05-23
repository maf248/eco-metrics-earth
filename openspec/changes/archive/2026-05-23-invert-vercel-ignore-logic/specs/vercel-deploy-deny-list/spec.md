## ADDED Requirements

### Requirement: Vercel deploys are skipped only for denylist-only changes

The Vercel deployment pipeline SHALL skip a build when, and only when, every file changed between the previously deployed commit and the current commit falls entirely within the following denylist scopes:

- `apps/api/` directory and all its contents
- `openspec/` directory and all its contents
- Files matching the `*.md` glob pattern (any Markdown file at any path)

If ANY changed file falls outside these scopes, the build SHALL proceed and a new deployment SHALL be created.

#### Scenario: All changes are in apps/api/ only

- **WHEN** a push to `main` changes only files under `apps/api/`
- **THEN** Vercel skips the build and does NOT create a new deployment

#### Scenario: All changes are in openspec/ only

- **WHEN** a push to `main` changes only files under `openspec/`
- **THEN** Vercel skips the build and does NOT create a new deployment

#### Scenario: All changes are Markdown files only

- **WHEN** a push to `main` changes only `*.md` files
- **THEN** Vercel skips the build and does NOT create a new deployment

#### Scenario: Mix of denylist-only scopes

- **WHEN** a push to `main` changes files in both `apps/api/` and `openspec/` but nothing outside the denylist
- **THEN** Vercel skips the build and does NOT create a new deployment

#### Scenario: Change to apps/web/ triggers build

- **WHEN** a push to `main` changes any file under `apps/web/`
- **THEN** Vercel runs the build and creates a new deployment

#### Scenario: Change to root config triggers build

- **WHEN** a push to `main` changes `vercel.json` (or `nx.json`, `tsconfig.base.json`, root `package.json`)
- **THEN** Vercel runs the build and creates a new deployment

#### Scenario: Change to .github/ triggers build

- **WHEN** a push to `main` changes files under `.github/`
- **THEN** Vercel runs the build and creates a new deployment

#### Scenario: Mixed api and web changes trigger build

- **WHEN** a push to `main` changes files in both `apps/api/` and `apps/web/`
- **THEN** Vercel runs the build and creates a new deployment

### Requirement: Guard clauses for missing git SHAs are preserved

The denylist check SHALL be preceded by the same guard clauses as the current command:

- If `VERCEL_GIT_PREVIOUS_SHA` is unset or empty, exit 1 (trigger build).
- If `VERCEL_GIT_PREVIOUS_SHA` cannot be resolved (e.g., force-pushed away), exit 1 (trigger build).

These guards ensure the denylist check always has valid inputs to compare.

#### Scenario: Previous SHA is unset

- **WHEN** Vercel runs the ignoreCommand with `VERCEL_GIT_PREVIOUS_SHA` unset or empty
- **THEN** the command exits with code 1, triggering a build regardless of changed files

#### Scenario: Previous SHA is unresolvable

- **WHEN** Vercel runs the ignoreCommand with a `VERCEL_GIT_PREVIOUS_SHA` that does not exist in the repository
- **THEN** the command exits with code 1, triggering a build regardless of changed files
