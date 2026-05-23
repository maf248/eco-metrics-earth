# E2E Playwright Configuration

## ADDED Requirements

### Requirement: NX project scaffolded via @nx/playwright
The monorepo SHALL contain an E2E project at `apps/web-e2e/` generated using the `@nx/playwright:project` generator. The project MUST have inferred NX targets for `e2e` and `lint`.

#### Scenario: Project exists and is runnable
- **WHEN** `npx nx e2e web-e2e` is executed
- **THEN** Playwright starts, runs tests, and exits with a status code

#### Scenario: NX affected detection works
- **WHEN** only `apps/web` or `packages/shared` source files change
- **THEN** `npx nx affected --target=e2e` includes `web-e2e` in its execution plan
- **WHEN** only `apps/api` source files change (no web/shared changes)
- **THEN** `npx nx affected --target=e2e` excludes `web-e2e`

### Requirement: Five browser projects configured
The `playwright.config.ts` SHALL define five Playwright projects: `chromium-desktop`, `firefox-desktop`, `webkit-desktop`, `mobile-chrome` (Pixel 5), and `mobile-safari` (iPhone 12).

#### Scenario: All browser projects are valid
- **WHEN** `npx playwright test --list` is executed
- **THEN** all five project names appear in the output

#### Scenario: Mobile projects use device emulation
- **WHEN** tests run on the `mobile-chrome` project
- **THEN** the viewport matches Pixel 5 dimensions (393x851)
- **WHEN** tests run on the `mobile-safari` project
- **THEN** the viewport matches iPhone 12 dimensions (390x844)

### Requirement: webServer auto-starts dev environment
The `playwright.config.ts` SHALL configure a `webServer` that runs `npm run dev` before tests begin. The config MUST wait for both `http://localhost:3000` (web) and `http://localhost:3001` (API) to be available before starting tests.

#### Scenario: Dev server auto-starts
- **WHEN** Playwright is invoked without a running dev server
- **THEN** `npm run dev` starts automatically
- **AND** Playwright waits for the web and API URLs to respond before running tests

#### Scenario: reuseExistingServer prevents duplicate servers
- **WHEN** a dev server is already running on ports 3000 and 3001
- **THEN** Playwright reuses the existing server instead of starting a new one

### Requirement: Traces retained on failure
The `playwright.config.ts` SHALL configure `trace: 'retain-on-failure'` so that trace files are saved only for failing tests.

#### Scenario: Trace saved on failure
- **WHEN** a test fails
- **THEN** a Playwright trace file is written to `apps/web-e2e/test-results/`

#### Scenario: No trace on success
- **WHEN** all tests pass
- **THEN** no trace files are written

### Requirement: Smoke tag for cross-browser efficiency
The `playwright.config.ts` SHALL define a `@smoke` tag grep pattern so that non-Chromium browsers run only smoke-tagged tests.

#### Scenario: Non-Chromium browsers run only smoke tests
- **WHEN** `npx nx e2e web-e2e` runs on CI
- **THEN** `chromium-desktop` runs the full test suite
- **AND** all other projects run only tests tagged with `@smoke`

### Requirement: Dependencies pinned with exact versions
The root `package.json` SHALL include `@nx/playwright@22.7.3`, `@playwright/test@1.60.0`, and `@axe-core/playwright@4.10.1` in `devDependencies` with exact versions (no `^` or `~`).

#### Scenario: Exact versions in package.json
- **WHEN** `npm ls @playwright/test` is executed
- **THEN** the installed version is exactly `1.60.0` (no caret or tilde prefix)
