# Tasks: Upgrade Release Tooling

> All version changes use **exact pins** (no `^` / `~`). Do not commit anything without explicit user authorization — the commit suggestions at the end list the intended atomic commits only.
>
> This is a tooling-only change with no user-facing behavior, but the AGENTS.md pre-PR checklist (lint / build / test / e2e) is blanket — E2E is included in verification.

---

## Task Group 0 — Baseline and branch

### [x] 0.1 Create the working branch

- Branch `feature/upgrade-release-tooling` off `develop`.

**Verification:** `git branch --show-current` prints `feature/upgrade-release-tooling`.

### [x] 0.2 Capture the audit baseline

- Run `npm audit --json` and record the counts: expected **19 total (0 critical, 15 high, 3 moderate, 1 low)**, all inside the `semantic-release` → `@semantic-release/npm` → bundled `npm@10.9.9` chain.

**Verification:** Counts match the ROADMAP I01 figures (19 / 0 / 15 / 3 / 1). If they differ, stop and report — the audit landscape changed since 16 Sep 2026 and the spec's expectations must be re-checked before proceeding.

---

## Task Group 1 — Dependency upgrades and removal (implementation)

### [x] 1.1 Update the eight pins in root `package.json` devDependencies

Set exactly (no `^`/`~`):

| Package | From | To |
|---|---|---|
| `semantic-release` | 24.2.9 | 25.0.9 |
| `@commitlint/cli` | 20.5.3 | 21.2.3 |
| `@commitlint/config-conventional` | 20.5.3 | 21.2.3 |
| `lint-staged` | 16.4.0 | 17.5.1 |
| `concurrently` | 9.2.4 | 10.0.5 |
| `@semantic-release/changelog` | 6.0.3 | 7.0.0 |
| `@semantic-release/git` | 10.0.1 | 11.0.1 |
| `conventional-changelog-conventionalcommits` | 9.3.1 | 10.4.0 |

Do NOT touch: `@semantic-release/commit-analyzer` (stays 13.0.1), `@semantic-release/release-notes-generator` (stays 14.1.1), `husky` (stays 9.1.7) — already latest. Do NOT touch the `overrides` section, scripts, or the `lint-staged` config block.

**Verification:** `grep -E '"(semantic-release|@commitlint/cli|@commitlint/config-conventional|lint-staged|concurrently|@semantic-release/changelog|@semantic-release/git|conventional-changelog-conventionalcommits)"' package.json` shows the eight exact target pins with no `^`/`~`; the three unchanged packages still show 13.0.1 / 14.1.1 / 9.1.7.

### [x] 1.2 Remove `semantic-release-monorepo`

- Delete the `"semantic-release-monorepo": "8.0.2"` entry from root devDependencies.

**Verification:** `grep -r "semantic-release-monorepo" package.json apps/web/.releaserc.mjs apps/api/.releaserc.mjs .releaserc.mjs .github/workflows/release.yml` returns nothing (archived openspec changes under `openspec/changes/archive/` keep their mentions — do not rewrite history).

### [x] 1.3 Regenerate the lockfile

- Run `npm install` (the repo `.npmrc` with `legacy-peer-deps=true` applies) so `package-lock.json` is regenerated with the new tree (bundled npm 11.20.0 under `@semantic-release/npm`, no `semantic-release-monorepo`).

**Verification:** `npm ls semantic-release @commitlint/cli @commitlint/config-conventional lint-staged concurrently @semantic-release/changelog @semantic-release/git conventional-changelog-conventionalcommits` resolves each to the exact target; a second `npm install` changes nothing (idempotent).

---

## Task Group 2 — Release config migration to ESM + releaseRules fix (implementation)

### [x] 2.1 Create root `.releaserc.mjs` and delete root `.releaserc.cjs`

- Create the file with the exact content from design.md ("Target config shapes — Root"): `import preset from 'conventional-changelog-conventionalcommits';`, `const writerOpts = preset().writer;`, `export default { branches: ['main'], tagFormat: 'v${version}', plugins: [...] }`.
- **releaseRules fix:** the commit-analyzer `releaseRules` SHALL be exactly `[{ breaking: true, release: 'major' }]` — the `{ type: 'feat', release: 'minor' }` and `{ type: 'fix', release: 'patch' }` entries are removed (they were no-op duplicates of the preset defaults in the root config).
- Everything else preserved verbatim: plugin chain and order, `npmPublish: false`, `parserOpts.noteKeywords`, `writerOpts`, `changelogFile: 'CHANGELOG.md'`, git assets `['CHANGELOG.md', 'package.json']`, message `chore(release): v${nextRelease.version} [skip ci]`.
- Delete `.releaserc.cjs`.

