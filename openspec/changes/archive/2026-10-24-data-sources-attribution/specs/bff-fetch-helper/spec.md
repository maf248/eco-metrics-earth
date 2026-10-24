## ADDED Requirements

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
