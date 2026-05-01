## 1. Root semantic-release configuration

- [x] 1.1 Add `"version": "1.0.0"` field to the root `package.json`
- [x] 1.2 Create `.releaserc.json` at the repository root with:
  - `tagFormat: "v\${version}"`
  - `branches: ["main"]`
  - Plugin chain: `@semantic-release/npm` (npmPublish: false) → commit-analyzer (conventionalcommits preset) → release-notes-generator (conventionalcommits preset, with parserOpts for BREAKING CHANGES) → changelog (CHANGELOG.md) → git (assets: CHANGELOG.md + package.json, message: `chore(release): v\${nextRelease.version} [skip ci]`)
  - No `semantic-release-monorepo` — this runs at root level analyzing all commits

## 2. Update GitHub Actions workflow

- [x] 2.1 Add a `Release root` step to `.github/workflows/release.yml` as the **first** release step (before `Release web` and `Release api`):
  - Name: `Release root`
  - No `working-directory` (runs from repo root)
  - `env.GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`
  - Run: `npx semantic-release`

## 3. Verification

- [x] 3.1 Run `npm run build` — verify passes with no errors
- [x] 3.2 Run `npm run test` — verify passes with 0 errors and 0 warnings
- [x] 3.3 Run `npm run lint` — verify no lint errors
- [x] 3.4 Dry-run root release: from repo root run `npx semantic-release --dry-run --no-ci` — verify it reports `v1.0.0` as the next release and lists all historical commits without writing files or pushing
- [x] 3.5 Verify `.github/workflows/release.yml` has steps in order: `Release root` → `Release web` → `Release api`
