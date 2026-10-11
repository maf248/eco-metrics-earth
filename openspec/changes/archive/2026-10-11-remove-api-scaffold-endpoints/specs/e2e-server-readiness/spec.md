## MODIFIED Requirements

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
