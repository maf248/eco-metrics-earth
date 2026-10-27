## ADDED Requirements

### Requirement: Energy sources fetch built on the helper

`getEnergySources()` in `apps/web/src/lib/energySources.ts` (server-only) SHALL call `fetchPayloadFromBff` with `path: '/energy-sources'`, `label: 'Energy sources data'` and a guard that accepts only an `EnergySourcesData` for which the shared year-aligned guard passes (numeric non-inverted `startYear`/`endYear`, non-empty entities including World, string `code` and `name`, `iso2` string or `null`), `unit` and `dataset.name`/`dataset.version` are strings, `origin` is a valid `DataSourceOrigin`, and every entity has a `generation` object holding, for each id in `ENERGY_SOURCE_IDS`, an array of numbers or `null` of length `endYear - startYear + 1`. Shares are not part of the payload, so the guard neither requires nor reads them. It SHALL resolve with `{ data, meta }`.

#### Scenario: Valid payload

- **GIVEN** the BFF returns a valid `EnergySourcesData` with `meta`
- **WHEN** `getEnergySources()` runs
- **THEN** it resolves with `data` and `meta.source`

#### Scenario: Invalid shapes are rejected

- **GIVEN** an entity whose `generation.coal` length differs from `endYear - startYear + 1`, or whose `generation` lacks `solar`, or a payload without `origin` or with a non-string `unit`
- **WHEN** `getEnergySources()` runs
- **THEN** it throws `Energy sources data could not be fetched from the BFF`

#### Scenario: BFF 502 is a failed attempt

- **GIVEN** the BFF answers `502` with the error body to both attempts
- **WHEN** `getEnergySources()` runs
- **THEN** exactly 2 requests are made, one `console.error` is logged and the same error is thrown
