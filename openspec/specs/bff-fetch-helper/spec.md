# bff-fetch-helper Specification

## Purpose

Generic server-side BFF fetch with cold-start retry, shape validation and daily caching, used by every BFF-backed page.

## Requirements

### Requirement: Generic BFF fetch helper

The web app SHALL provide `fetchFromBff<T>({ path, label, isData })` in `apps/web/src/lib/bffFetch.ts`, the single implementation of server-side BFF reads. It SHALL request `${apiBaseUrl()}${path}` with the headers from `internalApiHeaders()`, `next: { revalidate: 86400 }` and a fresh `AbortSignal.timeout(10000)` per attempt; make at most 2 attempts with no delay; treat a network error, timeout, non-2xx status, malformed JSON, a payload that is not `{ success: true, data }`, or a `data` value rejected by the `isData` guard as a failed attempt; resolve with the validated `data`; and, when every attempt fails, log exactly one `console.error` (never the headers or the API key) and throw `Error(`${label} could not be fetched from the BFF`, { cause: lastError })`. The module SHALL be server-only.

#### Scenario: Success on the first attempt

- **GIVEN** the BFF responds `{ success: true, data: D }` and `isData(D)` is true
- **WHEN** `fetchFromBff` runs
- **THEN** it resolves with `D` after exactly one request and logs nothing

#### Scenario: Cold start recovered by the retry

- **GIVEN** the first attempt times out and the second succeeds
- **WHEN** `fetchFromBff` runs
- **THEN** it resolves after two requests, each with its own timeout signal, and logs nothing

#### Scenario: Every failure mode counts as a failed attempt

- **GIVEN** both attempts fail by network error, HTTP 500, invalid JSON, `{ success: false }`, or `data` rejected by `isData`
- **WHEN** `fetchFromBff` runs
- **THEN** exactly 2 requests are made, one `console.error` is logged, and `Error('<label> could not be fetched from the BFF')` is thrown with the last failure as `cause`

#### Scenario: Request options

- **WHEN** `fetchFromBff` issues a request with `INTERNAL_API_KEY` set
- **THEN** the init includes `X-Internal-Api-Key`, `next: { revalidate: 86400 }` and an `AbortSignal`
- **AND** with the key unset no `X-Internal-Api-Key` header is sent

#### Scenario: The key is never logged

- **GIVEN** `INTERNAL_API_KEY` set and both attempts failing
- **WHEN** the logged arguments are inspected
- **THEN** they do not contain the key value

### Requirement: Water-footprint fetch migrated without behavior change

`getWaterFootprintProducts()` SHALL be implemented on top of `fetchFromBff` (`path: '/water-footprint/products'`, `label: 'Water footprint data'`, guard `Array.isArray`), keeping its signature, retry behavior and error message unchanged. The final-failure log line is built from the helper's `label`, so its text becomes `Water footprint data fetch failed after 2 attempts` (log text is not a contract).

#### Scenario: Existing behavior preserved

- **WHEN** the existing `waterFootprint.test.ts` suite runs, with only its log-text assertion updated to the label-based wording
- **THEN** it passes

#### Scenario: Error message unchanged

- **GIVEN** both attempts fail
- **WHEN** `getWaterFootprintProducts()` runs
- **THEN** it rejects with `Water footprint data could not be fetched from the BFF`

### Requirement: Data sources fetch built on the helper

`getDataSources()` in `apps/web/src/lib/dataSources.ts` SHALL call `fetchFromBff` with `path: '/data-sources'`, `label: 'Data sources'` and a guard that accepts only an object whose `providers` and `datasets` are arrays, returning `DataSourcesCatalog`.

#### Scenario: Valid catalog

- **GIVEN** the BFF returns `{ success: true, data: { providers: [], datasets: [] } }`
- **WHEN** `getDataSources()` runs
- **THEN** it resolves with that catalog

#### Scenario: Invalid catalog shape

- **GIVEN** `data` is `[]`, `null`, or an object missing `datasets`
- **WHEN** `getDataSources()` runs
- **THEN** it throws `Data sources could not be fetched from the BFF`

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

### Requirement: Envelope fetch with required meta

`apps/web/src/lib/bffFetch.ts` SHALL export `fetchPayloadFromBff<T>({ path, label, isData })` resolving with `{ data: T; meta: ApiResponseMeta }`. It SHALL call `fetchEnvelopeFromBff` with `requireMeta: true` and, as a type-narrowing safety net, throw `Error('<label> could not be fetched from the BFF')` if `meta` is nevertheless absent. The module stays `server-only`. `getCo2Emissions` and `getGlobalTemperature` SHALL be implemented on it, replacing their local copy of that check, with unchanged behavior and error text.

