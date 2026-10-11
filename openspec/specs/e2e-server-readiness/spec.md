# E2E Server Readiness Specification

## Purpose

Guarantees deterministic Playwright E2E runs: the webServer readiness wrapper establishes the API server (`:3001`) BEFORE the web dev server (`:3000`), so Playwright's single readiness URL responding implies both servers are up. Delivers the both-ports wait originally required by the archived `e2e-playwright-config` spec (impossible with a single Playwright `url`) and adds process-tree cleanup guarantees (no orphaned `next-server` workers).

## Requirements

### Requirement: E2E webServer guarantees API readiness before web readiness

The Playwright `webServer.command` SHALL be a readiness wrapper (`apps/web/e2e/run-dev-servers.ts`) that establishes the API server BEFORE starting the web dev server: it first ensures `http://localhost:3001/api/v1/health` responds 200 (adopting an already-running API or spawning `npx nx serve api` and polling until ready), and only then spawns `npx nx dev web`. Because the web server is started strictly after the API is ready, Playwright's own readiness signal (`url: 'http://localhost:3000'`) responding **implies** the API is already listening — no spec can observe `:3000` up while `:3001` is down on a fresh run.

#### Scenario: Fresh local run is deterministic

- **GIVEN** no process listening on `:3000` or `:3001`
- **WHEN** `npx nx e2e web` is executed (which Playwright starts the wrapper for, since `reuseExistingServer: !CI` finds `:3000` down)
- **THEN** the wrapper brings the API to readiness first, then the web server, and the full suite (including the API specs in `e2e/api-health.spec.ts`) passes with zero `ECONNREFUSED :3001` failures

#### Scenario: Fresh CI run is deterministic

- **GIVEN** a fresh CI runner with `CI=true` (so `reuseExistingServer` is `false` and Playwright always launches the wrapper)
- **WHEN** the CI `npm run e2e` step runs
- **THEN** the same api-first sequencing applies and the suite is green deterministically

#### Scenario: Consecutive fresh runs do not interfere

- **GIVEN** a completed fresh run whose wrapper cleaned up all spawned processes
- **WHEN** `npx nx e2e web` is executed again immediately with both ports free
- **THEN** the second run is equally deterministic and green

### Requirement: Readiness wrapper adopts existing servers safely

The wrapper SHALL NOT spawn a second server onto an occupied port and SHALL NOT kill servers it did not spawn. Before spawning each server it performs a short pre-check of its readiness URL: if the port already answers, the existing server is adopted (used, not managed); otherwise the server is spawned and polled to readiness. If a spawned child exits before becoming ready, the wrapper re-checks the port once (the server may have been mid-boot at pre-check time) before failing with a clear error.

#### Scenario: API already running is adopted, not duplicated

- **GIVEN** `:3001` already answering `/api/v1/health` (e.g. a manually started `npx nx serve api`) and `:3000` free
- **WHEN** the wrapper runs
- **THEN** no second API process is spawned, the web dev server is started, and at shutdown the adopted API process is still alive (only the spawned web tree is killed)

#### Scenario: Spawned server fails before readiness produces a clear error

- **GIVEN** a spawned server process that exits before its readiness URL answers (and the port is not subsequently answered by the re-check)
- **WHEN** the wrapper detects the early exit
- **THEN** it prints a clear error identifying the server and URL to stderr, kills any remaining spawned trees, and exits non-zero (Playwright reports the webServer failure)

### Requirement: Reliable process-tree cleanup with no orphans

