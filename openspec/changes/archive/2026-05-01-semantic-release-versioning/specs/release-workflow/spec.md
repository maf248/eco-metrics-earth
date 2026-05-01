## ADDED Requirements

### Requirement: GitHub Actions release workflow file
A workflow file SHALL exist at `.github/workflows/release.yml` that automates semantic-release execution.

#### Scenario: Workflow file is present
- **WHEN** `.github/workflows/release.yml` is read
- **THEN** it SHALL be a valid GitHub Actions workflow YAML file

---

### Requirement: Workflow triggers on push to main only
The workflow SHALL be triggered exclusively by push events to the `main` branch. It SHALL NOT trigger on pull requests, other branches, or manual dispatch.

#### Scenario: Push to main triggers the workflow
- **WHEN** a commit is pushed to `main`
- **THEN** the release workflow SHALL be queued to run

#### Scenario: Push to feature branch does not trigger workflow
- **WHEN** a commit is pushed to any branch other than `main`
- **THEN** the release workflow SHALL NOT run

---

### Requirement: Full git history checkout
The workflow checkout step SHALL use `fetch-depth: 0` to ensure semantic-release has access to the complete commit and tag history needed for version calculation.

#### Scenario: Full history is available during release
- **WHEN** the workflow runs `actions/checkout`
- **THEN** `fetch-depth: 0` SHALL be set so all commits and tags are available

---

### Requirement: Node.js 20 setup
The workflow SHALL set up Node.js v20 LTS (matching `.nvmrc`) before running any npm commands.

#### Scenario: Node.js version matches project requirement
- **WHEN** the workflow sets up Node.js
- **THEN** it SHALL use `node-version: '20'`

---

### Requirement: Dependencies installed before release
The workflow SHALL run `npm ci` at the repository root before executing semantic-release, ensuring all devDependencies (including semantic-release plugins) are available.

#### Scenario: npm ci runs before release steps
- **WHEN** the workflow job executes
- **THEN** `npm ci` SHALL run before any `semantic-release` command

---

### Requirement: Sequential release execution (web then api)
The workflow SHALL run semantic-release for `apps/web` first, then for `apps/api`, sequentially in the same job. Parallel execution is explicitly prohibited to avoid git push conflicts.

#### Scenario: Web release runs before API release
- **WHEN** the workflow executes the release job
- **THEN** the web release step SHALL complete before the api release step begins

#### Scenario: API release runs after web release
- **WHEN** the web release step completes (with or without a new release)
- **THEN** the api release step SHALL run regardless of whether web produced a release

---

### Requirement: GITHUB_TOKEN permissions for release commits
The workflow job SHALL have `write` permissions for `contents` so that semantic-release can push the CHANGELOG commit and tags back to the repository.

#### Scenario: Workflow has contents write permission
- **WHEN** the workflow YAML is inspected
- **THEN** the job or workflow-level permissions SHALL include `contents: write`

---

### Requirement: semantic-release runs from each app directory
Each semantic-release command in the workflow SHALL be executed from within its respective app directory (`apps/web` or `apps/api`) so that `semantic-release-monorepo` correctly scopes tags, commits, and the CHANGELOG file.

#### Scenario: Web semantic-release runs from apps/web
- **WHEN** the workflow runs semantic-release for web
- **THEN** the working directory SHALL be `apps/web` (via `working-directory: apps/web` or equivalent)

#### Scenario: API semantic-release runs from apps/api
- **WHEN** the workflow runs semantic-release for api
- **THEN** the working directory SHALL be `apps/api` (via `working-directory: apps/api` or equivalent)
