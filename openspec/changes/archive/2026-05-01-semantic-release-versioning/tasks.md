## 1. Install Dependencies

- [x] 1.1 Add `semantic-release` as exact devDependency at root `package.json`
- [x] 1.2 Add `semantic-release-monorepo` as exact devDependency at root `package.json`
- [x] 1.3 Add `@semantic-release/commit-analyzer` as exact devDependency at root `package.json`
- [x] 1.4 Add `@semantic-release/release-notes-generator` as exact devDependency at root `package.json`
- [x] 1.5 Add `@semantic-release/changelog` as exact devDependency at root `package.json`
- [x] 1.6 Add `@semantic-release/git` as exact devDependency at root `package.json`
- [x] 1.7 Add `conventional-changelog-conventionalcommits` as exact devDependency at root `package.json`
- [x] 1.8 Run `npm install` at root to lock all new dependencies in `package-lock.json`

## 2. Configure apps/web

- [x] 2.1 Add `"version": "0.0.0"` field to `apps/web/package.json` (semantic-release will overwrite this on first run)
- [x] 2.2 Create `apps/web/.releaserc.json` with:
  - `tagFormat: "web-v\${version}"`
  - `branches: ["main"]`
  - `preset: "conventionalcommits"` in commit-analyzer and release-notes-generator
  - Scope filter: include commits with scope `web`, `shared`, or no scope; exclude scope `api`
  - Plugin chain: commit-analyzer → release-notes-generator → changelog → git
  - `@semantic-release/changelog` pointing to `CHANGELOG.md`
  - `@semantic-release/git` assets `["CHANGELOG.md", "package.json"]` with message `chore(release): web-v\${nextRelease.version} [skip ci]`
  - `npmPublish: false`

## 3. Configure apps/api

- [x] 3.1 Add `"version": "0.0.0"` field to `apps/api/package.json` (semantic-release will overwrite this on first run)
- [x] 3.2 Create `apps/api/.releaserc.json` with:
  - `tagFormat: "api-v\${version}"`
  - `branches: ["main"]`
  - `preset: "conventionalcommits"` in commit-analyzer and release-notes-generator
  - Scope filter: include commits with scope `api`, `shared`, or no scope; exclude scope `web`
  - Plugin chain: commit-analyzer → release-notes-generator → changelog → git
  - `@semantic-release/changelog` pointing to `CHANGELOG.md`
  - `@semantic-release/git` assets `["CHANGELOG.md", "package.json"]` with message `chore(release): api-v\${nextRelease.version} [skip ci]`
  - `npmPublish: false`

## 4. GitHub Actions Workflow

- [x] 4.1 Create `.github/workflows/` directory if it does not exist
- [x] 4.2 Create `.github/workflows/release.yml` with:
  - Trigger: `push` to `main` only
  - Permissions: `contents: write`
  - Job: single job `release` on `ubuntu-latest`
  - Step 1: `actions/checkout@v4` with `fetch-depth: 0`
  - Step 2: `actions/setup-node@v4` with `node-version: '20'`
  - Step 3: `npm ci` (root)
  - Step 4: run `npx semantic-release` with `working-directory: apps/web` and `GITHUB_TOKEN` env var
  - Step 5: run `npx semantic-release` with `working-directory: apps/api` and `GITHUB_TOKEN` env var

## 5. Verification

- [x] 5.1 Run `npm run build` — verify build passes with no errors
- [x] 5.2 Run `npm run test` — verify all tests pass with no errors or warnings
- [x] 5.3 Run `npm run lint` — verify no lint errors introduced
- [x] 5.4 Dry-run semantic-release locally for web: `cd apps/web && npx semantic-release --dry-run --no-ci` — verify it analyzes commits and reports the expected `v1.0.0` release without pushing anything
- [x] 5.5 Dry-run semantic-release locally for api: `cd apps/api && npx semantic-release --dry-run --no-ci` — verify same for api
- [ ] 5.6 Commit all changes and push to `main` — verify GitHub Actions workflow runs, produces `web-v1.0.0` and `api-v1.0.0` tags, and commits `CHANGELOG.md` files back to the repo
