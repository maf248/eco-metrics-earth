# Tasks: Upgrade NX 22 → 23

> All version changes use **exact pins** (no `^` / `~`). Do not commit anything without explicit user authorization — the commit tasks at the end list the intended atomic commits only.

---

## Task Group 0 — Baseline and branch

### [x] 0.1 Create the working branch

- Branch `feature/upgrade-nx-23` off `develop`.

**Verification:** `git branch --show-current` prints `feature/upgrade-nx-23`.

### [x] 0.2 Capture the audit baseline

- Run `npm audit --json` and record the exact counts in `openspec/changes/upgrade-nx-23/` notes (or the PR description): expected **76 total (5 critical, 56 high, 13 moderate, 2 low)**.
- Also record the list of vulnerable packages whose fix path routes through `nx` / `@nx/*` / `@module-federation/*` (the block this change must eliminate).

**Verification:** Baseline numbers match the ROADMAP I01 figures (76 / 5 / 56 / 13 / 2). If they differ, stop and report — the audit landscape changed since 10 Sep 2026 and the spec's expectations must be re-checked before proceeding.

---

## Task Group 1 — Run the migration

### [x] 1.1 Generate the migration

- Run `npx nx migrate nx@23.2.1` (pinned exact target — do **not** use `latest`).
- Confirm it updated the 10 NX-family pins in root `package.json` (`nx`, `@nx/devkit`, `@nx/jest`, `@nx/js`, `@nx/nest`, `@nx/next`, `@nx/node`, `@nx/playwright`, `@nx/react`, `@nx/webpack`) and created `migrations.json` at the repo root.

**Verification:** `grep '"@nx/' package.json` shows all ten at `"23.2.1"` with no `^`/`~`; `migrations.json` exists.

### [x] 1.2 Review and prune `migrations.json` (mandatory — do not skip)

- Read every entry in `migrations.json`.
- **Remove** any migration that bumps or configures: TypeScript (must stay `5.9.3`), Next.js (must stay `16.3.4`), React (must stay `19.3.0`), or any other optional update that changes app runtime behavior beyond NX's own requirements.
- Keep all migrations that update NX's own configs (`nx.json`, plugin options, generator defaults, lockfile-related updates).
- Note any `prompt`-carrying entries — they will be skipped non-interactively and listed after the run; only the TS typecheck prompt is expected and it is a no-op here.

**Verification:** Every remaining entry can be justified as "required for NX 23 itself". The pruned list is recorded for the PR description.

### [x] 1.3 Run the migrations

- Run `npx nx migrate --run-migrations` (it installs packages first, then executes).
- If the automatic install fails on peer conflicts: `npx nx migrate --run-migrations --skip-install` followed by manual `npm install`.
- Read the completion output — note the list of skipped prompt-based migrations (expected: the TS typecheck prompt only).

**Verification:** Command exits 0; `node_modules/nx/package.json` reports version `23.2.1`; the skipped-migrations list contains nothing that requires action for this change.

### [x] 1.4 Verify installed versions and lockfile

- All ten NX-family packages resolve to exactly `23.2.1`: `npm ls nx @nx/devkit @nx/jest @nx/js @nx/nest @nx/next @nx/node @nx/playwright @nx/react @nx/webpack` (single hoisted version each, no nested 22.x copies).
- `package-lock.json` is updated and in sync (`npm ci`-clean).

**Verification:** `npm ls` shows `23.2.1` for all ten; `git diff --stat` shows `package.json` + `package-lock.json` + `nx.json` (+ any migration-touched files) as the only tooling changes so far.

### [x] 1.5 Post-migration sanity check

- Run `npx nx repair` — should report nothing to fix.
- Run `npx nx reset` to clear stale daemon/cache state.
- Delete `migrations.json` (all migrations have run; it must not be committed).

**Verification:** `npx nx repair` exits clean; `migrations.json` no longer exists.

---

## Task Group 2 — Resolve breaking changes

### [x] 2.1 Migrate `apps/web/next.config.ts` off deprecated helpers

