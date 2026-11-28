## MODIFIED Requirements

### Requirement: Playwright webServer configuration matches the wrapper contract

`apps/web/playwright.config.ts` SHALL configure `webServer` with: `command: 'node apps/web/e2e/run-dev-servers.ts'`, `url: 'http://localhost:3000/air-quality/'` (the readiness signal whose response implies API readiness; a category page, so that the readiness check also makes `next dev` compile the `[category]` route before the first test, and the first client navigation to a category in each E2E shard does not wait for that compilation), `reuseExistingServer: !process.env.CI` (unchanged — preserves the fast local path over pre-started servers), `cwd: workspaceRoot` (unchanged), `timeout: 180_000` (the default 60 s is too tight for api-first sequencing on cold boots), and `gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 }` (without it, Playwright's default teardown is a group **SIGKILL** — the empirically-confirmed orphan mechanism; with it, the wrapper receives a catchable SIGTERM and runs its cleanup within the 15 s window before any SIGKILL fallback).

#### Scenario: Configuration inspection

- **WHEN** `apps/web/playwright.config.ts` is inspected after the change
- **THEN** the `webServer` block matches the contract above, and no other config section (projects, reporters, `nxE2EPreset` usage, `baseURL`) changed

#### Scenario: Local reuse fast path is preserved

- **GIVEN** both servers already running and answering (the documented local workflow)
- **WHEN** `npx nx e2e web` is executed locally (no `CI` env)
- **THEN** Playwright's reuse check on the category URL of `:3000` succeeds, the wrapper is never launched, and the suite completes in the documented ~30 s window

#### Scenario: The category route is compiled before the first test

- **GIVEN** a fresh `next dev` started by the wrapper, in CI or locally
- **WHEN** Playwright reports the web server ready
- **THEN** `/air-quality/` has already answered once, so the `[category]` route is compiled
- **AND** a test whose first category visit is a client-side navigation does not wait for that compilation
