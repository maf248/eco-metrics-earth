# e2e-browser-matrix Specification

## Purpose

Decides which E2E checks run in every browser project and which run only in chromium.

## Requirements

### Requirement: `@smoke` marks only browser-sensitive E2E checks

Playwright tests under `apps/web/e2e/` SHALL carry the `@smoke` tag only when their result can differ by browser engine or viewport: rendering, layout, focus, keyboard or pointer interaction. Tagged tests run in all five projects; every other test runs only in `chromium-desktop`. Checks of HTTP headers, server-rendered HTML, meta tags, structured data, provider state and direct API requests SHALL NOT be tagged. The rule SHALL be applied by moving tags only: no test is deleted, and the projects in `playwright.config.ts` (including `grep: /@smoke/` on the four non-chromium projects) do not change.

#### Scenario: Browser-independent specs run only in chromium

- **WHEN** the tests are listed per project
- **THEN** `seo.spec.ts`, `security-headers.spec.ts` and `api-health.spec.ts` appear only in `chromium-desktop`

#### Scenario: Chromium coverage is unchanged

- **WHEN** the tests are listed for `chromium-desktop` before and after a tag change
- **THEN** the same tests are listed

### Requirement: Category specs keep their visual and interaction checks in every browser

Each category E2E spec SHALL tag as `@smoke` its render check (heading, key figures, chart), its horizontal-overflow and narrow-viewport layout checks, and its main interactive control when it has one (the country selector; the metric toggle in `co2-emissions`). Its server-HTML, metadata, structured-data, stale/unavailable-state and health checks SHALL run only in `chromium-desktop`. A new category spec SHALL follow the same rule.

#### Scenario: Visual and interaction checks stay in every browser

- **WHEN** the tests of `co2-emissions.spec.ts`, `global-temperature.spec.ts` or `energy-sources.spec.ts` are listed for `webkit-desktop`
- **THEN** each listed test is a render, overflow or interaction check
- **AND** none checks server HTML, metadata or provider state

#### Scenario: Rule is documented

- **WHEN** `AGENTS.md` is read
- **THEN** its Testing Conventions state which checks are tagged `@smoke` and that the rule is applied by moving tags, never by deleting tests

### Requirement: CI records traces only on retry

`apps/web/playwright.config.ts` SHALL set `use.trace` to `on-first-retry` when `CI` is set and to `retain-on-failure` otherwise, so passing tests in CI record no trace and local failures keep theirs.

#### Scenario: CI records traces only on retry

- **WHEN** the suite runs with `CI` set and a test fails and is retried
- **THEN** a trace is recorded for the first retry only
- **AND** passing tests record no trace
