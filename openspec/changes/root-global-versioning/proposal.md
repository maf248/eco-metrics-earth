## Why

The existing semantic-release setup versions `apps/web` and `apps/api` independently, but there is no product-level version — the root `package.json` has no `version` field and no `CHANGELOG.md` exists at the repo root. Stakeholders and contributors have no single place to track what changed in the product as a whole. Adding a global release layer provides that overview without interfering with the per-app versioning already in place.

## What Changes

- Add `.releaserc.json` at the repo root configured to run standard semantic-release (no `semantic-release-monorepo`) against all commits
- Add `"version"` field to root `package.json` (starting at `1.0.0` after first run)
- Generate `CHANGELOG.md` at the repo root accumulating all commits from all apps and shared packages
- Add a `release-root` step to `.github/workflows/release.yml` that runs **before** the existing web and api release steps
- Git tag format: `v${version}` (standard, no app prefix) — e.g., `v1.0.0`, `v1.1.0`
- Root release commit message: `chore(release): v${nextRelease.version} [skip ci]`

## Capabilities

### New Capabilities

- `root-release-config`: semantic-release configuration at the repo root (`.releaserc.json`) for global product versioning and changelog generation
- `root-release-workflow-step`: new step in the existing GitHub Actions release workflow that runs the root release before per-app releases

### Modified Capabilities

- `release-workflow`: the existing workflow gains a new first step (`release-root`) before `release-web` and `release-api`

## Non-Goals

- Replacing or modifying the per-app (`web`, `api`) versioning — those remain unchanged
- Linking or synchronizing the root version with app versions (they evolve independently)
- Publishing the root package to npm
- Creating GitHub Releases
- Changing the tag format of `web-v*` or `api-v*` tags

## Impact

- **New files**: `.releaserc.json` (root), `CHANGELOG.md` (root, generated on first CI run)
- **Modified files**: `package.json` (root — add `version` field), `.github/workflows/release.yml` (add root release step)
- **New git tag**: `v1.0.0` created on first CI run
- **No changes** to `apps/web/.releaserc.json`, `apps/api/.releaserc.json`, or any app code
