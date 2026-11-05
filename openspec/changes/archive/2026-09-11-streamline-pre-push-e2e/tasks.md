# Tasks: Streamline pre-push E2E — slim hook + deterministic E2E readiness

> **No commits, pushes, or PRs** — per explicit user decision, the implementation stays in the working tree. The user validates manually (fresh E2E runs, hook validation) before authorizing any commit. This file intentionally contains **no commit tasks**.
> Implementation order: Meta 2 (readiness wrapper) first — the empirical E2E gates need it in place — then Meta 1 (hook slim-down), then Meta 3 (agent definitions + docs), then final gates.

---

## Task Group 0 — Baseline & assumption verification

### [x] 0.1 Confirm the starting state

- `node -v` → 24.x (`.nvmrc`); both ports free: `ss -tlnp | grep -E ':3000|:3001'` → no listeners (if orphans exist from earlier work, kill them by PID — never `pkill -f` with a self-matching pattern).
- Confirm `.husky/pre-push` currently contains the main-block + `npx nx affected --target=test --base=origin/develop` + `npx nx e2e web` (the state this change modifies).
- Confirm `.github/workflows/ci.yml` has `on: push: branches: ['**']` and a final `npm run e2e` step (the safety net — must be present and untouched by this change).

**Verification:** As stated. Any deviation → stop and report before writing code.

---

## Task Group 1 — Meta 2: readiness module, wrapper, and Playwright config

### [x] 1.1 Create `apps/web/e2e/readiness.ts` (pure module)

