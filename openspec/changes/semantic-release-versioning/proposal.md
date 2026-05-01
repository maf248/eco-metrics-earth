## Why

The project uses Conventional Commits via Commitizen but has no automated versioning or changelog generation. Version bumps are manual and error-prone, and there is no CHANGELOG to communicate what changed between releases. Introducing semantic-release automates this entirely — every merge to `main` produces a correctly versioned release with a generated changelog based on commit history.

## What Changes

- Add `semantic-release` and supporting plugins as devDependencies (root + per-app)
- Add `semantic-release-monorepo` to enable per-app versioning within the NX monorepo
- Add `.releaserc.json` config to `apps/web` and `apps/api` with scoped commit filtering
- Add `version` field to `apps/web/package.json` and `apps/api/package.json` (starting at `1.0.0` after first run)
- Add `CHANGELOG.md` to `apps/web` and `apps/api` (generated automatically, committed back)
- Add `.github/workflows/release.yml` — GitHub Actions workflow triggered on push to `main`
- Git tags per app: `web-v1.0.0`, `api-v1.0.0` (monorepo tag convention)
- First run retroactively generates `v1.0.0` for both apps from full commit history

## Capabilities

### New Capabilities

- `semantic-release-config`: semantic-release configuration per app (`apps/web/.releaserc.json`, `apps/api/.releaserc.json`) with plugin chain, tag format, and scope filtering
- `release-workflow`: GitHub Actions workflow (`.github/workflows/release.yml`) that runs semantic-release for web and api sequentially on every push to `main`

### Modified Capabilities

*(none — no existing spec-level behavior changes)*

## Non-Goals

- GitHub Releases (no `@semantic-release/github` release creation)
- Publishing to npm (both apps are private, `npmPublish: false`)
- Global/root-level version for the monorepo
- Deployment automation (Vercel and Railway handle deployment natively)
- Independent release triggers per app (both always evaluated on push to main)
- Changelog for `packages/shared` (library with no direct consumers outside the monorepo)

## Impact

- **New files**: `apps/web/.releaserc.json`, `apps/api/.releaserc.json`, `.github/workflows/release.yml`, `apps/web/CHANGELOG.md`, `apps/api/CHANGELOG.md` (generated on first run)
- **Modified files**: `package.json` (root devDependencies), `apps/web/package.json`, `apps/api/package.json`
- **New git tags**: `web-v1.0.0`, `api-v1.0.0` created on first CI run
- **Dependencies**: `semantic-release`, `semantic-release-monorepo`, `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/git`, `conventional-changelog-conventionalcommits`
- **CI**: Requires `GITHUB_TOKEN` (automatically available in GitHub Actions — no secrets setup needed)