#### Scenario: Data and meta are returned

- **GIVEN** the BFF responds `{ success: true, data: D, meta: { source: S, fetchedAt: F } }` and `isData(D)` is true
- **WHEN** `fetchPayloadFromBff` runs
- **THEN** it resolves with `{ data: D, meta: { source: S, fetchedAt: F } }` after one request

#### Scenario: Missing meta fails

- **GIVEN** the BFF responds `{ success: true, data: D }` to both attempts
- **WHEN** `fetchPayloadFromBff` runs
- **THEN** exactly 2 requests are made, one `console.error` is logged and `Error('<label> could not be fetched from the BFF')` is thrown

#### Scenario: CO2 behavior is unchanged

- **WHEN** the existing `co2Emissions` suite runs
- **THEN** it passes with the same assertions

### Requirement: Global temperature fetch built on the helper

`getGlobalTemperature()` in `apps/web/src/lib/globalTemperature.ts` (server-only) SHALL call `fetchPayloadFromBff` with `path: '/global-temperature'`, `label: 'Global temperature data'` and a guard that accepts only a `GlobalTemperatureData` for which the shared year-aligned guard passes with the measure key `anomaly`, `unit` is a string, `baseline` has numeric `startYear <= endYear`, `dataset` has string `name` and `version`, `origin` is a valid `DataSourceOrigin`, and `global` has numeric `startYear <= endYear`, a `baseline`, `dataset`, `origin`, and `mean`, `lower` and `upper` arrays of numbers or `null` of length `endYear - startYear + 1`. It SHALL resolve with `{ data, meta }`.

#### Scenario: Valid payload

- **GIVEN** the BFF returns a valid `GlobalTemperatureData` with `meta`
- **WHEN** `getGlobalTemperature()` runs
- **THEN** it resolves with `data` and `meta.source`

#### Scenario: Misaligned arrays are rejected

- **GIVEN** an entity whose `anomaly` length differs from `endYear - startYear + 1`
- **WHEN** `getGlobalTemperature()` runs
- **THEN** it throws `Global temperature data could not be fetched from the BFF`

#### Scenario: Missing baseline or origin is rejected

- **GIVEN** a payload without `baseline`, without `origin.notice`, without `global`, or whose `global.lower` length differs from `global.endYear - global.startYear + 1`
- **WHEN** `getGlobalTemperature()` runs
- **THEN** it throws the same error

#### Scenario: BFF 502 is a failed attempt

- **GIVEN** the BFF answers `502` with the error body to both attempts
- **WHEN** `getGlobalTemperature()` runs
- **THEN** it makes exactly 2 requests, logs one error and throws

### Requirement: A shape mismatch retries past the fetch Data Cache

Next's fetch Data Cache outlives deployments (and dev restarts), so a cached BFF response can have been written under an older payload contract. `fetchEnvelopeFromBff` SHALL treat a response that fails the shape guard or lacks a required `meta` as a shape mismatch, and the next attempt SHALL be made with `cache: 'no-store'` (and without `next.revalidate`) so it reads the BFF directly instead of the same cached entry. After any other failure (HTTP error, network error, timeout) the retry SHALL keep `next: { revalidate: 86400 }`. Two failed attempts still throw `Error('<label> could not be fetched from the BFF')` and log once. The BFF contract changes ship API first, then web.

#### Scenario: Stale-shaped first response heals on the retry

- **GIVEN** a first response that fails the shape guard and a valid second response
- **WHEN** `fetchEnvelopeFromBff` runs
- **THEN** the second request is made with `cache: 'no-store'` and no `next`, and the call resolves with the valid data

#### Scenario: Missing meta is a shape mismatch

- **GIVEN** `requireMeta: true` and a first response without `meta`
- **WHEN** the retry is made
- **THEN** it uses `cache: 'no-store'`

#### Scenario: Transport failures keep the Data Cache

- **GIVEN** a first attempt that fails with an HTTP error or a network error
- **WHEN** the retry is made
- **THEN** it keeps `next: { revalidate: 86400 }` and no `cache` option

#### Scenario: Two shape failures still throw

- **GIVEN** two responses that fail the shape guard
- **WHEN** `fetchEnvelopeFromBff` runs
- **THEN** exactly 2 requests are made, one error is logged and the labelled error is thrown

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