**Verification:** `node --input-type=module -e "const c = await import('./.releaserc.mjs'); console.log(c.default.plugins.length, c.default.tagFormat)"` prints `5 v${version}`; `.releaserc.cjs` no longer exists.

### [x] 2.2 Create `apps/web/.releaserc.mjs` and delete `apps/web/.releaserc.cjs`

- Create the file with the exact content from design.md ("Target config shapes — apps/web"): same ESM import, `const { transform: defaultTransform, ...restWriterOpts } = preset().writer;`, `const ALLOWED_SCOPES = ['web', 'shared'];`, `tagFormat: 'web-v${version}'`, the unchanged `writerOpts` transform (excludes commits scoped outside `ALLOWED_SCOPES`), and message `chore(release): web-v${nextRelease.version} [skip ci]`.
- **releaseRules fix:** exactly the five exclusions `{ scope: 'api' }`, `{ scope: 'tooling' }`, `{ scope: 'docs' }`, `{ scope: 'postman' }`, `{ scope: 'release' }` (all `release: false`) plus `{ breaking: true, release: 'major' }` — the two type rules removed.
- Delete `apps/web/.releaserc.cjs`.

**Verification:** `node --input-type=module -e "const c = await import('./apps/web/.releaserc.mjs'); console.log(c.default.plugins.length, c.default.tagFormat, c.default.plugins[1][1].releaseRules.length)"` prints `5 web-v${version} 6`; the releaseRules array contains no `type` entries; the `.cjs` file is gone.

### [x] 2.3 Create `apps/api/.releaserc.mjs` and delete `apps/api/.releaserc.cjs`

- Identical to 2.2 except: `ALLOWED_SCOPES = ['api', 'shared']`, first exclusion `{ scope: 'web', release: false }`, `tagFormat: 'api-v${version}'`, message `chore(release): api-v${nextRelease.version} [skip ci]`, transform comment referencing api/shared.
- Delete `apps/api/.releaserc.cjs`.

**Verification:** Same import check as 2.2 run against `apps/api/.releaserc.mjs` — prints `5 api-v${version} 6`; first exclusion scope is `web`; the `.cjs` file is gone.

### [x] 2.4 Confirm no stale CommonJS references remain

- Search the repo (excluding `node_modules/` and `openspec/changes/archive/`) for `.releaserc.cjs` and `require('conventional-changelog-conventionalcommits')`.

**Verification:** Both searches return zero hits.

---

## Task Group 3 — Documentation (ROADMAP.md only)

> README.md and AGENTS.md need **no changes**: README does not list these tools with versions, and AGENTS.md does not pin release-tooling versions. Do not edit them.

### [x] 3.1 Remove D1 and renumber D2 → D1

- Delete the completed block `### D1: Tooling de release — majors de bajo riesgo` (including its paragraph and the `**Dificultad:** 3/10 · **Estado:** Pendiente` line).
- Rename `### D2: Evaluación de TypeScript 7 (tsc nativo en Go)` → `### D1: ...` (body unchanged).
- Update the "Plan de Acción Sugerido" reference: `D2 (TypeScript 7) queda como seguimiento pasivo` → `D1 (TypeScript 7) queda como seguimiento pasivo`.

**Verification:** `grep -n "D2" ROADMAP.md` returns nothing; the Mantenimiento section has exactly one D-item (D1, TypeScript 7).

### [x] 3.2 Remove I01 and renumber I02–I16 → I01–I15, updating EVERY cross-reference

