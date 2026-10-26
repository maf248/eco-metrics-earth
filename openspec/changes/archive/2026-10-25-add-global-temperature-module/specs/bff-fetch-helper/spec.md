## ADDED Requirements

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