- Remove the `composePlugins, withNx` import from `@nx/next` and the `WithNxOptions` type import from `@nx/next/plugins/with-nx`.
- Replace `export default composePlugins(withBundleAnalyzer, withNx)(baseConfig)` with a direct export of the config, still wrapped by `withBundleAnalyzer` (from `@next/bundle-analyzer` — unchanged).
- **Add `transpilePackages: ['@eco-metrics/shared']`** to the base config (previously injected automatically by `withNx`; required for Turbopack to compile the shared package's TypeScript source — see the existing comment in the file).
- Keep everything else byte-identical: `trailingSlash: true`, the `headers()` security-header/CSP block, the dev/prod `script-src` logic, the `nx: {}` key (drop it only if the new config type rejects it).
- Update the file's explanatory comment to reflect the new structure (no more `withNx`).

**Verification:** `npx nx build web` succeeds and its log contains **no** deprecation warning about `withNx`/`composePlugins`. `npx nx dev web` starts and editing `packages/shared/src/` triggers HMR (proves `transpilePackages` works).

### [x] 2.2 Confirm zero deprecation warnings across the toolchain

- Inspect build/test/lint output for any NX 23 deprecation warnings (e.g. `dependsOn` magic strings, deprecated executors, deep imports).
- Expected: none — the workspace already uses inference plugins, `NxAppWebpackPlugin`, caret-form `dependsOn`, and public `@nx` entry points everywhere else.

**Verification:** Full run of Group 3/4 gates produces zero warnings. If a warning appears, fix its root cause per the NX 23 deprecation guidance (do not silence it); if the fix would expand scope (e.g. converting `@nx/js:prune-lockfile`), stop and report for a scope decision.

---

## Task Group 3 — Per-project validation

### [x] 3.1 `packages/shared`

- `npx nx build shared` — tsc build succeeds.
- `npx nx test shared` — 8 tests pass, zero warnings, coverage thresholds met.

**Verification:** Both commands exit 0.

### [x] 3.2 `apps/api`

- `npx nx build api` — webpack build via `NxAppWebpackPlugin` succeeds (proves `@nx/webpack/app-plugin` entry point intact).
- `npx nx test api` — 50 tests pass, zero warnings, coverage thresholds met (branch coverage intentionally omitted for api).

**Verification:** Both commands exit 0.

### [x] 3.3 `apps/web`

- `npx nx build web` — Next build succeeds without deprecation warnings.
- `npx nx test web` — 221 tests pass, zero warnings, coverage thresholds met (branches ≥ 75%).
- `npx nx run web:typecheck` — `tsc --noEmit` passes on TS 5.9.3.

**Verification:** All three commands exit 0. No snapshot changes (if snapshots diff, investigate — this change must not alter rendered output).

---

## Task Group 4 — Full validation suite

### [x] 4.1 Repo-wide gates

- `npm run lint` — zero errors, zero warnings.
- `npm run build` — all three projects.
- `npm run test` — 279 unit tests total, zero errors/warnings.
- `npm run typecheck` — passes.

**Verification:** All exit 0. These are the pre-PR checklist commands from AGENTS.md.

### [x] 4.2 E2E suite

- `npx playwright install --with-deps` (browsers already installed in CI; local may need it).
- `npm run e2e` — all 49 Playwright specs across 5 browsers pass (proves `nxE2EPreset` from `@nx/playwright/preset` and the Next server pipeline work under NX 23).

**Verification:** Exit 0, 49/49 specs green.

### [x] 4.3 Dev servers and analyzer

- `npm run dev` — web on :3000 and api on :3001 boot in parallel; verify a page loads and shared-package HMR works.
- `npx nx run web:analyze` — bundle analyzer path works. If the `-- --webpack` passthrough no longer resolves under NX 23's Next plugin, document the failure and propose the fix separately (do not expand scope silently).

**Verification:** Both apps serve; analyzer command exits 0 (or its failure is documented with a follow-up proposal).

---

## Task Group 5 — Security verification

### [x] 5.1 Post-migration audit

- Run `npm audit --json` and record final counts by severity.
- Verify: **no advisory remains whose fix path routes through `nx`, any `@nx/*` package, or `@module-federation/*`** — the entire NX-subtree block from task 0.2 is gone.
- Expected remaining families (out of scope, documented with owners): `@nestjs/platform-express`→`multer` (D2), `@nestjs/swagger`→`js-yaml` (D2), `semantic-release` subtree incl. `tar`/`sigstore`/npm internals (D4), `concurrently`→`shell-quote` (D4), `postcss` direct (open question).

**Verification:** Final counts recorded. If any NX-subtree advisory persists (e.g. a vulnerable `smol-toml` pin), pin the fixed version via the root `package.json` `overrides` block (precedent: `chokidar`, `readdirp`), re-run `npm install`, and re-validate Group 3. If anything outside the documented families remains, investigate and report before proceeding.

---

## Task Group 6 — Documentation updates

### [x] 6.1 `README.md`

- Tech stack table: NX version cell `22.7.2` → `23.2.1`.

**Verification:** `grep -n "23.2.1" README.md` shows the table row; no other version cells changed.

### [x] 6.2 `AGENTS.md`

- Update NX version mentions: "NX v22" → "NX v23" in the overview (and the monorepo tool line, if it names a version).

**Verification:** `grep -n "NX v2" AGENTS.md` returns only v23 references.

### [x] 6.3 `ROADMAP.md` — completed by orchestrator

- Completed by the orchestrator: removed the completed NX item, renumbered the D-series, updated I01, and added the pre-existing E2E flake as I17.

---

## Task Group 7 — Commits (requires explicit user authorization) — completed

- The user reviewed the implementation and explicitly authorized three atomic commits plus the push to `develop`.

Three atomic Commitizen commits, in order:

1. `chore(deps): migrate nx toolchain to 23.2.1` — dependency manifests/lockfile, migration-touched tooling config, and the explicit API Express type dependency.
2. `chore(web): replace deprecated withNx helper with explicit transpilePackages` — `apps/web/next.config.ts`.
3. `docs: update tech stack versions and archive nx 23 spec` — `README.md`, `AGENTS.md`, `ROADMAP.md`, synced capability spec, and archived change artifacts.

**Verification:** `git log --oneline` shows exactly three atomic commits on `develop`; each commit's file set matches its message; the full lint/build/test/typecheck/format gates pass on the final state.

---

## Definition of Done

- [x] All ten NX-family packages pinned at exactly `23.2.1`; no `^`/`~`; lockfile in sync (`npm ci`-clean)
- [x] `migrations.json` reviewed, pruned of non-goal bumps, executed, and deleted
- [x] `apps/web/next.config.ts` free of `withNx`/`composePlugins`; `transpilePackages: ['@eco-metrics/shared']` present; HMR verified
- [x] `npm run lint`, `npm run build`, `npm run test`, `npm run typecheck` — all green; no NX deprecation warnings (pre-existing WaterFootprintService test WARN tracked separately)
- [x] `npm run e2e` — 219/219 clean run; pre-existing local readiness flake tracked as ROADMAP I17
- [x] `npm run dev` — both apps serve; `web:analyze` works or has a documented follow-up
- [x] `npm audit` — zero advisories with an NX-family fix path; before/after counts recorded
- [x] `README.md`, `AGENTS.md`, `ROADMAP.md` updated
- [x] Three atomic commits created (only after explicit user authorization)
- [x] No application source files (`src/**`) modified

---

## Implementation outcome (10 Sep 2026)

- All gates green: lint / build (3 projects) / test (279) / typecheck / dev-boot / analyze.
- **`webpack-dev-server` removed after empirical verification** — it was added during implementation as an `@nx/webpack@23` peer, but `nx serve api` serves normally without it (health OK in ~7s). Removing it eliminated its 3 moderate advisories (`sockjs`, `uuid`). `webpack@5.110.3` remains (required by `NxAppWebpackPlugin` builds).
- **`@types/express@5.0.6` added explicitly to `apps/api`** — removing `webpack-dev-server` exposed that API typechecking had relied on its transitive Express declarations. The direct workspace-scoped devDependency removes that hidden dependency; forced and normal `api:typecheck` both pass.
- Final `npm audit`: **32 (4 critical, 21 high, 5 moderate, 2 low)** — down from 76 (5/56/13/2). Zero advisories with a fix path through the NX family. Audit JSON recordings kept alongside these artifacts.
- **E2E flakiness classified as pre-existing**: fresh local runs fail intermittently (7-50 tests per run, `ECONNREFUSED :3001` readiness races + dev-server 404 flakes). A clean `develop` (NX 22.7.2) worktree baseline also fails fresh (7 failed / 212 passed) with the same pattern, and NX flags `web:e2e` as a flaky task. Not a regression of this change — tracked as a separate ROADMAP backlog item (E2E stabilization).
- Task 6.3 (ROADMAP.md) and Task Group 7 (commits) were completed by the orchestrator after explicit user review and authorization; the three atomic commits land directly on `develop`.
