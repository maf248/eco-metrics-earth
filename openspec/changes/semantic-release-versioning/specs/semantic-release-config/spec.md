## ADDED Requirements

### Requirement: Per-app semantic-release configuration
Each app (`apps/web` and `apps/api`) SHALL have its own `.releaserc.json` file that configures semantic-release to:
- Use the `conventionalcommits` preset for commit analysis
- Use `semantic-release-monorepo` tag format (`web-v${version}` / `api-v${version}`)
- Run the full plugin chain: commit-analyzer → release-notes-generator → changelog → git
- Set `npmPublish: false` (apps are not published to npm)
- Only release on the `main` branch

#### Scenario: Web app release config exists
- **WHEN** `apps/web/.releaserc.json` is read
- **THEN** it SHALL contain `tagFormat: "web-v\${version}"`, the `conventionalcommits` preset, and the four required plugins in order

#### Scenario: API app release config exists
- **WHEN** `apps/api/.releaserc.json` is read
- **THEN** it SHALL contain `tagFormat: "api-v\${version}"`, the `conventionalcommits` preset, and the four required plugins in order

#### Scenario: No npm publish configured
- **WHEN** semantic-release runs for either app
- **THEN** it SHALL NOT attempt to publish to npm (`npmPublish: false` in the npm plugin config or equivalent)

---

### Requirement: Scope-based commit filtering
Each app's commit-analyzer SHALL be configured to only count commits relevant to that app:
- Commits with scope `(web)` affect only `web`
- Commits with scope `(api)` affect only `api`
- Commits with scope `(shared)` affect both apps
- Commits with no scope affect both apps
- Commits with the other app's specific scope are ignored

#### Scenario: API-scoped commit does not bump web version
- **WHEN** a `fix(api): ...` commit is the only new commit since last web release
- **THEN** semantic-release for `web` SHALL determine no release is needed

#### Scenario: Shared-scoped commit bumps both apps
- **WHEN** a `feat(shared): ...` commit is present since the last release
- **THEN** semantic-release for both `web` and `api` SHALL include it in version calculation

#### Scenario: Unscoped commit bumps both apps
- **WHEN** a `feat: ...` commit (no scope) is present since the last release
- **THEN** semantic-release for both `web` and `api` SHALL include it in version calculation

---

### Requirement: SemVer bump rules
semantic-release SHALL apply the following bump rules based on Conventional Commits:
- `fix:` type → patch bump (e.g., `1.0.0` → `1.0.1`)
- `feat:` type → minor bump (e.g., `1.0.0` → `1.1.0`)
- `BREAKING CHANGE:` footer OR `feat!:`/`fix!:` shorthand → major bump (e.g., `1.0.0` → `2.0.0`)
- `chore:`, `docs:`, `style:`, `test:`, `refactor:` → no release

#### Scenario: Fix commit produces patch release
- **WHEN** the only new commits are of type `fix:`
- **THEN** the version SHALL increment the patch segment only

#### Scenario: Feature commit produces minor release
- **WHEN** the only new commits are of type `feat:` (no breaking change)
- **THEN** the version SHALL increment the minor segment and reset patch to 0

#### Scenario: Breaking change produces major release
- **WHEN** a commit contains `BREAKING CHANGE:` in its footer OR uses `feat!:` or `fix!:` syntax
- **THEN** the version SHALL increment the major segment and reset minor and patch to 0

#### Scenario: Chore/docs commits produce no release
- **WHEN** all new commits are of type `chore:`, `docs:`, `style:`, `test:`, or `refactor:`
- **THEN** semantic-release SHALL skip the release entirely

---

### Requirement: CHANGELOG generation and git commit
Each app's semantic-release run SHALL:
- Write or prepend release notes to `apps/<app>/CHANGELOG.md`
- Commit `CHANGELOG.md` and `package.json` back to the `main` branch with message `chore(release): <app>-v\${nextRelease.version} [skip ci]`
- Push the commit to `origin/main`

#### Scenario: CHANGELOG is created on first release
- **WHEN** `apps/web/CHANGELOG.md` does not exist and a release is triggered
- **THEN** the file SHALL be created with the full release notes for `v1.0.0`

#### Scenario: CHANGELOG is prepended on subsequent releases
- **WHEN** `apps/web/CHANGELOG.md` already exists and a new release is triggered
- **THEN** the new release notes SHALL be prepended, preserving prior history

#### Scenario: Release commit skips CI
- **WHEN** semantic-release commits the CHANGELOG and version bump back to main
- **THEN** the commit message SHALL contain `[skip ci]` to prevent a recursive workflow trigger

---

### Requirement: Package.json version field
Each app's `package.json` SHALL have a `version` field managed by semantic-release:
- Initial value before first release: `"1.0.0"` (placeholder; will be overwritten by first run)
- After each release: updated to the new version by `@semantic-release/git`

#### Scenario: Version field exists in both app package.json files
- **WHEN** `apps/web/package.json` and `apps/api/package.json` are read
- **THEN** both SHALL have a `"version"` field

#### Scenario: Version is updated after release
- **WHEN** a release run completes successfully
- **THEN** the app's `package.json` `"version"` field SHALL match the new git tag version

---

### Requirement: Retroactive v1.0.0 from full commit history
When no git tags exist for an app, semantic-release SHALL treat the entire commit history as the first release window and generate `v1.0.0` with a CHANGELOG that covers all commits from the beginning of the repository. No manual tagging or history manipulation is required.

#### Scenario: First release captures all historical commits
- **WHEN** no `web-v*` tag exists in the repository and the workflow runs for the first time
- **THEN** semantic-release SHALL produce `web-v1.0.0`, create `apps/web/CHANGELOG.md` with entries for all releasable commits in the full history, and push the tag to `origin`

#### Scenario: First API release captures all historical commits
- **WHEN** no `api-v*` tag exists in the repository and the workflow runs for the first time
- **THEN** semantic-release SHALL produce `api-v1.0.0`, create `apps/api/CHANGELOG.md` with entries for all releasable commits in the full history, and push the tag to `origin`

#### Scenario: Dry-run confirms retroactive release before first push
- **WHEN** `npx semantic-release --dry-run --no-ci` is run from `apps/web` or `apps/api` with no existing tags
- **THEN** the output SHALL report the next release as `1.0.0` and list all commits that will be included in the CHANGELOG, without writing any files or pushing anything
