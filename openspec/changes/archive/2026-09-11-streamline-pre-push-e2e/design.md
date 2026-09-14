# Design: Streamline pre-push E2E — slim hook + deterministic E2E readiness

## Overview

Developer-tooling change with three goals: (1) slim `.husky/pre-push` to the fast, deterministic steps (main-branch block + NX-cached affected unit tests), moving the E2E safety net to CI which already provides it unconditionally; (2) fix ROADMAP I17 with a readiness wrapper that makes `npx nx e2e web` deterministic on fresh runs (local and CI) and eliminates the orphaned-process problem; (3) make the SDD flow the explicit validation guarantor — @tester runs unit + E2E, @spec-writer includes E2E tasks discretionally, and AGENTS.md/CLAUDE.md name the gate in one line each. No application source, contracts, or dependencies change.

**State management / data flow:** unchanged — git hook + test-infrastructure script only.

## Empirical evidence (11 Sep 2026)

A single push to `develop` took **4 attempts**. Three chained causes:

1. **The hook runs the full E2E unconditionally.** `.husky/pre-push` = (a) main-branch block, (b) `npx nx affected --target=test --base=origin/develop` (fast, NX-cached), (c) `npx nx e2e web` — the full Playwright suite (49 specs; `chromium-desktop` runs everything, firefox/webkit/mobile grep `@smoke`), ~10 min fresh, not NX-cached (`@nx/playwright` plugin registers the target with no cache default in `nx.json` `targetDefaults`), silent output. Step (c) runs even for docs-only pushes. History: the E2E line was bolted on in commit `b31401b` (an unrelated E2E fix commit) — never spec'd.
2. **SSH idle timeout.** Git opens the SSH connection before the hook runs; GitHub closed the idle connection during the ~10 min hook → `Connection closed by remote host` after the hook finished. Mitigated with `GIT_SSH_COMMAND="ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=20"`. With a fast hook this window shrinks drastically, but the keep-alive advice stays (cheap insurance).
3. **I17 flake (pre-existing, verified on the NX 22 baseline too).** `webServer` in `apps/web/playwright.config.ts` is `{ command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !CI, cwd: workspaceRoot }` — Playwright waits ONLY for `:3000`; `npm run dev` boots both apps in parallel, so API specs can start before `nx serve api` listens on `:3001` → `ECONNREFUSED :3001`. Empirical workaround that worked: pre-start both servers, poll both to 200, let Playwright reuse them → full suite in ~31 s (219/219 ✓).

## Open questions — resolved by repo research (not assumed)

### Q1: Does CI run E2E on push to develop? — YES, always, full suite

`.github/workflows/ci.yml`: `on: push: branches: ['**']` + `on: pull_request: branches: [main]`. Steps: lint → typecheck → build → test → `npx playwright install --with-deps` → `npm run e2e` (= `nx e2e web`, the FULL suite — not affected-based). So every push to every branch (including `develop`) gets the complete E2E minutes after the push, and every PR to `main` gets it again as a required check. **The safety net the slimmed hook relies on already exists; `ci.yml` needs zero changes.** Note: CI runs E2E against DEV servers (`npm run dev` today, the wrapper after this change) — unchanged by this design.

### Q2: How to validate the hook without a real push? — two ways

- **`sh .husky/pre-push` from the repo root** — faithful. Husky 9's runner (`.husky/_/pre-push` → `h`) simply executes the user hook via `sh` from the repo root; the hook reads no husky-specific env and ignores git's stdin ref list. Direct execution reproduces the exact same logic.
- **`git push --dry-run`** — **empirically verified to RUN pre-push hooks** (tested in a sandbox repo: the hook fired on dry-run). ⚠️ This contradicts the assumption in the task brief that dry-run skips hooks. Consequence: with the CURRENT hook, `git push --dry-run` triggers the ~10 min E2E — do not use it lightly today. With the slimmed hook it becomes a fast secondary validation (it still contacts the remote but sends no updates; `sh .husky/pre-push` is the fully local option).

### Q3: Does the wrapper work with the husky/nx process model and clean up the `next-server` orphan? — YES, with a descendant walk (empirically validated)

Full process model mapped live on 11 Sep 2026 (`ps -eo pid,ppid,pgid,sid`):