The wrapper SHALL register SIGTERM, SIGINT, and SIGHUP handlers (plus a best-effort synchronous kill on `exit`) that terminate every process tree it spawned — using a descendant walk (collecting all pids recursively via the parent-pid chain) and signaling each pid with SIGTERM, then SIGKILL after a short grace period. This is required because NX spawns `next dev` in a **new session and process group** (empirically verified), so a group-kill of the wrapper's direct children does not reach the `next dev` / `next-server` tree; the descendant walk does. The wrapper relays child-process output through pipes (not inherited stdio) only while it is not shutting down — the teardown reports emitted by the killed dev servers (`NX ... did not complete`, non-zero-exit warnings) are not forwarded, keeping the E2E output clean after the suite result. Boot-time stderr (e.g. inspector banners, early errors) remains visible — Playwright relays webServer stderr live and buffers stdout for failure reporting. The wrapper's own children are spawned non-detached (sharing the wrapper's process group) so that Playwright's group-level shutdown signals reach them as a second safety net.

#### Scenario: Full run leaves no listener and no orphan process

- **GIVEN** a completed `npx nx e2e web` run in which the wrapper spawned both servers
- **WHEN** Playwright tears the webServer down (group SIGTERM via `gracefulShutdown`, then the wrapper's handlers run)
- **THEN** no process holds `:3000` or `:3001` afterwards (verifiable via `ss -tlnp`), including the `next-server` worker that historically survived its parent, and the wrapper process itself has exited

#### Scenario: Playwright's SIGKILL fallback still reaches direct children

- **GIVEN** the wrapper's spawned children share the wrapper's process group (non-detached spawn)
- **WHEN** Playwright's `gracefulShutdown` timeout expires and it sends the group SIGKILL
- **THEN** the direct children (npm/nx shells) die with the wrapper; only the NX-detached `next dev` session would require the wrapper's walk — which the SIGTERM grace window is sized to complete

### Requirement: Readiness polling logic is unit-tested

The pure polling logic SHALL live in `apps/web/e2e/readiness.ts` (no side effects on import; injectable `fetchImpl`, `timeoutMs`, `intervalMs`) and SHALL be covered by unit tests in `apps/web/__tests__/e2e/readiness.test.ts` — success on first 200, success after connection-refused retries, rejection on timeout with a clear message, and non-200 status handling — plus one hermetic real-socket case using an ephemeral `node:http` server. Tests follow repo conventions (`describe`/`it`, English descriptions, zero errors and zero warnings, no open handles) and the web coverage thresholds remain intact (the entry script is not imported by any test, so only the fully-tested `readiness.ts` is added to the coverage set).

#### Scenario: Unit tests pass with zero warnings and thresholds intact

- **WHEN** `npx nx test web` runs after the change
- **THEN** the new `readiness` tests pass, the suite total grows accordingly (221 → 221 + new tests), no `console.error`/`console.warn` appears in the output, and the coverage thresholds (80% statements/functions/lines, 75% branches) are still met

### Requirement: Playwright webServer configuration matches the wrapper contract

`apps/web/playwright.config.ts` SHALL configure `webServer` with: `command: 'node apps/web/e2e/run-dev-servers.ts'`, `url: 'http://localhost:3000'` (unchanged — the readiness signal whose response now implies API readiness), `reuseExistingServer: !process.env.CI` (unchanged — preserves the fast local path over pre-started servers), `cwd: workspaceRoot` (unchanged), `timeout: 180_000` (the default 60 s is too tight for api-first sequencing on cold boots), and `gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 }` (without it, Playwright's default teardown is a group **SIGKILL** — the empirically-confirmed orphan mechanism; with it, the wrapper receives a catchable SIGTERM and runs its cleanup within the 15 s window before any SIGKILL fallback).

#### Scenario: Configuration inspection

- **WHEN** `apps/web/playwright.config.ts` is inspected after the change
- **THEN** the `webServer` block matches the contract above, and no other config section (projects, reporters, `nxE2EPreset` usage, `baseURL`) changed

#### Scenario: Local reuse fast path is preserved

- **GIVEN** both servers already running and answering (the documented local workflow)
- **WHEN** `npx nx e2e web` is executed locally (no `CI` env)
- **THEN** Playwright's reuse check on `:3000` succeeds, the wrapper is never launched, and the suite completes in the documented ~30 s window

### Requirement: Readiness wrapper injects the throttling environment into the servers it spawns

`apps/web/e2e/run-dev-servers.ts` SHALL pass an explicit `env` (merged over `process.env`) to the processes it spawns: the API receives `TRUST_PROXY_HOPS=1` and `INTERNAL_API_KEY=<E2E key>`; the web server receives the same `INTERNAL_API_KEY` so its server-side fetches bypass throttling. The E2E key is a non-secret constant (>= 32 chars) exported from `apps/web/e2e/utils/api-env.ts` and shared with `rate-limit.spec.ts`. An already-running API that is adopted keeps its own environment (the wrapper does not manage it). The readiness gate is unchanged: it still polls `GET /api/v1/health`, which remains throttler-exempt, and the api-first sequencing, adoption and cleanup guarantees continue to hold.

#### Scenario: Spawned API carries the E2E throttling env

- **GIVEN** `:3001` free
- **WHEN** the wrapper spawns `npx nx serve api`
- **THEN** the child environment contains `TRUST_PROXY_HOPS=1` and the E2E `INTERNAL_API_KEY`

#### Scenario: Readiness gate unaffected

- **WHEN** the readiness poll hits `/api/v1/health` many times during boot
- **THEN** it never receives `429` and the wrapper reaches the "both servers are up" state as before

#### Scenario: Adopted API is not modified

- **GIVEN** an API already answering on `:3001`
- **WHEN** the wrapper runs
- **THEN** it does not restart or reconfigure it (the rate-limit spec's precondition probe reports a mismatch if applicable)
