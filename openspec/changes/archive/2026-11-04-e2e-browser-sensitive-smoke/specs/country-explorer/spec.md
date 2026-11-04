## MODIFIED Requirements

### Requirement: CO2 page behavior is preserved

After the extraction, `/co2-emissions/` SHALL render the same DOM, texts, test ids, roles and behaviors as before (explorer card, metric toggle, key figures, chart title, live region, attribution, methodology note, collapsed table, JSON-LD block), and the existing CO2 unit suites and `co2-emissions.spec.ts` SHALL pass without assertion changes (only import paths and mocks of moved internals may change).

#### Scenario: Existing CO2 suites pass

- **WHEN** `npx nx test web` runs
- **THEN** the CO2 component, chart-option, structured-data, fetch and registry suites pass with unchanged assertions

#### Scenario: Existing CO2 E2E passes

- **WHEN** `npm run e2e` runs
- **THEN** `co2-emissions.spec.ts` passes unchanged in `chromium-desktop`, and its `@smoke` tests pass in the other four projects