- **Web** (`npx nx dev web`): `npm → sh → nx` share the child's process group; **NX then spawns `sh -c "next dev"` in a NEW session AND process group** → `next dev` → `next-server (v16.3.4)` → turbopack workers all live in that separate session. A group-kill of the wrapper's direct child does **not** reach the `next dev` tree — this is exactly why orphans survive.
- **API** (`npx nx serve api`): the entire tree (`npm → sh → nx → run-executor → node-with-require-overrides` holding `:3001`) stays in ONE process group.
- **Playwright 1.63 teardown** (read from `node_modules/playwright/lib/runner/index.js` + public types): the webServer command is spawned `detached` + `shell: true` (it becomes a process-group leader); **default teardown is `process.kill(-pid, 'SIGKILL')` — a group SIGKILL** (documented in the public types: "If unspecified, the process group is forcefully `SIGKILL`ed"). The wrapper receives an uncatchable SIGKILL and the NX-detached `next dev` session is outside the killed group → both the wrapper's cleanup chance AND the `next-server` tree survive-or-die independently → orphans. **This is the root mechanism of the I17 orphan problem.**
- **Fix:** the public `webServer.gracefulShutdown: { signal: 'SIGTERM', timeout }` option changes teardown to a group **SIGTERM** (catchable — the wrapper's handler runs and cleans up) with the SIGKILL fallback only after the timeout.
- **Cleanup technique validated empirically** on live trees: collect all descendants of each spawned child via the parent-pid chain (the `next-server` worker remains a ppid-descendant of `sh -c "next dev"` even though it is in a different session) → SIGTERM every pid → 3 s grace → SIGKILL survivors → **both ports freed, zero orphans, including `next-server`**. In the validation run everything died within the SIGTERM grace window; the SIGKILL escalation stays as a safety net.

### Q4: Does renumbering I18 → I17 break references? — NO (grep-verified)

`I17`/`I18` appear only in: `ROADMAP.md` (the two blocks themselves — edited by this change), `AGENTS.md` (the push playbook — rewritten by this change), and `openspec/changes/archive/**` (historical records of past changes — intentionally left as-is, same policy as every previous renumbering). No code, no active spec, no README references them. Renumbering is safe.

## Meta 1 — decision: remove E2E from the local hook entirely

**Recommendation: total removal.** The hook becomes: main-branch block + `npx nx affected --target=test --base=origin/develop` (+ a comment pointing to CI).

### Why the conservative variant (affected-gated E2E in the hook) is rejected

The variant `npx affected -t e2e` would skip E2E for docs-only pushes but has a **real blind spot**: `web:e2e` belongs to the `web` project, and the project graph has **no dependency between `api` and `web`** (verified: `apps/web/package.json` has no `implicitDependencies`, `nx.json` has no `projects` section) — so an api-only change leaves `web` unaffected → `web:e2e` skipped → the `api-health.spec.ts` specs (which test THE API) never run pre-push. Notably, the archived `e2e-playwright-config` spec codified this exclusion as intended behavior back in May 2026 ("only `apps/api` files change → affected e2e excludes the project") — the blind spot is structural, not accidental.

The only clean mitigation is declaring `implicitDependencies: ["api"]` on web. Assessed and rejected:

- It is a project-graph-level statement ("web depends on api") that is false for build/test purposes — web never imports api code.
- It degrades affected precision for **all** web targets: `web:test` inputs include `^production` and `web:build` inputs include `production, ^production`, so every api change would invalidate web's caches → pointless reruns of 221 web tests + a full web build on every api-only change.
- Even with the blind spot closed, affected-e2e still runs the ~10 min suite for any web-touching change — the hook stays slow exactly in the most common case, and the SSH-idle failure mode remains.

### Rejected alternatives

| Alternative                                          | Rejected because                                                                                                                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep E2E in the hook, gate with `nx affected -t e2e` | Structural api-only blind spot (above); the only clean fix (`implicitDependencies`) pollutes all-target affected semantics; still ~10 min for web-touching changes.                                                              |
| Keep E2E in the hook, run `@smoke` subset only       | Still the slow, silent, server-spawning step in the hook (both servers must come up for the API smoke specs anyway); SSH-idle risk remains; CI already covers it. Reduces but does not remove the failure mode it exists to fix. |
| Keep the hook as-is, fix only I17                    | The 4-attempt push had THREE chained causes; fixing only the flake leaves the ~10 min silent hook + SSH idle timeout intact.                                                                                                     |
| Make CI affected-based to "compensate"               | Out of scope and wrong direction — CI's unconditional full E2E on every push is the safety net that makes the local slim-down safe. Shrinking it would invalidate the whole design.                                              |

### Honest trade-off (documented, not hidden)

The pre-push E2E net is **lost**: a developer can push a commit with a broken E2E and only find out from CI, minutes later, instead of before the push. Compensation: (a) **the SDD flow is the primary guarantor** — every non-trivial change goes through Validate, where @tester runs the unit suites and E2E when the change warrants it (Meta 3); (b) CI runs the full E2E on every push to every branch — the failure surfaces within minutes with the same information; (c) production deploys come from `main` via PR from `develop`, and CI (including E2E) is a required check on those PRs — a broken E2E cannot reach production through a develop push; (d) `npm run e2e` remains available locally and — after Meta 2 — is deterministic, so a developer who wants pre-push E2E confidence can get it in ~30 s (servers pre-started) or a few minutes (fresh). The hook's remaining steps are fast and cacheable, which also eliminates the SSH-idle failure window in practice.

## Meta 2 — decision: readiness wrapper (not production-build E2E)

**Recommendation: alternative (a), the wrapper.** Alternative (b) — E2E against production builds (`nx build web && next start` + built api) — is more deterministic in theory but changes the environment profile the suite tests (dev vs prod behavior, Turbopack vs production bundler), adds a full build to every E2E run (local and CI), and is a substantially larger change. The wrapper fixes the actual root cause (readiness ordering + teardown semantics) with minimal blast radius. Prod-build E2E remains a possible future follow-up; the ROADMAP I17 entry mentioned evaluating it — this change records it as evaluated-and-deferred.

### Why a wrapper is required at all

Playwright's `webServer` supports exactly **one** readiness `url`. Today that is `:3000`, so Playwright starts tests the moment the web dev server answers — regardless of the API state. No configuration of `url` alone can close the gap (pointing it at the API health endpoint just inverts the race). The wrapper restores control: it decides **when the web server is allowed to start**.

### Architecture — two files

```
apps/web/e2e/
├── readiness.ts            # pure: waitForUrl(url, { fetchImpl?, timeoutMs, intervalMs }) — no side effects on import
└── run-dev-servers.ts      # entry: orchestration + main guard (runs only when executed directly)
apps/web/__tests__/e2e/
└── readiness.test.ts       # unit tests for the pure module
```

The split is deliberate: the entry script is never imported by any test, so Jest coverage (which counts files loaded during tests) only sees the fully-tested `readiness.ts` — the web coverage thresholds (80/80/80/75) cannot regress from untested spawn/signal branches, and the contribution is strictly positive.

### Sequencing — the core guarantee

1. **API first:** short pre-check of `http://localhost:3001/api/v1/health` (~1 s, a couple of attempts). If it answers → **adopt** (use it, never kill it). Otherwise spawn `npx nx serve api` and `waitForUrl` to readiness (timeout 120 s).
2. **Then web:** spawn `npx nx dev web` (Playwright's own `url` poll on `:3000` takes over from there).
3. **Stay alive** until signaled (no-op interval) — Playwright expects the command to keep running and kills it at teardown.

Because the web server is spawned strictly after the API is ready, **`:3000` responding ⇒ `:3001` was ready first**. Playwright's single-url readiness becomes sufficient. Sequencing cost is a few seconds (measured: api ready in ~4 s warm; the `webServer.timeout` is raised to 180 s for cold boots — the default is 60 s, verified in the Playwright source).

### Adopt-or-spawn rules

- Never spawn onto an occupied port (pre-check first).
- Never kill a server the wrapper did not spawn (adopted servers are not tracked for cleanup).
- If a spawned child exits before readiness: re-check the port once (the current holder may have been mid-boot at pre-check time — adopt it); otherwise fail with a clear stderr message, clean up remaining spawned trees, exit 1 (Playwright reports the webServer failure).
- Reachability note: when Playwright launches the wrapper, `:3000` is guaranteed down (Playwright's own reuse check ran first — verified in the 1.63 source: if `url` answers and `reuseExistingServer` is false, Playwright throws "already used" without launching the command). The `:3000`-adopt path in the wrapper therefore only guards against a mid-check race; the `:3001`-adopt path is the practically relevant one (orphaned/`manually-started` API + free web port).

### Playwright integration (`playwright.config.ts` `webServer` block)

```ts
webServer: {
  command: 'node apps/web/e2e/run-dev-servers.ts',
  url: 'http://localhost:3000',                    // unchanged — readiness signal
  reuseExistingServer: !process.env.CI,            // unchanged — fast local path preserved
  cwd: workspaceRoot,                              // unchanged
  timeout: 180_000,                                // ADDED — default 60 s too tight for api-first cold boots
  gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 }, // ADDED — see teardown below
},
```

- **Teardown:** without `gracefulShutdown`, Playwright's default is a group **SIGKILL** (public types: "the process group is forcefully `SIGKILL`ed") — uncatchable, and the NX-detached `next dev` session is outside the group → orphans (the empirically-confirmed I17 mechanism). With `gracefulShutdown`, Playwright sends a group **SIGTERM** (catchable — the wrapper's handler runs), waits up to 15 s for the wrapper to exit, then SIGKILLs the group as fallback. The wrapper's cleanup (walk + 3 s grace + SIGKILL) completes well within 15 s.
- **Reuse semantics unchanged:** locally, if `:3000` already answers, Playwright reuses and never launches the wrapper (the ~30 s fast path over pre-started servers keeps working). In CI (`CI=true`), the wrapper always runs on the fresh runner.
- **`stdio: 'inherit'` for children** — server output flows to the wrapper's stdout/stderr, which Playwright pipes (webServer `stdout` default is `'ignore'`, `stderr` `'pipe'` — errors surface; the current `npm run dev` behavior is equivalent).

### Cleanup design (empirically validated)

- Spawn children with Node defaults (**not** `detached`) — they share the wrapper's process group, so Playwright's group-level SIGTERM/SIGKILL reach them directly as a second safety net.
- On SIGTERM/SIGINT/SIGHUP (and best-effort on `exit`): for each **spawned** child, walk the full descendant tree via the parent-pid chain (this reaches the NX-detached `next dev` session and its `next-server` worker, which a group-kill cannot), send SIGTERM to every collected pid, wait ~3 s, SIGKILL survivors, then exit. Adopted servers are untouched.
- Validation performed live: the exact walk → SIGTERM → 3 s → SIGKILL sequence on both real trees left **both ports free and zero surviving processes**, `next-server` included. (Research note: the validation script initially appeared to "fail" because zsh does not word-split unquoted `$VAR` — the kills never fired. The Node implementation has no such pitfall.)
- POSIX-only guarantees (process groups, `ps` walking via `/proc`). The repo's dev/CI/deploy surfaces are Linux; Windows would degrade to direct-child kills — acceptable and documented, not engineered around.

### Residual hazard (documented, accepted)

Local reuse checks only `:3000`. If a previous run was killed in a way that bypasses the wrapper's cleanup (e.g. `kill -9` on the wrapper, or a crashed machine), the state "`:3000` up, `:3001` down" makes Playwright reuse the web server without the API → API specs fail. The wrapper cannot intercept (it is never launched in reuse mode). Mitigations: (a) the wrapper's reliable cleanup makes the state rare going forward; (b) AGENTS.md documents the detection/fix (`ss -tlnp`, kill holders by PID — the condensed playbook's cleanup bullet). The inverse state (`:3001` up, `:3000` down) self-heals via the wrapper's adopt logic.

## Implementation details

- **TypeScript entry run by plain `node`.** The wrapper files are `.ts` executed via `node apps/web/e2e/run-dev-servers.ts` — Node 24 (`.nvmrc` = 24; repo runs 24.15) runs TS natively via type stripping. Constraints honored: erasable syntax only (no enums/namespaces/parameter properties) and explicit `.ts` extension in the relative import (`./readiness.ts`). Why not `.mjs`: the web Jest `testMatch` is `<rootDir>/__tests__/**/*.test.{ts,tsx}` and the transform pipeline is TS-first — a `.mjs` module would need a `testMatch`/transform/`.d.mts` shim chain; TS gives lint coverage and a standard test story with zero config changes.
- **`no-console: 'warn'` applies repo-wide** (zero-warnings rule) — the wrapper logs via `process.stdout.write` / `process.stderr.write` helpers instead of `console.*`. No ESLint config change needed.
- **Lint/typecheck status of `e2e/*.ts`:** linted (ESLint globs `apps/web/**/*.{ts,tsx}` and `**/*.{ts,tsx}` for import-x). `apps/web/tsconfig.json` was modified to include `e2e/**/*.ts` and enable `allowImportingTsExtensions: true`; this is required because `__tests__/e2e/readiness.test.ts` imports `../../e2e/readiness` and would hit TS6307 when the target module is outside the project's `include`, and `run-dev-servers.ts` imports `./readiness.ts` with an explicit extension as required by Node type-stripping, which TS5097 rejects without `allowImportingTsExtensions`. `tsconfig.e2e.json` (which includes `e2e/**`) remains unreferenced (vestigial from the original generator); wiring it into a target is out of scope.
- **`apps/web/e2e/package.json`:** added with exactly `{ "type": "module" }` to scope Node's module resolution for the type-stripped scripts in `e2e/`. This eliminates the `MODULE_TYPELESS_PACKAGE_JSON` warning emitted when `node apps/web/e2e/run-dev-servers.ts` runs, preserving the zero-warnings rule. Jest and Playwright continue to resolve correctly from their respective roots; the file has no blast radius on `apps/web` tests or build.
- **Jest/coverage:** the new test lives at `apps/web/__tests__/e2e/readiness.test.ts` (matches `testMatch`; mirrors the `e2e/` location). It imports only `readiness.ts`. Fake-`fetchImpl` cases for retry/timeout/status logic; one real-socket case with an ephemeral `node:http` server (closed in `afterAll` — no open handles, zero warnings), plus an additional real-socket case exercising the default global `fetch` branch. `readiness.ts` treats HTTP 200 as ready (the health endpoint's contract); Playwright's own `url` contract (2xx/3xx/400/401/402/403) is separate and unchanged.
- **No new dependencies** — `node:child_process`, `node:http` (test only), global `fetch` (Node 24 native), `ps`/`/proc` for the walk.

## Risk assessment

| Risk                                                                      | Likelihood | Mitigation                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loss of pre-push E2E net lets a broken E2E reach `develop`                | Medium     | Accepted trade-off (documented): the SDD flow validates with E2E before close (Meta 3); CI runs full E2E on every push within minutes; PRs to `main` re-gate with CI; local `npm run e2e` is deterministic and fast when wanted. If CI's E2E step is ever removed/conditioned, the `pre-push-quality-gate` spec is violated by contract. |
| Wrapper cleanup misses a process on some future NX/Next change            | Low        | Cleanup is tree-shape-agnostic (descendant walk via ppid chain, not hardcoded pids/groups); SIGKILL escalation; Playwright's group signals are a second net; validation gate requires zero listeners on both ports after runs.                                                                                                           |
| `gracefulShutdown` timeout (15 s) too tight on a slow machine             | Low        | Cleanup is walk (~fast) + 3 s grace + SIGKILL — measured well under 5 s; 15 s leaves 3× margin; the SIGKILL fallback still kills the wrapper's group (direct children) even on timeout.                                                                                                                                                  |
| Node type-stripping rejects the wrapper (non-erasable syntax)             | Low        | The files are small and reviewed against the erasable-syntax constraint; the fresh-run validation gate catches any issue immediately. Fallback: rename to `.mjs` (design's `.mjs` analysis documents the path).                                                                                                                          |
| Web coverage thresholds regress                                           | Very Low   | Only the fully-tested `readiness.ts` enters the coverage set (the entry file is never imported by tests); contribution is strictly positive.                                                                                                                                                                                             |
| `webServer.timeout` 180 s still too tight on very cold CI boots           | Very Low   | Measured warm boots are seconds; cold boots are dominated by NX/webpack init well under 60 s per app; 180 s covers api+web sequentially with margin. If exceeded, Playwright's error is explicit and the timeout is a one-line constant.                                                                                                 |
| Renumbering I18→I17 confuses historical archive references                | Very Low   | Archives are historical records and intentionally keep old IDs (established policy from previous renumberings); grep-verified that nothing else references I17/I18.                                                                                                                                                                      |
| Hook slimmed but a developer relies on muscle memory ("E2E ran pre-push") | Low        | Condensed AGENTS.md playbook states the new contract (E2E in CI + local `npm run e2e`); the SDD Validate gate and the pre-PR checklist (`npm run e2e`) keep E2E in the standard flow.                                                                                                                                                    |

## Documentation sync — precise edit map

- **`AGENTS.md`:**
  - SDD workflow step 4 "Validate" → one line naming the gate: lint + build + unit tests, plus E2E when the change warrants it per the spec.
  - Pre-PR checklist → `npm run e2e` added to lint/build/test.
  - "Push workflow — husky pre-push hook & local E2E" playbook → rewritten condensed to ~4 lines (exact final text in tasks.md 5.3). Obsolete items removed: the ~10-min silent E2E in the hook, the SSH-idle-timeout-during-long-hook item (the window is gone; keep-alive stays as one hygiene line), the I17 workaround (resolved by the wrapper — the residual-hazard detection/fix is covered by the PID-cleanup bullet), and run-gates-in-parts (superseded by the pre-PR checklist). Serve targets are not repeated — already in Build/Lint/Test Commands.
- **`CLAUDE.md`:** step 5 "Validation" → the same one-line gate. Nothing else.
- **`.opencode/agents/tester.md`:** Workflow step 5 "Verify" → run the tests to surface failures: `npm run test` always, plus `npm run e2e` when the change warrants it; the "or provide the exact command" escape hatch removed. (Implementation note: opencode agent files are edited via the `customize-opencode` skill.)
- **`.opencode/agents/spec-writer.md`:** `tasks.md` section → one bullet: E2E tasks are discretionary by change type (user-facing / behavioral / significant → include; small / no-behavior → skip; when in doubt → ask the user — same pattern as the orchestrator's spec-vs-direct triage).
- **`ROADMAP.md`:**
  - Remove the I17 block (E2E flake) — resolved 11 Sep 2026 by this change (readiness wrapper + hook slim-down; prod-build E2E evaluated and deferred).
  - Renumber **I18 → I17** (the `WaterFootprintService` `console.warn` item), content unchanged, per the Notas continuous-sequence rule.
  - Status table "E2E" row: note deterministic readiness (wrapper) — e.g. "Playwright: 49 specs, 5 browsers, CI integrado, arranque determinista (readiness de ambos puertos)".
  - "Última actualización" stays 11 Sep 2026.
- **Sweep:** `grep -rn "I17\|I18" --include="*.md" .` (excluding `node_modules/`, `openspec/changes/archive/`, `CHANGELOG.md`) must return only intentional current-state mentions after the edits. Same for `grep -rn "pre-push" AGENTS.md README.md` — README has no hook mentions today (verified), so none should appear.
- **`CHANGELOG.md`:** never touched — generated by semantic-release.

### Module-type warning resolution (final state)

The `MODULE_TYPELESS_PACKAGE_JSON` warning is eliminated with `apps/web/e2e/package.json` (`{"type": "module"}`) — Node reads the nearest package.json, so the scope is only the e2e scripts. Two dead ends found and avoided (documented so they are not retried):

- **Nameless package.json breaks the NX project graph** — NX 23 raises `ProjectsWithNoNameError` for any package.json in the workspace without a `name`. Plugin-level `exclude` globs on `@nx/js/typescript` do NOT suppress that scan (verified empirically). Naming it would create a phantom project in the graph.
- **Solution:** one line in `.nxignore` (`apps/web/e2e/package.json`) — project inference skips the file; `nx show projects` returns only the 3 real projects.

The readiness unit test file declares `@jest-environment node` via docblock: the web project default is jsdom, which has no global `fetch` — the module's default-branch test needs Node's native fetch.

## Validation gates (all must pass, zero errors and zero warnings)

1. `npx nx test web` — 221 baseline + new `readiness` tests, zero errors/warnings, coverage thresholds intact (80/80/80 + 75 branches); `npx nx test api` (54) and `npx nx test shared` (8) unchanged and green.
2. `npm run lint` — zero warnings (the new `.ts` files included).
3. `npm run build` — all projects compile.
4. **Empirical E2E determinism (the core gate):** with both ports free, run `npx nx e2e web` fresh — full suite green, zero `ECONNREFUSED`; verify `ss -tlnp | grep -E ':3000|:3001'` shows NO listeners after the run (cleanup worked, no `next-server` orphan); repeat the fresh run a second time consecutively — equally green (proves no cross-run interference).
5. **Reuse fast path:** pre-start both servers (`npx nx dev web` + `npx nx serve api`, poll both to 200), run `npx nx e2e web` — Playwright reuses (wrapper never launches), suite green in the ~30 s window; kill the servers afterwards.
6. **Adopt path (optional but recommended):** with only the API pre-started (`:3001` up, `:3000` free), run `npx nx e2e web` — the wrapper adopts the API, spawns web, suite green; after the run the adopted API is still alive (kill it manually).
7. **Hook validation without pushing:** `sh .husky/pre-push` from the repo root — branch check + affected tests run faithfully and pass; `git push --dry-run` as the secondary path (fast now; sends nothing).
8. Documentation gates: the AGENTS.md/CLAUDE.md/agent/ROADMAP edits read coherently; the grep sweeps return only intentional/historical mentions.