- Export `waitForUrl(url: string, options: WaitForUrlOptions): Promise<void>` with an explicit `WaitForUrlOptions` interface: `fetchImpl?: FetchLike` (defaults to global `fetch`), `timeoutMs: number`, `intervalMs: number`.
- Behavior: poll `url`; **resolve** when the response status is 200; **keep polling** (after `intervalMs`) when the fetch rejects (connection refused / not listening) or the status is not 200; **reject** with a clear `Error` naming the URL and the elapsed timeout when `timeoutMs` expires.
- Constraints: no side effects on import (no top-level execution), explicit types on all params/returns, no `any`, erasable TS syntax only (no enums/namespaces/parameter properties — the file is run by Node's native type stripping), no `console.*` (repo-wide `no-console: warn`).

**Verification:** `npx nx lint web` (or `npm run lint`) passes on the new file with zero warnings; the file exports only the function + types; importing it executes nothing.

### [x] 1.2 Create `apps/web/e2e/run-dev-servers.ts` (wrapper entry)

- Import the helper with the explicit extension: `import { waitForUrl } from './readiness.ts';` (required for Node type stripping; ESLint's `import-x` config does not flag extensions).
- Constants: `API_HEALTH_URL = 'http://localhost:3001/api/v1/health'`, API spawn command `npx nx serve api`, web spawn command `npx nx dev web`, API readiness timeout (e.g. 120_000), pre-check window (~1 s), cleanup grace period (~3 s).
- **Main guard** (`if (import.meta.url === pathToFileURL(process.argv[1]).href)`-style): orchestration runs only when executed directly, never when imported.
- **Sequencing:** (1) quick pre-check of `API_HEALTH_URL` — if it answers, adopt (log "api already running — adopting", no spawn); (2) otherwise `spawn('npx', ['nx', 'serve', 'api'], { stdio: 'inherit' })` (NOT detached — children share the wrapper's process group so Playwright's group signals reach them) and `waitForUrl` to readiness; (3) if the spawned API exits before readiness, re-check the URL once (mid-boot adoption) — still down → clear `process.stderr.write` error, clean up, `process.exit(1)`; (4) spawn `npx nx dev web` the same way (with the same early-exit re-check/error handling); (5) stay alive (no-op interval — do NOT `unref()` it).
- **Cleanup:** on SIGTERM, SIGINT, SIGHUP (and best-effort synchronous kill on `exit`): for each **spawned** child, collect the full descendant tree via the parent-pid chain (read `/proc/<pid>/task/<pid>/children` or parse `ps -eo pid=,ppid=` — POSIX only, documented as such), send SIGTERM to every collected pid, wait the grace period, SIGKILL survivors, then exit. **Adopted servers are never killed.** Idempotent (ignore ESRCH on already-dead pids).
- All logging via `process.stdout.write` / `process.stderr.write` (no `console.*`); explicit types; no `any`; erasable syntax only.

**Verification:** `npm run lint` passes with zero warnings on both new files. Manual smoke (safe, no Playwright): `node apps/web/e2e/run-dev-servers.ts &` from the repo root → observe the API come up, then the web server; `curl` both `http://localhost:3001/api/v1/health` and `http://localhost:3000` → 200; send SIGTERM to the wrapper (`kill -TERM <wrapper pid>`) → within ~5 s both ports are free (`ss -tlnp | grep -E ':3000|:3001'` → nothing) and no `next-server` process remains (`ps -eo pid,ppid,args | grep next-server` → empty). If anything survives, fix the walk/kill before proceeding.

### [x] 1.3 Update `apps/web/playwright.config.ts` (`webServer` block only)

```ts
webServer: {
  command: 'node apps/web/e2e/run-dev-servers.ts',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  cwd: workspaceRoot,
  timeout: 180_000,
  gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
},
```

- Change nothing else in the file (projects, grep tags, reporter, `nxE2EPreset`, `baseURL`, trace setting all stay byte-identical).

**Verification:** `git diff apps/web/playwright.config.ts` shows only the `webServer` block change; `npx nx lint web` green.

---

## Task Group 2 — Unit tests for the readiness module

### [x] 2.1 Create `apps/web/__tests__/e2e/readiness.test.ts`

- `describe('waitForUrl')` with `it(...)` cases in English, zero errors/warnings, no open handles:
  1. **resolves when the URL returns 200 immediately** (injected fake `fetchImpl` returning a 200 `Response`-like object).
  2. **resolves after retrying through connection failures** — fake `fetchImpl` rejects (connection refused) N times, then returns 200; assert the call count proves retries happened.
  3. **keeps polling on non-200 statuses** — fake `fetchImpl` returns 503 twice, then 200.
  4. **rejects with a clear message on timeout** — fake `fetchImpl` always rejects; `timeoutMs` small; assert the rejection message names the URL.
  5. **hermetic real-socket case** — start an `node:http` server on `127.0.0.1:0` (ephemeral port), `waitForUrl` against it (real global `fetch`), close the server in `afterAll`. No external network.
- Use small `timeoutMs`/`intervalMs` values so the suite stays fast; follow the repo conventions (`describe`/`it`, `__tests__/` mirroring, English descriptions).
- Do **not** import `run-dev-servers.ts` from any test (keeps the entry file out of the coverage set — see design.md).

**Verification:** `npx nx test web` — all tests green including the new ones (221 baseline + new), **zero `console.error`/`console.warn` in the output**, no open-handle warnings, coverage thresholds intact (80% statements/functions/lines, 75% branches — the contribution of `readiness.ts` must be strictly positive; a threshold failure here means untested branches in `readiness.ts` — cover them, do not touch the thresholds).

---

## Task Group 3 — Empirical E2E validation (the core gate)

### [x] 3.1 Fresh run, twice consecutively

- Ensure both ports are free (`ss -tlnp | grep -E ':3000|:3001'` → nothing).
- Run `npx nx e2e web`. Expected: full suite green (219/219 test runs across the 5 projects), **zero `ECONNREFUSED :3001`**.
- After the run: `ss -tlnp | grep -E ':3000|:3001'` → **no listeners** (wrapper cleanup worked, no `next-server` orphan); `ps -eo pid,ppid,args | grep -E 'next-server|run-dev-servers'` → empty.
- Repeat the fresh run a second time, same checks. Two consecutive green fresh runs = determinism proven (no cross-run interference).

**Verification:** As stated — this is the acceptance gate for the I17 fix. Any `ECONNREFUSED :3001` on a fresh run with both ports initially free is a wrapper bug: investigate the sequencing/poll logic at the root (do not add retries to the specs).

### [x] 3.2 Reuse fast path (pre-started servers)

- Start `npx nx dev web` and `npx nx serve api` in the background; poll both `http://localhost:3000` and `http://localhost:3001/api/v1/health` to 200.
- Run `npx nx e2e web` — Playwright's reuse check on `:3000` succeeds, the wrapper is never launched (its "adopting" log must NOT appear), suite green in the ~30 s window.
- Kill both servers afterwards (by PID / process tree, per the AGENTS.md technique).

**Verification:** Verified by @tester with `npx nx e2e web --skip-nx-cache -- --project=chromium-desktop`: wrapper not spawned when both servers already listening; pre-started servers survive. Note: the first validation run may hit NX cache and appear instant; `--skip-nx-cache` is required to exercise the real wrapper fast path.

### [x] 3.3 Adopt path (API pre-started only)

- Start ONLY `npx nx serve api`; poll `:3001/api/v1/health` to 200; ensure `:3000` is free.
- Run `npx nx e2e web` — the wrapper's log shows the API being adopted (no second API spawn), web spawned, suite green.
- After the run: the **adopted API is still alive** (the wrapper must not kill it) — verify `:3001` still answers, then kill it manually.

**Verification:** As stated — proves adopt-or-spawn and the "never kill what you didn't spawn" rule.

---

## Task Group 4 — Meta 1: slim the pre-push hook

### [x] 4.1 Remove E2E from `.husky/pre-push`

- Final content (shell comments allowed):

```sh
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ]; then
  echo "Direct push to main is not allowed. Open a PR."
  exit 1
fi

# E2E intentionally NOT run here: CI runs the full Playwright suite on every
# push to every branch (.github/workflows/ci.yml). Run it locally with
# `npm run e2e` when you want pre-push E2E confidence.
npx nx affected --target=test --base=origin/develop
```

- Keep the file executable and the main-block + affected-test lines byte-identical to the current ones.

**Verification:** `git diff .husky/pre-push` shows only the removed `npx nx e2e web` line + the added comment; `ls -l .husky/pre-push` still shows the executable bit.

### [x] 4.2 Validate the hook without a real push

- **Primary (fully local):** run `sh .husky/pre-push` from the repo root — the branch check passes (on `develop`/feature branch) and `npx nx affected --target=test --base=origin/develop` runs and exits 0 (or reports no affected projects if nothing changed).
- **Secondary:** `git push --dry-run origin develop` — runs the hook (empirically verified: dry-run DOES execute pre-push hooks) and sends nothing; must complete fast now (no E2E).
- Negative check (optional): `git checkout main && sh .husky/pre-push` → prints the block message and exits 1; return to the working branch afterwards.

**Verification:** Both validation paths pass; the hook completes in seconds-to-low-minutes (NX-cached), never spawns a browser or dev server.

---

## Task Group 5 — Meta 3: agent definitions + documentation sync

> Implementation note: `.opencode/agents/*.md` are opencode config — load the `customize-opencode` skill before editing them (part of these tasks, not a separate task).

### [x] 5.1 `.opencode/agents/tester.md` — Verify step runs the tests

- Replace Workflow step 5 with the line below — the "Run the tests or provide the exact command to run them" escape hatch is removed. Nothing else in the file changes.

```md
5. **Verify**: Run the tests to surface failures: `npm run test` always, plus `npm run e2e` when the change warrants it (user-facing / behavioral).
```

**Verification:** `git diff .opencode/agents/tester.md` shows only the step-5 line changed; frontmatter untouched.

### [x] 5.2 `.opencode/agents/spec-writer.md` — discretionary E2E tasks

- Add one bullet to the `### 4. tasks.md` section: `- **E2E tasks are discretionary by change type**: user-facing / behavioral / significant changes warrant an E2E task; small or no-behavior changes skip it. When in doubt, ask the user.` Nothing else in the file changes.

**Verification:** `git diff .opencode/agents/spec-writer.md` shows only the added bullet.

### [x] 5.3 AGENTS.md — Validate gate, pre-PR checklist, condensed playbook

- Step 4 "Validate" (Development Workflow SDD) → the line below:

```md
4. **Validate** — `@tester` writes/updates tests and runs the gates (lint + build + unit tests, plus E2E when the change warrants it per the spec); `@reviewer` does the final quality audit.
```

- Pre-PR checklist (end of Linting & Type Checking) → the line below:

```md
Pre-PR checklist: `npm run lint`, `npm run build`, `npm run test`, and `npm run e2e` must all pass with zero errors.
```

- Replace the entire "Push workflow — husky pre-push hook & local E2E (known constraints)" section (intro line + 6 items) with:

```md
### Push workflow — husky pre-push hook & local E2E

- `.husky/pre-push` blocks direct pushes to `main` and runs `npx nx affected --target=test --base=origin/develop` (fast, NX-cached). E2E is not push-time: CI runs the full suite on every push; locally use `npm run e2e` (deterministic — the webServer wrapper brings up both servers and cleans up their process trees).
- SSH keep-alive hygiene: set `ServerAliveInterval` for your GitHub SSH host in `~/.ssh/config` so long pushes don't die with `Connection closed by remote host`.
- If you start dev servers manually: `next dev` spawns a `next-server` worker that survives its parent and holds `:3000` — kill it by PID (`ss -tlnp | grep :3000`), never `pkill -f` with a self-matching pattern.
```

**Verification:** `grep -nE "10 min|I17|ECONNREFUSED|reuseExistingServer" AGENTS.md` → no hits (obsolete playbook content gone); `grep -n "Push workflow" AGENTS.md` → exactly 1 hit; the section is exactly the three bullets above; `grep -n "npm run e2e" AGENTS.md` → hits in the pre-PR checklist and the playbook only.

### [x] 5.4 CLAUDE.md — Validation step line

- Step 5 "Validation" → `5. **Validation**: Delegate to **tester** for tests and **reviewer** for final code quality audit. Gates: lint + build + unit tests, plus E2E when the change warrants it per the spec.` Nothing else in the file changes.

**Verification:** `git diff CLAUDE.md` shows only that line changed.

### [x] 5.5 ROADMAP.md — resolve I17, renumber I18 → I17

- Remove the **I17** block (E2E flake) — resolved 12 Sep 2026 by this change (readiness wrapper + E2E moved out of the pre-push hook into CI's existing coverage; prod-build E2E evaluated and deferred).
- Renumber **I18 → I17** (the `WaterFootprintService` `console.warn` item) — content unchanged, ID updated.
- Status table "E2E" row → note deterministic readiness (e.g. "Playwright: 49 specs, 5 browsers, CI integrado, arranque determinista (readiness de ambos puertos)").
- "Última actualización" updated to 12 Sep 2026.

**Verification:** `grep -nE "I17|I18" ROADMAP.md` → exactly one I-series item in the Testing section (the renumbered console.warn item, now I17), no I18, no flake item; the ID sequence is continuous.

### [x] 5.6 Reference sweep

- `grep -rn "I17\|I18" --include="*.md" .` excluding `node_modules/`, `openspec/changes/archive/` (historical records — intentionally keep old IDs), `CHANGELOG.md`, and this change's own folder → only intentional current-state mentions remain.
- `grep -rn "pre-push" README.md apps/web/README.md apps/api/README.md` → no hits (verified none exist today; none should be introduced).

**Verification:** Sweeps return only intentional/historical mentions.

---

## Task Group 6 — Final gates (all must pass, zero errors, zero warnings)

### [x] 6.1 Full validation suite

- `npm run lint` — zero errors, zero warnings.
- `npm run build` — all projects compile.
- `npm run test` — all three projects green (shared 8, api 54, web 221 + new readiness tests), zero warnings, coverage thresholds intact, no snapshot changes (nothing in app source changed — a `.snap` diff means an unintended side effect).
- `npm run e2e` — fresh deterministic run green (Task Group 3's acceptance gate; re-run only if anything changed after it).
- `sh .husky/pre-push` — the slimmed hook validates locally without a push (Task 4.2's primary path).
- `npx prettier --check "**/*.{ts,tsx,js,json}"` — the new files are formatted (run `npx prettier --write` on them if not).

**Verification:** All commands exit 0. Any failure → fix at the root before reporting completion.

---

## Definition of Done

- [x] `.husky/pre-push` = main-block + affected unit tests + comment; E2E line removed; validated via `sh .husky/pre-push` (and optionally `git push --dry-run`) without a real push
- [x] `apps/web/e2e/readiness.ts` + `apps/web/e2e/run-dev-servers.ts` in place; wrapper sequences API-first, adopts existing servers, cleans up full process trees (no `next-server` orphans)
- [x] `apps/web/playwright.config.ts` webServer: wrapper command + `timeout: 180_000` + `gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 }`; `url`/`reuseExistingServer`/`cwd` unchanged; nothing else in the file changed
- [x] `apps/web/__tests__/e2e/readiness.test.ts` green with zero warnings; web coverage thresholds intact
- [x] Two consecutive fresh `npx nx e2e web` runs fully green with zero `ECONNREFUSED :3001`, both ports verified free after each run (I17 determinism proven)
- [x] Adopt path (API pre-started only) verified green; reuse fast path verified green with `--skip-nx-cache`
- [x] `.opencode/agents/tester.md` Verify step runs unit + E2E (escape hatch removed); `.opencode/agents/spec-writer.md` carries the discretionary-E2E-tasks bullet
- [x] AGENTS.md: Validate gate line, pre-PR checklist with `npm run e2e`, condensed push playbook (obsolete items removed); CLAUDE.md Validation line synced; ROADMAP I17 resolved + removed, I18 renumbered → I17, E2E status row updated; reference sweeps clean
- [x] `npm run lint`, `npm run build`, `npm run test` all green with zero errors and zero warnings
- [x] `.github/workflows/ci.yml`, the E2E specs, all `package.json` files, `nx.json`, tsconfigs, and `eslint.config.mjs` untouched
- [x] Working tree only — **no commits, no pushes** (awaiting explicit user authorization)
