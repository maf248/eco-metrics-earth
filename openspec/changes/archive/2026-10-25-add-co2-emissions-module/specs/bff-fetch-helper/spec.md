## ADDED Requirements

### Requirement: Envelope variant exposing meta

`apps/web/src/lib/bffFetch.ts` SHALL export `fetchEnvelopeFromBff<T>({ path, label, isData, requireMeta? })` resolving with `{ data: T; meta?: ApiResponseMeta }`, applying exactly the request options, retry, failure and logging rules of `fetchFromBff`. When `requireMeta` is true, a payload whose `meta` lacks a `source` object with string `provider`, `license`, `sourceUrl` and `lastUpdated`, or a string `fetchedAt`, SHALL count as a failed attempt. `fetchFromBff` SHALL be implemented on top of `fetchEnvelopeFromBff` and return its `data`, with no change of behavior, signature, error message or log text for any existing caller.

#### Scenario: Meta is returned

- **GIVEN** the BFF responds `{ success: true, data: D, meta: { source: S, fetchedAt: F } }` and `isData(D)` is true
- **WHEN** `fetchEnvelopeFromBff` runs with `requireMeta: true`
- **THEN** it resolves with `{ data: D, meta: { source: S, fetchedAt: F } }` after one request

#### Scenario: Missing meta fails the attempt when required

- **GIVEN** the BFF responds `{ success: true, data: D }` to both attempts
- **WHEN** `fetchEnvelopeFromBff` runs with `requireMeta: true`
- **THEN** exactly 2 requests are made, one `console.error` is logged and `Error('<label> could not be fetched from the BFF')` is thrown

#### Scenario: Meta is optional by default

- **GIVEN** the BFF responds `{ success: true, data: D }`
- **WHEN** `fetchEnvelopeFromBff` runs without `requireMeta`
- **THEN** it resolves with `{ data: D, meta: undefined }`

#### Scenario: Existing callers are unaffected

- **WHEN** the existing `bffFetch`, `waterFootprint` and `dataSources` suites run unmodified
- **THEN** they pass

### Requirement: CO2 emissions fetch built on the helper

`getCo2Emissions()` in `apps/web/src/lib/co2Emissions.ts` SHALL call `fetchEnvelopeFromBff` with `path: '/co2-emissions'`, `label: 'CO2 emissions data'`, `requireMeta: true` and a guard accepting only a `Co2EmissionsData` whose `entities` is a non-empty array, that contains the World entity (`code: 'OWID_WRL'`), whose every entity has `total` and `perCapita` arrays of length `endYear - startYear + 1`, and whose `units` and `dataset` are present. It SHALL resolve with `{ data, meta }` and be server-only.

#### Scenario: Valid payload

- **GIVEN** the BFF returns a valid `Co2EmissionsData` with `meta`
- **WHEN** `getCo2Emissions()` runs
- **THEN** it resolves with `data` and `meta.source`

#### Scenario: Misaligned arrays are rejected

- **GIVEN** an entity whose `total` length differs from `endYear - startYear + 1`
- **WHEN** `getCo2Emissions()` runs
- **THEN** it throws `CO2 emissions data could not be fetched from the BFF`

#### Scenario: World missing is rejected

- **GIVEN** a payload with entities but no `OWID_WRL`
- **WHEN** `getCo2Emissions()` runs
- **THEN** it throws `CO2 emissions data could not be fetched from the BFF`

#### Scenario: BFF 502 is a failed attempt

- **GIVEN** the BFF answers `502` with the error body to both attempts
- **WHEN** `getCo2Emissions()` runs
- **THEN** it makes exactly 2 requests, logs one error and throws
