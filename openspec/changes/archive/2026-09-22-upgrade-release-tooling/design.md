# Design: Upgrade Release Tooling (semantic-release 25, commitlint 21, lint-staged 17, concurrently 10)

## Context

This is a toolchain maintenance change implementing roadmap **D1** plus two user-approved additions (the releaseRules fix and the `semantic-release-monorepo` removal). All evidence below was **empirically verified by the orchestrator** before this spec was written — the conclusions are settled, not provisional.

Four forces drive the change:

1. **Security.** `npm audit` reports 19 advisories (0 critical, 15 high, 3 moderate, 1 low — verified 16 Sep 2026, ROADMAP I01). **All 19** live exclusively in the chain `semantic-release` 24.2.9 → `@semantic-release/npm` → the **bundled `npm@10.9.9` tarball** (`@sigstore/*`, `brace-expansion`, `ip-address`, `picomatch`, `postcss-selector-parser`, `@npmcli/*`/`libnpm*`). Bundled dependencies are unreachable for `npm audit fix` — the only remedy is upgrading past them.
2. **A forced config migration.** `conventional-changelog-conventionalcommits@10` (required by the upgrade chain) is **ESM with `exports` exposing only the `import` condition**. `require('conventional-changelog-conventionalcommits')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. All three current configs are `.releaserc.cjs` using `const preset = require('conventional-changelog-conventionalcommits').default;` — they must become `.releaserc.mjs`.
3. **A pre-existing release-triggering bug** surfaced by the migration (user-approved addition): the web/api `releaseRules` type entries shadow the scope exclusions, so app streams release on each other's and on tooling commits.
4. **A dead dependency** (user-approved addition): `semantic-release-monorepo` is installed but never activated.

## Goals / Non-Goals

**Goals:**

- Clear all 19 audit advisories → `npm audit` reports **0 vulnerabilities** (hard gate).
- Upgrade the release/commit toolchain majors with **exact pins** (no `^`/`~`).
- Migrate the three release configs to ESM (`.releaserc.mjs`) with zero behavioral drift beyond the intended releaseRules fix.
- Fix scope-filtered release triggering so app streams stop releasing on excluded-scope commits.
- Remove the dead `semantic-release-monorepo` dependency.
- Keep every validation gate green with zero errors and zero warnings (`npm run lint`, `npm run build`, `npm run test`, `npm run e2e`).
- Update `ROADMAP.md` per its own sequence-continuity rule.

**Non-Goals:** (identical to the proposal — no app code changes, no Node version change, no workflow/hook changes, no openspec CLI installation, no new release streams, no GitHub Releases, no monorepo-plugin replacement, no `CHANGELOG.md` history edits, no `overrides` changes, no bumps for the three already-latest packages.)

## Decisions

### 1. Upgrade matrix — exact pins, three packages deliberately untouched, one removed

| Package | Current | Target | Notes |
|---|---|---|---|
| `semantic-release` | 24.2.9 | **25.0.9** | Clears the audit block (see Decision 2) |
| `@commitlint/cli` | 20.5.3 | **21.2.3** | Breaking change is output-format only (no-op for us) |
| `@commitlint/config-conventional` | 20.5.3 | **21.2.3** | Lockstep with the CLI |
| `lint-staged` | 16.4.0 | **17.5.1** | yaml support now optional — our config is JSON in `package.json` |
| `concurrently` | 9.2.4 | **10.0.5** | ESM-only CLI; we pass explicit `--prefix-colors` in `dev:local` |
| `@semantic-release/changelog` | 6.0.3 | **7.0.0** | Engine `>=24.15` — satisfied |
| `@semantic-release/git` | 10.0.1 | **11.0.1** | Engine `>=24.15` — satisfied |
| `conventional-changelog-conventionalcommits` | 9.3.1 | **10.4.0** | ESM-only — forces the config migration (Decision 3) |

**UNCHANGED (already latest — must NOT be bumped):** `@semantic-release/commit-analyzer` 13.0.1, `@semantic-release/release-notes-generator` 14.1.1, `husky` 9.1.7.

**REMOVED:** `semantic-release-monorepo` 8.0.2 (Decision 5).

All of these are **root devDependencies** — no app-level `package.json` is touched.

### 2. The audit chain — why these majors clear all 19 advisories

**Verified evidence:** every current advisory lives in the bundled `npm@10.9.9` inside `@semantic-release/npm` under `semantic-release` 24.2.9. `semantic-release` **25.0.9** depends on `@semantic-release/npm ^13.1.1`, which bundles **`npm@11.20.0`**. A scratch install with the exact target versions plus this repo's `.npmrc` (`legacy-peer-deps=true`) and the existing `overrides` yielded **`found 0 vulnerabilities`**.

The final in-repo `npm audit` after the upgrade is a **required hard verification gate** (task 4.1) — the scratch install proves the combination, the in-repo run proves the actual tree.

### 3. ESM migration of the three release configs (forced by conventional-changelog-conventionalcommits 10)

**Verified evidence:** `conventional-changelog-conventionalcommits@10`'s `exports` map exposes **only the `import` condition** — `require()` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. All three current configs (`.releaserc.cjs` at root, `apps/web/`, `apps/api/`) use `require('...').default`, so they break under v10.

**Decision:** delete the three `.cjs` files and create `.releaserc.mjs` in each location with `import preset from 'conventional-changelog-conventionalcommits'` and `export default { ... }`.

**Verified:** `semantic-release` 25.0.9 loads `.releaserc.mjs` perfectly — all plugins initialize, including the custom `writerOpts`/`transform` in the app configs. semantic-release discovers the file via cosmiconfig, so **no CLI flags and no workflow changes** are needed: `release.yml` keeps running bare `npx semantic-release` from each directory (root, `apps/web`, `apps/api`).

Everything except the module system and the releaseRules fix is preserved **verbatim**: `branches: ['main']`, `tagFormat` (`v${version}` / `web-v${version}` / `api-v${version}`), the plugin chain and order, `npmPublish: false`, `parserOpts.noteKeywords`, the `writerOpts` transform and `ALLOWED_SCOPES`, `changelogFile: 'CHANGELOG.md'`, the `@semantic-release/git` assets and release commit messages.

### 4. releaseRules fix — remove the two redundant type rules (user-approved addition)

**The bug (verified):** the current web/api `releaseRules` are five scope exclusions (`{scope:'api'|'tooling'|'docs'|'postman'|'release', release:false}` — web excludes `api`, api excludes `web`) followed by `{breaking:true,release:'major'}`, `{type:'feat',release:'minor'}`, `{type:'fix',release:'patch'}`. The last two are **literal duplicates of the conventionalcommits preset defaults**. `@semantic-release/commit-analyzer` resolves multiple matching rules by **HIGHEST release level** — so for any `feat`/`fix` commit, the type rule (minor/patch) beats the scope exclusion (`release:false`), and the exclusion is shadowed. Empirically verified: this is how `web-v2.4.2` and `api-v2.4.2` got released with empty changelog sections off a single `fix(tooling)` commit. The changelog **notes** filtering (the `writerOpts` transform) works correctly — only release **triggering** is wrong.

**The fix:** remove `{type:'feat',release:'minor'}` and `{type:'fix',release:'patch'}` from **all three** configs, keeping `{breaking:true,release:'major'}`. The preset defaults still apply for non-excluded commits — nothing is lost, the shadowing is.

**Verified outcomes with the exact analyzer and the new rules:**

| Commit | root stream | web stream | api stream |
|---|---|---|---|
| `fix(tooling): ...` | patch (root has no exclusions, by design) | **no release** | **no release** |
| `fix(api): ...` | patch | **no release** | patch |
| `fix(web): ...` | patch | patch | **no release** |
| `feat(web): ...` | minor | minor | **no release** |
| `fix` / `feat` with unlisted or no scope | preset defaults (patch/minor) | preset defaults | preset defaults |
| any commit with `BREAKING CHANGE` | **major** | **major** | **major** (deliberate — breaking changes affect everything) |

**Root config behavior is unchanged:** it has no scope exclusions, and the removed rules were no-op duplicates there (the preset defaults produce the same levels).

The `.mjs` migration and this fix land in the **same file change** — same files, same change.

### 5. Remove `semantic-release-monorepo` (user-approved addition)

**Verified evidence:** it is a shareable config activated **only** via `extends` in a release config or the `--extends` CLI flag. No config in this repo has `extends`; `release.yml` runs bare `npx semantic-release`. The only references are: root `package.json`, the lockfile, the NX project-graph cache (a mirror of the lockfile, refreshed on the next NX run), and archived 2026-05 openspec changes (historical — **kept**, per the repo rule against rewriting history).

**Decision:** delete the entry from root devDependencies and regenerate the lockfile. No replacement — nothing ever consumed it.

### 6. Compatibility matrix — everything satisfied, no other changes needed

| Requirement | Status |
|---|---|
| `@semantic-release/changelog@7` / `@semantic-release/git@11` engine `node >=24.15` (strictest) | ✅ Node 24.21.0 local; `.nvmrc` `24` (floating); CI `setup-node` `24`; Docker `node:24-alpine` |
| `semantic-release` 25 engine `node >=24.10` | ✅ same |
| `lint-staged` 17 requires git `>=2.32` | ✅ git 2.55.0 |
| commitlint 21 breaking change (output format only) | ✅ no-op — verified v21 works with the existing `commitlint.config.js`, exit codes 1/0 correct |
| lint-staged 17 yaml support now optional | ✅ no-op — our config is JSON embedded in `package.json` |
| concurrently 10 ESM-only CLI + auto prefix colors default | ✅ no-op — `dev:local` passes explicit `--prefix-colors "cyan,yellow"` |
| semantic-release 25 ships `@semantic-release/npm` v11 (bundled npm 11) | ✅ no-op — all three configs set `npmPublish: false` |

**Zero runtime impact:** these are root devDependencies. The Cloud Run Docker runtime installs only the api's prod dependencies in the pruned dist — the release toolchain never ships. The image rebuild triggered by lockfile changes is expected and harmless.

### 7. Where these tools run (blast radius)

- **semantic-release** — `.github/workflows/release.yml` only (push to `main`; three runs: root, `apps/web`, `apps/api`; `HUSKY=0`; Node 24; `npm ci`). The workflow file itself needs **NO changes**.
- **commitlint + lint-staged** — husky hooks only (`.husky/commit-msg`, `.husky/pre-commit`) — local, not in CI. Hooks need **NO changes**.
- **concurrently** — `npm run dev:local` only.
- **`commitlint.config.js`** — needs **NO changes** (verified v21 works with it).
- **`README.md`** — needs **NO changes** (it does not list these tools with versions).
- **`ROADMAP.md`** — **MUST be updated** (see tasks 3.x).

## Target config shapes (exact)

### Root `.releaserc.mjs`

```js
import preset from 'conventional-changelog-conventionalcommits';

