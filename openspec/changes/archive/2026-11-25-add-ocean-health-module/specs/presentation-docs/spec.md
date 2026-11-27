## ADDED Requirements

### Requirement: The multi-provider page and overlay conventions are recorded

`docs/design-system.md` SHALL record, in the same change, the presentation decisions this change establishes.

#### Scenario: Chart conventions

- **WHEN** `docs/design-system.md` is read
- **THEN** it documents the muted series role (token, opacity, series flag), the multi-year overlay chart (muted and silent earlier years, highlighted current and record years, dashed climatology, legend limited to highlighted series plus a sentence for the grey lines, no symbols) and the pH marker-plus-line convention with the reason its value axis does not start at zero

#### Scenario: Page conventions

- **WHEN** `docs/design-system.md` is read
- **THEN** it documents per-section degraded states on a multi-provider page (stale notice per section, unavailable state under the section's own heading, one shared state for the key figures and chart fed by the same provider), date-keyed tables (`RowDataTable`) with the bounded daily table and its note, the region and depth toggles as `MeasureToggle`, and the end date derived from the data for a non-current feed

#### Scenario: Degraded-states intro

- **WHEN** the "Degraded provider states" section is read
- **THEN** it no longer says OWID is the only provider-backed source, and no color literal appears for the new decisions

### Requirement: Structure and recipe docs reflect the new providers

`AGENTS.md` SHALL describe the new modules and the multi-provider recipe.

#### Scenario: AGENTS.md

- **WHEN** `AGENTS.md` is read
- **THEN** its structure tree lists the two provider modules, `common/envelope/`, the ocean-health folders and `RowDataTable`, its "E2E never reaches live providers" note covers the Copernicus and NOAA LSA fixture routes, and its recipe mentions sectioned pages for multi-provider categories

### Requirement: Data source docs and roadmap matrix are updated

`docs/data-sources/ocean-health.md` and the ocean-health row of the `ROADMAP.md` coverage matrix SHALL name the providers actually used.

#### Scenario: Data source doc

- **WHEN** `docs/data-sources/ocean-health.md` is read
- **THEN** it lists Copernicus Climate Pulse, the four OWID charts and NOAA LSA as in use, notes that OWID `sea-level` stops at 2020-Q4 and `coral-bleaching-events` at 2016, and marks the FAO fish-stock charts (CC BY-NC-SA) and Sea Around Us (CC BY-NC) as not commercial-safe

#### Scenario: Roadmap matrix row

- **WHEN** the provider coverage matrix of `ROADMAP.md` is read
- **THEN** the ocean-health row names the three providers used and the initial metrics, in the document's language, with no item IDs added

#### Scenario: Other docs

- **WHEN** `README.md`, `apps/web/README.md` and `docs/data-sources/*` are read
- **THEN** any list of live categories, providers or data sources includes the new ones, cross-links stay valid, and `CHANGELOG.md` is untouched
