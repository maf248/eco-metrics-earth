## ADDED Requirements

### Requirement: Live pages are warmed before the first test

`apps/web/playwright.config.ts` SHALL declare a `globalSetup` (`apps/web/e2e/global-setup.ts`), which Playwright runs after the `webServer` is ready.

It SHALL request each live category page (`LIVE_CATEGORY_SLUGS`) and `/data-sources/` once, in parallel and with a bounded timeout. It SHALL log each page's status and duration, and SHALL NOT fail the run.

#### Scenario: A shard's first visit to a live page is a client navigation

- **GIVEN** a fresh `next dev` in an E2E shard
- **WHEN** the first test of the shard that reaches `/co2-emissions/` does so by clicking a link
- **THEN** the page was already rendered once by the global setup
- **AND** the navigation does not wait for its compilation or its first data read

#### Scenario: A page fails during the warm-up

- **GIVEN** a live page that answers `500` or times out during the warm-up
- **WHEN** the global setup finishes
- **THEN** the failure is logged with the page and the reason
- **AND** the tests still run and report the broken page themselves

#### Scenario: Local run with a reused server

- **GIVEN** a dev server already running locally, with its pages compiled
- **WHEN** `npx nx e2e web` runs
- **THEN** the warm-up only renders the already compiled pages, without compiling them, and the tests start
