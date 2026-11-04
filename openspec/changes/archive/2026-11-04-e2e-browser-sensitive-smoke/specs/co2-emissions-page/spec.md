## MODIFIED Requirements

### Requirement: End-to-end coverage against fixture-backed OWID

An E2E spec `apps/web/e2e/co2-emissions.spec.ts` (Playwright `test(...)`, mirroring `water-footprint.spec.ts` and running against the real BFF, which in the E2E environment reads OWID from a local fixture server, in `chromium-desktop`; the render, no-overflow, 360 px layout, country-selection-by-typing and metric-toggle tests are `@smoke` and also run in the other four projects) SHALL cover: core render with heading, key figures, chart SVG and attribution; server-rendered figures in the raw HTML; metadata; combobox typing ("arg" shows Argentina, selecting it updates the chart title, flag `fi-ar` is shown, no regional-indicator emoji); the full keyboard flow (ArrowDown, ArrowUp, Home, End, Enter, Escape); the metric toggle; no URL change; the data table; the dependencies endpoint (`/api/v1/health/dependencies` is `200` with `owid` up, probing the fixture server); the theme toggle; the number of flag image requests after opening the list staying small; axe; and no console errors. `a11y.spec.ts` and `seo.spec.ts` SHALL be updated for the page (the CO2 meta description expectation changes).

#### Scenario: Spec runs in all five projects

- **WHEN** `npm run e2e` runs
- **THEN** `co2-emissions.spec.ts` executes fully in `chromium-desktop` and passes
- **AND** only its render, no-overflow, 360 px layout, country-selection and metric-toggle tests execute in `firefox-desktop`, `webkit-desktop`, `mobile-chrome` and `mobile-safari`, and pass

#### Scenario: E2E never reaches live OWID

- **WHEN** the E2E webServer wrapper starts the servers
- **THEN** a local fixture server is listening and the API is started with `OWID_GRAPHER_BASE_URL` (and `OWID_API_BASE_URL`) pointing at it, so no E2E request leaves the machine for OWID
- **AND** the fixture server serves, for both chart slugs, the filtered CSV and the `.metadata.json`, and the indicator metadata, with a handful of entities (World, Argentina, one entity with null years)

#### Scenario: Existing specs still pass

- **WHEN** the E2E suite runs
- **THEN** `seo.spec.ts` expects the new CO2 description and the other category expectations are unchanged