const writerOpts = preset().writer;

export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [{ breaking: true, release: 'major' }],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        writerOpts,
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): v${nextRelease.version} [skip ci]',
      },
    ],
  ],
};
```

### `apps/web/.releaserc.mjs`

```js
import preset from 'conventional-changelog-conventionalcommits';

const { transform: defaultTransform, ...restWriterOpts } = preset().writer;

const ALLOWED_SCOPES = ['web', 'shared'];

export default {
  branches: ['main'],
  tagFormat: 'web-v${version}',
  plugins: [
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { scope: 'api', release: false },
          { scope: 'tooling', release: false },
          { scope: 'docs', release: false },
          { scope: 'postman', release: false },
          { scope: 'release', release: false },
          { breaking: true, release: 'major' },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        writerOpts: {
          ...restWriterOpts,
          transform: (commit, context) => {
            // Include commits without a scope (affects everything) or
            // commits scoped to web or shared
            if (commit.scope && !ALLOWED_SCOPES.includes(commit.scope)) {
              return null;
            }
            return defaultTransform(commit, context);
          },
        },
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): web-v${nextRelease.version} [skip ci]',
      },
    ],
  ],
};
```

### `apps/api/.releaserc.mjs`

Identical to the web config except:

- `const ALLOWED_SCOPES = ['api', 'shared'];`
- The first exclusion is `{ scope: 'web', release: false }` (instead of `'api'`)
- `tagFormat: 'api-v${version}'`
- Release commit message: `'chore(release): api-v${nextRelease.version} [skip ci]'`
- The transform comment reads "commits scoped to api or shared"

### Deltas vs the current `.cjs` files (all three)

1. `const preset = require('conventional-changelog-conventionalcommits').default;` → `import preset from 'conventional-changelog-conventionalcommits';`
2. `module.exports = { ... };` → `export default { ... };`
3. `releaseRules`: `{ type: 'feat', release: 'minor' }` and `{ type: 'fix', release: 'patch' }` removed; `{ breaking: true, release: 'major' }` kept (last entry in the app configs, only entry in the root config).
4. Nothing else changes — plugin chain, options, tag formats, and release commit messages are preserved verbatim.

## Risks / Trade-offs

- **[Deliberate behavior change] App streams stop releasing on excluded-scope commits.** This is the fix, not a regression. The next push to `main` after this change merges will be analyzed under the new rules — e.g. a `fix(release)` commit bumps only the root stream, not web/api. Expected and verified.
- **[Risk] ESM-only configs** — any future tooling that reads the release configs must use `import()`, not `require()`. Only semantic-release reads these files today; verified working.
- **[Risk] Hidden peer conflicts at install time** — mitigated by `.npmrc` `legacy-peer-deps=true` and empirically disproved by the scratch install (0 vulnerabilities, clean install). The in-repo `npm install` + full gate suite is the safety net.
- **[Risk] Docker/Cloud Run rebuild churn from the lockfile change** — expected, harmless (runtime image contains only api prod deps).

## Migration Plan

1. Bump the 8 pins and remove `semantic-release-monorepo` in root `package.json` → `npm install` → lockfile regenerated.
2. Migrate the three configs (delete `.cjs`, create `.mjs` with the releaseRules fix).
3. Run the full verification suite (audit, ESM load checks, dry-run, analyzer spot-check, standard gates, hooks, lockfile consistency).
4. Update `ROADMAP.md` (D1/I01 removal + renumbering + status row + date).

**Rollback:** `git revert` of the change's commits — restores the pins, the `.cjs` configs, and the lockfile; `npm install` to resync. No data or history migration is involved (existing `CHANGELOG.md` content and git tags are never touched).

## Open Questions

*(none — every decision above is backed by empirical verification recorded in this document)*
