## ADDED Requirements

### Requirement: Root release step runs before per-app releases
The `.github/workflows/release.yml` workflow SHALL include a `release-root` step that runs semantic-release from the repository root directory, and this step SHALL execute before the existing `release-web` and `release-api` steps.

#### Scenario: Root release step is the first release step
- **WHEN** the workflow YAML is inspected
- **THEN** the step running semantic-release from the repo root SHALL appear before the steps running semantic-release from `apps/web` and `apps/api`

#### Scenario: Per-app releases run after root release
- **WHEN** the root release step completes (with or without producing a new release)
- **THEN** the web and api release steps SHALL run sequentially after it

---

### Requirement: Root release step runs from the repository root
The root release step SHALL NOT set a `working-directory` (or SHALL set it to `.`), so that semantic-release reads the root `.releaserc.json` and writes `CHANGELOG.md` and updates `package.json` at the repo root.

#### Scenario: Root semantic-release has no app working-directory
- **WHEN** the root release step executes
- **THEN** the working directory SHALL be the repository root (not `apps/web` or `apps/api`)

---

### Requirement: Root release step uses GITHUB_TOKEN
The root release step SHALL have `GITHUB_TOKEN` set as an environment variable, identical to the existing per-app steps, so that semantic-release can push tags and the release commit.

#### Scenario: GITHUB_TOKEN is available in root release step
- **WHEN** the root release step runs
- **THEN** `GITHUB_TOKEN` SHALL be set from `\${{ secrets.GITHUB_TOKEN }}`
