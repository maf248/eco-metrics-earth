## MODIFIED Requirements

### Requirement: End-to-end coverage against fixture-backed OWID

An E2E spec `apps/web/e2e/global-temperature.spec.ts` (Playwright `test(...)`, running against the real BFF, which reads OWID from the local fixture server, in `chromium-desktop`; the render, no-overflow, 360 px layout and country-selection-by-typing tests are `@smoke` and also run in the other four projects) SHALL cover: core render with heading, key figures, chart SVG and attribution including the Copernicus credit; server-rendered figures and the single JSON-LD `Dataset` in the raw HTML; metadata; selecting a country by typing (the fixture country has a negative anomaly and a missing year, shown in the table with U+2212 and an em dash); the keyboard flow; no URL change; no measure toggle; the data table; the theme toggle repainting; and no console errors. `a11y.spec.ts` SHALL cover the page in light and dark and with the listbox open, and `seo.spec.ts` SHALL expect the new description. The OWID fixture server SHALL serve the temperature chart CSV (World, a country with negative values and a null year, Kosovo, 1940-2025) and the indicator `1325256` metadata (with `descriptionShort`, `datasetName`, `datasetVersion`, `updatedAt`), with no E2E request leaving the machine.

#### Scenario: Spec runs in all five projects

- **WHEN** `npm run e2e` runs
- **THEN** `global-temperature.spec.ts` executes fully in `chromium-desktop` and passes
- **AND** only its render, no-overflow, 360 px layout and country-selection tests execute in `firefox-desktop`, `webkit-desktop`, `mobile-chrome` and `mobile-safari`, and pass

#### Scenario: E2E never reaches live OWID

- **WHEN** the E2E webServer wrapper starts the servers
- **THEN** the fixture server answers the temperature chart and indicator routes and the API is started against it, as for CO2

#### Scenario: Existing specs still pass

- **WHEN** the full E2E suite runs
- **THEN** `co2-emissions.spec.ts` and every other spec pass without assertion changes
