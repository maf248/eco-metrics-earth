## ADDED Requirements

### Requirement: Root semantic-release configuration
A `.releaserc.json` file SHALL exist at the repository root configured to run standard semantic-release (without `semantic-release-monorepo`) with:
- `tagFormat: "v\${version}"` (standard unprefixed format)
- `branches: ["main"]`
- `preset: "conventionalcommits"` in both commit-analyzer and release-notes-generator
- Plugin chain: `@semantic-release/npm` (npmPublish: false) → commit-analyzer → release-notes-generator → changelog → git
- `@semantic-release/changelog` targeting `CHANGELOG.md` at the repo root
- `@semantic-release/git` committing `["CHANGELOG.md", "package.json"]` with message `chore(release): v\${nextRelease.version} [skip ci]`

#### Scenario: Root config file exists
- **WHEN** `.releaserc.json` at the repository root is read
- **THEN** it SHALL contain `tagFormat: "v\${version}"`, `branches: ["main"]`, the `conventionalcommits` preset, and the five required plugins in order

#### Scenario: No npm publish
- **WHEN** semantic-release runs from the repository root
- **THEN** it SHALL NOT attempt to publish to npm (`npmPublish: false`)

---

### Requirement: Root package.json version field
The root `package.json` SHALL have a `"version"` field managed by semantic-release.
- Initial placeholder value before first release: `"1.0.0"`
- After each release: updated to the new version by `@semantic-release/git`

#### Scenario: Version field exists in root package.json
- **WHEN** the root `package.json` is read
- **THEN** it SHALL have a `"version"` field

#### Scenario: Version is updated after root release
- **WHEN** a root release run completes successfully
- **THEN** the root `package.json` `"version"` SHALL match the new `v*` git tag version

---

### Requirement: Root CHANGELOG.md covers all commits
The root `CHANGELOG.md` SHALL accumulate release notes for all releasable commits from any part of the repository — including changes to `apps/web`, `apps/api`, `packages/shared`, and root-level files.

#### Scenario: Root CHANGELOG is created on first release
- **WHEN** `CHANGELOG.md` does not exist at the repo root and a release is triggered
- **THEN** the file SHALL be created with entries for all releasable commits in the full history under version `1.0.0`

#### Scenario: Root CHANGELOG is prepended on subsequent releases
- **WHEN** root `CHANGELOG.md` already exists and a new release is triggered
- **THEN** the new release notes SHALL be prepended, preserving prior history

---

### Requirement: Root release commit skips CI
The git commit pushed by the root semantic-release run SHALL include `[skip ci]` in its message to prevent a recursive workflow trigger.

#### Scenario: Release commit message contains skip ci
- **WHEN** semantic-release commits the root CHANGELOG and version bump back to main
- **THEN** the commit message SHALL be `chore(release): v<version> [skip ci]`

---

### Requirement: Root tag uses unprefixed v* format
The root release SHALL create a git tag in the format `v<major>.<minor>.<patch>` (e.g., `v1.0.0`). This tag SHALL NOT conflict with the existing `web-v*` and `api-v*` per-app tags.

#### Scenario: Root tag format is unprefixed
- **WHEN** a root release completes
- **THEN** a git tag matching `v[0-9]+\.[0-9]+\.[0-9]+` SHALL be created (e.g., `v1.0.0`)

#### Scenario: Root tag does not conflict with app tags
- **WHEN** both root and per-app releases have run
- **THEN** the repository SHALL have distinct tag sets: `v*` for root, `web-v*` for web, `api-v*` for api — with no overlap