- Delete the I01 block (`npm audit` reporta 19 vulnerabilidades...) and its now-empty parent heading `### 🔴 Seguridad` (I01 is its only item).
- Renumber every subsequent I-item down by one: I02→I01, I03→I02, I04→I03, I05→I04, I06→I05, I07→I06, I08→I07, I09→I08, I10→I09, I11→I10, I12→I11, I13→I12, I14→I13, I15→I14, I16→I15.
- Update every cross-reference in the document (verified locations):
  - Status table "CD / Deploy" row: `sigue en I02` → `sigue en I01`
  - Estrategia section: `ver I14` (OWID attribution) → `ver I13`
  - P1.0: `ver I14` → `ver I13`; `I06 sigue en backlog` → `I05 sigue en backlog`
  - P1.1: `resuelve I09` → `resuelve I08`; `ver I15` (charts) → `ver I14`; `ver I13` (attribution) → `ver I12`
  - P1 Requisitos: `I03 (CORS multi-origen)` → `I02 (CORS multi-origen)`
  - P2 "Fuera de P2 → backlog": `OpenTelemetry (I10)` → `(I09)`; `Axiom (I11)` → `(I10)`
  - I13 block (now I12): `Alimentado por el DataSourceAttribution de I14` → `de I13`
  - Recordatorios: `I10. OpenTelemetry` → `I09.`; `I11. Axiom` → `I10.`
- Historical archives under `openspec/changes/archive/` keep their old IDs intentionally — do not touch them.

**Verification:** `grep -oE 'I[0-9]+' ROADMAP.md | sort -u` yields exactly I01–I15 with no gaps and no I16; every cross-reference points at the intended (renumbered) block — spot-check the Estrategia, P1, P2, and Recordatorios references listed above.

### [x] 3.3 Update the status table and dates

- "Dependencias" row: change 🟡 → ✅ and update its note to reflect the new state — `npm audit` clean (0 vulnerabilities) after the release-tooling upgrade (D1 done, I01 resolved). Match the document's existing language and table style.
- Update the `## Estado del Proyecto (16 Sep 2026)` heading date and the trailing `**Última actualización:** 16 Sep 2026` to the implementation date.

**Verification:** The Dependencias row shows ✅ with no mention of remaining advisories; both dates show the implementation date.

---

## Task Group 4 — Verification (tester phase)

### [x] 4.1 `npm audit` → 0 vulnerabilities (hard gate)

- Run `npm audit` at the repo root.

**Verification:** Prints `found 0 vulnerabilities`. Any non-zero count is a failure — investigate before proceeding (the scratch install proved 0 is achievable with these exact pins).

### [x] 4.2 All three `.releaserc.mjs` configs load as ESM modules with plugins initialized

- For each config (root, `apps/web`, `apps/api`) run a Node ESM import check (e.g. `node --input-type=module -e "const c = await import('<path>'); console.log(c.default.plugins.map(p => Array.isArray(p) ? p[0] : p)"`) from the repo root.
- Confirm the app configs' `writerOpts.transform` is present and the releaseRules arrays match the spec (root: 1 rule; web/api: 6 rules, no `type` entries).

**Verification:** Each import resolves without `ERR_PACKAGE_PATH_NOT_EXPORTED`; each prints the five plugin names in order; releaseRules shapes match.

### [x] 4.3 `semantic-release --dry-run` against a detached worktree of `origin/main` (read-only)

- `git fetch origin` → `git worktree add --detach /tmp/opencode/sr-dryrun origin/main`.
- Into that worktree, copy the migrated root `.releaserc.mjs`, the updated root `package.json`, and `package-lock.json`; run `npm ci` there (HUSKY=0).
- Run `npx semantic-release --dry-run --no-ci` from the worktree root.
- **Read-only: NO commits, NO pushes, no writes to the real working repo.** Clean up with `git worktree remove --force /tmp/opencode/sr-dryrun` afterwards.

**Verification:** The run completes the analysis stage with all plugins initializing under the migrated root config. It may report `no new commits to release` — that is **success** for config validation, not a failure. Any config-load error (e.g. `ERR_PACKAGE_PATH_NOT_EXPORTED`) is a failure.

### [x] 4.4 Analyzer behavior spot-check with the exact new releaseRules

- Build a throwaway ESM harness in `/tmp/opencode` (not committed) that runs `@semantic-release/commit-analyzer` 13.0.1 with the exact `releaseRules` + `parserOpts` from the three migrated configs against synthetic parsed commits.
- Cases and expected results (all previously verified empirically):
  - `fix(tooling): ...` with web rules → **no release**; with api rules → **no release**; with root rules → **patch**
  - `fix(api): ...` with web rules → **no release**; with api rules → **patch**
  - `fix(web): ...` with web rules → **patch**; with api rules → **no release**
  - `feat(web): ...` with web rules → **minor**
  - `fix: ...` (no scope) with web rules → **patch**
  - any commit with a `BREAKING CHANGE` footer → **major** with all three rule sets

