# Proposal: Upgrade Release Tooling (roadmap D1 + two user-approved additions)

## Why

`npm audit` currently reports **19 advisories (0 critical, 15 high, 3 moderate, 1 low)** — every one of them living inside the bundled `npm@10.9.9` tarball reached through `semantic-release` 24.2.9 → `@semantic-release/npm`. Because the vulnerable code is *bundled*, `npm audit fix` can never reach it; the only fix is upgrading `semantic-release` to 25, which depends on `@semantic-release/npm ^13.1.1` bundling `npm@11.20.0`. A scratch install with the exact target versions and this repo's `.npmrc` yields **0 vulnerabilities**. This is roadmap item **D1** (and resolves backlog item **I01**).

The upgrade chain forces one breaking-change migration: `conventional-changelog-conventionalcommits@10` is ESM-only (`require()` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`), so all three release configs (root, `apps/web`, `apps/api`) must migrate from `.releaserc.cjs` to `.releaserc.mjs`.

Migrating those configs surfaces a **pre-existing release-triggering bug** (user-approved addition #1): the `releaseRules` in the web/api configs end with `{ type: 'feat', release: 'minor' }` and `{ type: 'fix', release: 'patch' }` — literal duplicates of the conventionalcommits preset defaults. `@semantic-release/commit-analyzer` resolves multiple matching rules by **highest release level**, so those type rules shadow every scope exclusion: `fix(api)` still bumps the web stream. This is exactly how `web-v2.4.2` and `api-v2.4.2` were released off a single `fix(tooling)` commit, with empty changelog sections (the notes *filtering* worked; the release *triggering* did not).

Finally, `semantic-release-monorepo` 8.0.2 is a **dead dependency** (user-approved addition #2): it is a shareable config activated only via `extends`, no config extends it, and `release.yml` runs bare `npx semantic-release`. It is removed.

## What Changes

- **Upgrade 8 root devDependencies to exact-pinned majors** (no `^`/`~`, per repo policy):

  | Package | Current | Target |
  |---|---|---|
  | `semantic-release` | 24.2.9 | 25.0.9 |
  | `@commitlint/cli` | 20.5.3 | 21.2.3 |
  | `@commitlint/config-conventional` | 20.5.3 | 21.2.3 |
  | `lint-staged` | 16.4.0 | 17.5.1 |
  | `concurrently` | 9.2.4 | 10.0.5 |
  | `@semantic-release/changelog` | 6.0.3 | 7.0.0 |
  | `@semantic-release/git` | 10.0.1 | 11.0.1 |
  | `conventional-changelog-conventionalcommits` | 9.3.1 | 10.4.0 |

- **Leave 3 packages unchanged** (already latest — must NOT be bumped): `@semantic-release/commit-analyzer` 13.0.1, `@semantic-release/release-notes-generator` 14.1.1, `husky` 9.1.7.
- **Remove `semantic-release-monorepo` 8.0.2** from root devDependencies (dead — activated only via `extends`, which no config uses).
- **Migrate the three release configs to ESM**: delete `.releaserc.cjs` at root, `apps/web/`, `apps/api/`; create `.releaserc.mjs` in each location with `import preset from 'conventional-changelog-conventionalcommits'` and `export default { ... }`. Everything else in each config (plugin chain, `tagFormat`, `parserOpts`, `writerOpts` transform, release commit messages) is preserved verbatim.
- **Fix the releaseRules bug in the same migration**: remove the redundant `{ type: 'feat', release: 'minor' }` and `{ type: 'fix', release: 'patch' }` rules from all three configs, keeping `{ breaking: true, release: 'major' }`. Result (empirically verified with the exact analyzer): `fix(tooling)` / cross-app `fix(api)`/`fix(web)` no longer release the excluded app streams; `feat`/`fix` with own, unlisted, or absent scope still bump via preset defaults; `BREAKING CHANGE` still bumps major on all three streams; root behavior is unchanged.
- **Regenerate `package-lock.json`** (`npm install` with the repo's `.npmrc`).
- **Update `ROADMAP.md`** per its own sequence-continuity rule: delete the completed D1 block (renumber D2 → D1), delete the resolved I01 block (renumber I02–I16 → I01–I15, updating every cross-reference), flip the status-table "Dependencias" row from 🟡 to ✅, and set "Última actualización" to the implementation date.

## Capabilities

### New Capabilities

- `release-tooling`: the release/commit toolchain as a whole — ESM release configs that load cleanly, scope-filtered release triggering for the app streams, per-app changelog note filtering, a vulnerability-free and hygienic dependency tree (exact pins, no dead release dependencies), and commit-message validation / pre-commit formatting continuing to work under the new majors.

### Modified Capabilities

- None. `pre-commit-quality-gate` describes hook *behavior*, not versions, and its behavior is unchanged (verified) — no delta is created for it. No other existing capability is touched.

## Non-Goals

- **No application code changes** — `apps/web/src/`, `apps/api/src/`, and `packages/shared/` are untouched; the site and BFF behave identically before and after.
- **No Node version change** — `.nvmrc` (`24`), CI `setup-node` (`24`), and the Cloud Run Docker base (`node:24-alpine`) stay as-is (Node 24.21.0 already satisfies every new engine requirement; strictest is `>=24.15`).
- **No workflow or hook file changes** — `.github/workflows/release.yml`, `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push` need zero edits (verified: the workflow runs bare `npx semantic-release` per directory, and semantic-release 25 discovers `.releaserc.mjs` automatically).
- **No `commitlint.config.js` changes** — verified working under commitlint 21 with correct exit codes.
- **No openspec CLI installation** — that decision is tracked separately in the ROADMAP backlog (spec-hygiene item), not settled in passing here.
- **No new release streams, no GitHub Releases** — the three existing streams (root `v*`, `web-v*`, `api-v*`) and their tag formats are preserved.
- **No `semantic-release-monorepo` replacement** — it is dead weight, not a missing piece; nothing takes its place.
- **No changes to `CHANGELOG.md` history files** — existing content at root, `apps/web/`, `apps/api/` stays exactly as-is; only future releases append.
- **No changes to the `overrides` section** (`chokidar`, `multer`, `readdirp`, `smol-toml`) — untouched.
- **No version bumps for `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, or `husky`** — they are already at their latest versions.

## Impact

| Area | Change |
|------|--------|
| Root `package.json` | 8 devDependency pins move to the exact target majors; `semantic-release-monorepo` entry deleted. No other keys touched (`overrides`, scripts, lint-staged config stay verbatim) |
| `package-lock.json` | Regenerated — the `semantic-release` / `@semantic-release/npm` / bundled-npm subtree is replaced; `semantic-release-monorepo` entries removed |
| `.releaserc.cjs` (×3: root, `apps/web/`, `apps/api/`) | **Deleted** |
| `.releaserc.mjs` (×3: root, `apps/web/`, `apps/api/`) | **Created** — ESM import of the conventionalcommits preset, identical plugin chain and options, plus the releaseRules fix (two redundant type rules removed) |
| `ROADMAP.md` | D1 block deleted (D2 → D1), I01 block deleted (I02–I16 → I01–I15 with all cross-references updated), status "Dependencias" row 🟡 → ✅, "Última actualización" set to the implementation date |
| `npm audit` | 19 advisories (0 critical / 15 high / 3 moderate / 1 low) → **0 vulnerabilities** |

**Explicitly untouched:** `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `.husky/*`, `commitlint.config.js`, `README.md`, `AGENTS.md`, `docs/`, `apps/**/src/`, `packages/shared/**`, all three `CHANGELOG.md` files (existing content), `.npmrc`, `nx.json`, Docker/deploy configs. The Cloud Run image rebuild triggered by the lockfile change is expected and harmless (runtime installs only api prod deps in the pruned dist).