**Verification:** Every case matches the expected result. Any deviation is a failure — the releaseRules migration is wrong.

### [x] 4.5 Standard gates (pre-PR checklist, blanket per AGENTS.md)

- `npm run lint` — zero errors, zero warnings.
- `npm run build` — all three projects.
- `npm run test` — all unit tests pass, zero errors, zero warnings.
- `npm run e2e` — full Playwright suite green.

**Verification:** All four commands exit 0. No snapshot changes are expected (no app code touched) — if snapshots diff, investigate before proceeding.

### [x] 4.6 Husky hooks still function under the new majors

- commitlint 21: `printf 'invalid message' > /tmp/opencode/msg-bad && npx --no -- commitlint --edit /tmp/opencode/msg-bad` → exit 1; `printf 'fix(api): correct health check response' > /tmp/opencode/msg-ok && npx --no -- commitlint --edit /tmp/opencode/msg-ok` → exit 0.
- lint-staged 17: create a scratch file in the repo with fixable formatting issues (e.g. double quotes instead of single), `git add` it, run `npx lint-staged`, confirm it is auto-formatted and re-staged, then `git restore --staged` the file and delete it (leave the repo clean).

**Verification:** Invalid message exits 1, valid exits 0; lint-staged rewrites and re-stages the scratch file; `git status` is clean afterwards.

### [x] 4.7 `package-lock.json` regenerated and consistent

- Confirm the lockfile reflects the eight new pins, the bundled npm 11.x under `@semantic-release/npm`, and the absence of `semantic-release-monorepo`.
- Confirm `npm ci` succeeds from the lockfile (the dry-run worktree install in 4.3 doubles as the clean-install proof).

**Verification:** `grep -c "semantic-release-monorepo" package-lock.json` returns 0; `npm install` is idempotent (no lockfile churn on a second run); the 4.3 `npm ci` succeeded.

---

## Task Group 5 — Commits (requires explicit user authorization)

No commits until the user explicitly approves at the final checkpoint. Suggested atomic split (Commitizen format):

1. `chore(deps): upgrade release tooling majors and drop semantic-release-monorepo` — `package.json`, `package-lock.json`
2. `fix(release): migrate release configs to ESM and fix scope-filtered triggering` — 3× `.releaserc.mjs` added, 3× `.releaserc.cjs` deleted
3. `docs: update roadmap after release tooling upgrade` — `ROADMAP.md`

Note: commit 2's `fix(release)` scope intentionally triggers only a root patch release under the new rules (the `release` scope is excluded from both app streams) — correct behavior, not an accident.

**Verification:** `git log --oneline` shows the approved atomic commits; each commit's file set matches its message; all gates pass on the final state.

---

## Definition of Done

- [x] Eight toolchain pins at the exact target versions; `@semantic-release/commit-analyzer` 13.0.1, `@semantic-release/release-notes-generator` 14.1.1, `husky` 9.1.7 untouched; `overrides` untouched
- [x] `semantic-release-monorepo` removed from `package.json` and lockfile; no config references it
- [x] Three `.releaserc.mjs` configs created (ESM import, plugins initialize, custom `writerOpts` transform intact); zero `.releaserc.cjs` remain
- [x] releaseRules fixed: root `[{breaking:true,release:'major'}]`; web/api five exclusions + breaking rule; no `type` rules
- [x] `npm audit` → **0 vulnerabilities** (hard gate)
- [x] Dry-run against `origin/main` worktree completes analysis; analyzer spot-check matches the expected matrix
- [x] `npm run lint`, `npm run build`, `npm run test`, `npm run e2e` — all green, zero warnings
- [x] Husky hooks verified (commitlint 1/0 exit codes; lint-staged formats staged files)
- [x] `ROADMAP.md` updated: D1 deleted (D2→D1), I01 deleted (I02–I16→I01–I15, every cross-reference updated), Dependencias row ✅, dates updated
- [x] No changes to `apps/**/src/`, `packages/shared/**`, `.github/workflows/*`, `.husky/*`, `commitlint.config.js`, `README.md`, `AGENTS.md`, `CHANGELOG.md` files, `.npmrc`, `nx.json`
- [x] Commits created only after explicit user authorization
