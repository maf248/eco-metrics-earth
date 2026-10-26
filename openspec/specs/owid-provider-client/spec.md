# owid-provider-client Specification

## Purpose

The Our World in Data (OWID) provider client: both consumption modes (API v1 JSON and filtered Grapher CSV), explicit parameter validation, server-side CSV parsing into MetricSeries, a typed error contract, and fixture-based tests with zero network calls.

## Requirements

### Requirement: OwidClient service with both OWID consumption modes

`OwidClient` — an `@Injectable()` service in `apps/api/src/modules/providers/owid/`, registered and exported by `OwidModule` — SHALL provide both consumption modes validated in the Postman collection:

- **API v1 JSON**: `getIndicatorData(indicatorId)` SHALL request `GET {OWID_API_BASE_URL}/indicators/{id}.data.json` and return a validated `OwidIndicatorData` — the upstream columnar payload (`years`, `entities`, `values` as parallel arrays of equal length; each value a finite number or null) plus the requested `indicatorId`. `getIndicatorMetadata(indicatorId)` SHALL request `GET {OWID_API_BASE_URL}/indicators/{id}.metadata.json` and return a validated `OwidIndicatorMetadata` subset — indicator id, name, unit, shortUnit, dataset name, dataset version, timespan, `updatedAt`, and the entity dimension entries `{ id, name, code }`. Unknown extra upstream fields SHALL be ignored.
- **Grapher CSV**: `getGrapherSeries(slug, options?)` SHALL request `GET {OWID_GRAPHER_BASE_URL}/{slug}.csv?v=1&csvType=filtered&useColumnShortNames=true` plus the optional `country={codes joined by ~}` and `time={from}..{to}` parameters, and parse the CSV server-side into `MetricSeries[]`.

`csvType=filtered` SHALL be used (never `full`) because only the filtered mode applies the `country`/`time` parameters. Every method SHALL cache its parsed result under a namespaced key — `owid:indicator-data:{id}`, `owid:indicator-metadata:{id}`, `owid:grapher:{slug}:c={country joined by ~ | all}:t={from}..{to} | all}` — with the module's TTL, and SHALL return a deep copy of the cached payload. The Grapher cache entry SHALL hold the parsed table with every value column, and the `column` selection SHALL be applied on read, so calls differing only in `column` share one download and one cache entry. The `country` list SHALL be normalized (de-duplicated and sorted) for both the cache key and the request URL, and an empty list SHALL be treated as omitted, so equivalent selections share one download and one cache entry.

#### Scenario: getIndicatorData returns the validated payload

- **GIVEN** the fixture capture of `indicators/1146696.data.json`
- **WHEN** `getIndicatorData(1146696)` is called with the transport stubbed to return that fixture
- **THEN** the result carries `indicatorId: 1146696` and the `years`/`entities`/`values` arrays with equal lengths

#### Scenario: getIndicatorMetadata returns the attribution-relevant subset

- **GIVEN** the fixture capture of `indicators/1146696.metadata.json`
- **WHEN** `getIndicatorMetadata(1146696)` is called with the transport stubbed to return that fixture
- **THEN** the result carries the indicator name, unit, dataset name/version, timespan, `updatedAt`, and the entity dimension entries with `{ id, name, code }`

#### Scenario: getGrapherSeries parses CSV into per-entity series

- **GIVEN** the fixture capture of a filtered Grapher CSV with two entities and three years each
- **WHEN** `getGrapherSeries('co-emissions-per-capita', { country: ['ARG', 'USA'], timeRange: { from: 1990, to: 1992 } })` is called with the transport stubbed to return that fixture
- **THEN** the result is a `MetricSeries[]` with one series per entity code, each with points sorted ascending by year

#### Scenario: Second call within TTL does not fetch again

- **GIVEN** `getGrapherSeries` was called once with a given parameter set
- **WHEN** it is called again with the same parameters within the cache TTL
- **THEN** the cached payload (deep-copied) is returned and the transport is not invoked

#### Scenario: Different column selections share one download

- **GIVEN** `getGrapherSeries('temperature-anomaly', { column: 'near_surface_temperature_anomaly' })` was called once
- **WHEN** it is called again with the same `country`/`timeRange` and `column: 'near_surface_temperature_anomaly_lower'`, or with an unknown column, within the cache TTL
- **THEN** the transport is not invoked again, and the result maps the newly selected column (or an `OwidInvalidParameterError` lists the available columns)

#### Scenario: Equivalent country selections share one download

- **GIVEN** `getGrapherSeries(slug, { country: ['USA', 'ARG'] })` was called once
- **WHEN** it is called again with `{ country: ['ARG', 'USA', 'ARG'] }` within the cache TTL
- **THEN** the transport is not invoked again, and the original request URL carried `country=ARG~USA`

#### Scenario: Omitted country follows OWID's chart-default selection

- **WHEN** `getGrapherSeries(slug)` is called without `country`
- **THEN** the request URL contains no `country` parameter — OWID's chart-default entity selection then applies server-side

#### Scenario: Omitted timeRange returns all available years

- **WHEN** `getGrapherSeries(slug)` is called without `timeRange`
- **THEN** the request URL contains no `time` parameter — all available years for the selected entities are returned

### Requirement: Explicit parameter validation

`OwidClient` SHALL validate `slug`, `country`, `timeRange`, and `indicatorId` BEFORE any network call and throw `OwidInvalidParameterError` (with no request sent) for: a `slug` that is not a non-empty lowercase kebab string (`/^[a-z0-9-]+$/`); a `country` entry that is not an uppercase OWID entity code (`/^[A-Z0-9_]+$/`, with no `~` separator inside an entry); a `timeRange` whose `from`/`to` are not integers or whose `from` exceeds `to`; and an `indicatorId` that is not a positive integer. Because the set of valid value columns is only knowable from the CSV header, the `column` option SHALL be validated against the value columns of the parsed table (freshly fetched or cached) — never by an additional network call — throwing `OwidInvalidParameterError` listing the available columns when the selected column is absent from the header.

#### Scenario: Invalid slug throws before any fetch

- **WHEN** `getGrapherSeries('Bad_Slug!')` is called
- **THEN** an `OwidInvalidParameterError` is thrown and the transport is never invoked

#### Scenario: Invalid country code throws before any fetch

- **WHEN** `getGrapherSeries('co-emissions-per-capita', { country: ['arg'] })` is called
- **THEN** an `OwidInvalidParameterError` is thrown and the transport is never invoked

#### Scenario: Reversed time range throws

- **WHEN** `getGrapherSeries('co-emissions-per-capita', { timeRange: { from: 2020, to: 1990 } })` is called
- **THEN** an `OwidInvalidParameterError` is thrown and the transport is never invoked

#### Scenario: Non-positive indicator id throws

- **WHEN** `getIndicatorData(0)` is called
- **THEN** an `OwidInvalidParameterError` is thrown and the transport is never invoked

#### Scenario: Unknown column lists the available columns

- **GIVEN** a chart whose CSV header has the value columns `near_surface_temperature_anomaly` and `near_surface_temperature_anomaly_lower`
- **WHEN** `getGrapherSeries('temperature-anomaly', { column: 'wrong_column' })` is called
- **THEN** an `OwidInvalidParameterError` is thrown whose message lists the available value columns

### Requirement: Grapher CSV parsing to MetricSeries

The server-side parser (`parseGrapherCsv`) SHALL parse the Grapher filtered CSV — header `entity,code,year,` followed by one or more short-named value columns — as RFC 4180 (quoted fields with `""` escapes, commas inside quotes, CRLF or LF line endings) and SHALL: require the header to start with `entity,code,year` (otherwise `OwidParseError`); map empty value cells to `null`; skip rows with an empty `code`; group the remaining rows into one `MetricSeries` per entity code with points sorted ascending by year; and map exactly one value column to `MetricPoint.value`. When the header has two or more value columns and no `column` option selects one, it SHALL throw `OwidUnsupportedChartError` listing the available columns; when a `column` option is given, only that column is mapped.

#### Scenario: Fixture CSV becomes sorted per-entity series

- **GIVEN** the fixture CSV with rows for `ARG` (1990–1992) and `USA` (1990–1992)
- **WHEN** `parseGrapherCsv` runs on it
- **THEN** the result has one series per entity code, each with three points sorted ascending by year

#### Scenario: Quoted field containing a comma parses correctly

- **GIVEN** a CSV row whose entity name is quoted and contains a comma (e.g. `"Asia, excl. China"`)
- **WHEN** `parseGrapherCsv` runs on it
- **THEN** the entity name parses as a single field and the row's column count is unchanged

#### Scenario: CRLF line endings parse correctly

- **GIVEN** a CSV using `\r\n` line endings
- **WHEN** `parseGrapherCsv` runs on it
- **THEN** no `\r` residue leaks into any parsed field

#### Scenario: Empty value cell becomes null

- **GIVEN** a CSV row whose value cell is empty
- **WHEN** `parseGrapherCsv` runs on it
- **THEN** the corresponding `MetricPoint.value` is `null` and the year remains present

#### Scenario: Rows without a code are skipped

- **GIVEN** a CSV containing a row with an empty `code` field (a region aggregate)
- **WHEN** `parseGrapherCsv` runs on it
- **THEN** that row produces no series and no point — it cannot be addressed by entity code

#### Scenario: Multi-column chart without a column selection throws

- **GIVEN** the fixture capture of `temperature-anomaly` whose header has three value columns
- **WHEN** `getGrapherSeries('temperature-anomaly')` is called without a `column`
- **THEN** an `OwidUnsupportedChartError` is thrown whose message lists the three available value columns

#### Scenario: Multi-column chart with a column selection maps that column

- **GIVEN** the same fixture
- **WHEN** `getGrapherSeries('temperature-anomaly', { column: 'near_surface_temperature_anomaly' })` is called
- **THEN** the returned series map only the selected column's values

#### Scenario: Malformed CSV throws OwidParseError

- **GIVEN** a CSV whose header does not start with `entity,code,year`, or with an unterminated quote, or a ragged row
- **WHEN** `parseGrapherCsv` runs on it
- **THEN** an `OwidParseError` with a descriptive message is thrown — never a silently corrupted result

### Requirement: Typed error contract

`OwidClient` failures SHALL be typed: `OwidClientError` (base) with `OwidInvalidParameterError` (bad parameters — thrown before any network call, except `column`, which is validated against the CSV header of the fetched or cached table), `OwidParseError` (malformed CSV/JSON payload), and `OwidUnsupportedChartError` (no or ambiguous value-column selection). Transport failures SHALL propagate the `OutboundHttpError` hierarchy from the `api-data-layer` capability — `OutboundTimeoutError`, `OutboundNetworkError`, `OutboundHttpStatusError` — all carrying the request URL. All errors SHALL carry descriptive messages and preserve the underlying `cause` where one exists. The client performs no HTTP status mapping — the category controllers that consume it map these errors to `ApiResponse` error shapes through the existing global exception filter.

#### Scenario: Malformed JSON payload throws OwidParseError

- **GIVEN** the transport returns a 200 response whose body is not valid JSON for an indicator request
- **WHEN** `getIndicatorData(id)` is called
- **THEN** an `OwidParseError` naming the indicator id is thrown, carrying the underlying `SyntaxError` as its `cause`

#### Scenario: Upstream 404 propagates without retry

- **GIVEN** the transport resolves with status 404 for an unknown chart slug
- **WHEN** `getGrapherSeries('does-not-exist')` is called
- **THEN** an `OutboundHttpStatusError` carrying the URL and status 404 propagates, and the transport was invoked exactly once

#### Scenario: Timeout after retries propagates as OutboundTimeoutError

- **GIVEN** every transport attempt times out
- **WHEN** `getIndicatorData(id)` is called
- **THEN** an `OutboundTimeoutError` carrying the URL propagates after the bounded retries

#### Scenario: Error messages identify the resource

- **WHEN** any `OwidClient` or `OutboundHttpError` is thrown
- **THEN** its message names the chart slug or indicator id and the failing operation

### Requirement: Fixture-based tests with zero network calls

All `OwidClient` and parser tests SHALL run against static fixtures under `apps/api/__tests__/providers/owid/fixtures/`, derived from the endpoints validated in the Postman collection — captured once from the exact validated URLs during implementation, trimmed to representative entities/years, and committed as static data. The transport SHALL be stubbed via the `OUTBOUND_FETCH` token in every test: no test SHALL perform a network call, and the suite SHALL produce zero errors and zero warnings while holding the api coverage thresholds (80% statements/functions/lines).

#### Scenario: Fixtures cover both consumption modes

- **GIVEN** the committed fixture set
- **THEN** it includes at least one Grapher CSV (single-column), one multi-column Grapher CSV, one API v1 data capture, and one API v1 metadata capture

#### Scenario: No test reaches the network

- **WHEN** `npx nx test api` runs the `providers/owid` and `common/http` suites
- **THEN** every transport interaction goes through the `OUTBOUND_FETCH` stub — no test resolves a real URL

#### Scenario: Coverage thresholds hold

- **WHEN** `npx nx test api` completes
- **THEN** the api coverage thresholds (80% statements/functions/lines) hold with the new provider and transport code covered

### Requirement: OWID attribution defined once

The API SHALL define Our World in Data's attribution in exactly one place, `apps/api/src/common/publishers/publishers.ts` (pure constants, no Nest imports), re-exported by `apps/api/src/modules/providers/owid/owid.attribution.ts`: `OWID_PUBLISHER` = `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`. Every API consumer that needs OWID's name or license (the publisher resolver now; `meta.source` of live OWID responses later) SHALL import it from either path; the strings SHALL NOT be repeated elsewhere in `apps/api/src` or in `apps/web`.

#### Scenario: Publisher constant

- **WHEN** `OWID_PUBLISHER` is read
- **THEN** it equals `{ provider: 'Our World in Data', license: 'CC BY 4.0', sourceUrl: 'https://ourworldindata.org' }`

#### Scenario: No duplicate definition

- **WHEN** `apps/api/src` and `apps/web/src` are searched for the string `CC BY 4.0`
- **THEN** it appears only in `publishers.ts` (and tests)

#### Scenario: Importing the constant does not require OwidModule

- **WHEN** a module outside `providers/owid/` imports `owid.attribution.ts` or `publishers.ts`
- **THEN** no Nest provider from `OwidModule` is instantiated

### Requirement: OWID errors are provider errors

`OwidClientError` SHALL extend `ProviderError` (see `provider-failure-contract`) so that every OWID client failure is mapped to `502` by the global filter. Its subclasses, constructor signature, `withContext` behavior, messages and `cause` preservation SHALL be unchanged, and the client SHALL continue to perform no HTTP status mapping itself.

#### Scenario: OWID errors map to 502

- **GIVEN** a controller that lets an `OwidUnsupportedChartError` propagate
- **WHEN** it is called through the global pipeline
- **THEN** the response is `502` in the `ApiResponse` error format

#### Scenario: withContext keeps the class

- **WHEN** `withContext('OWID chart "x"')` is called on an `OwidParseError`
- **THEN** the result is an `OwidParseError` (and a `ProviderError`) whose cause is the original error

### Requirement: OWID is declared once as a live data source

`OwidModule` SHALL provide and export `OwidProviderStatus`, decorated with `@DataSourceContributor()`, as the only place that builds the OWID `LiveDataSource`. Category modules SHALL call `registerCategory(category, origins)` once, passing the static `DataSourceOrigin` constants of the upstream producers of their data (an empty list is allowed), and `recordProviderUpdate(updatedAt)` after each successful retrieval. `getDataSources()` SHALL return `[]` when no category has registered; otherwise one `{ kind: 'provider', source }` with `id: 'owid'`, `provider`, `license` and `sourceUrl` from `OWID_PUBLISHER`, a `description`, `categories` (registered categories, sorted, de-duplicated), `origins` (the registered origins, each with the sorted list of categories that registered it; an origin registered by several categories, identified by `producer` and `title`, appears once with all of them; ordered by `producer` then `title`), and `lastUpdated`/`lastUpdatedBasis`: the latest recorded provider timestamp with basis `'provider'`, or, when none has been recorded in this process, the status service's creation time with basis `'retrieval'`. `getDataSources()` SHALL NOT perform any network call (the catalog is collected at application bootstrap). Two or more categories registering SHALL produce a single `owid` entry, never a duplicate id.

#### Scenario: No category registered

- **GIVEN** `OwidModule` without any registered category
- **WHEN** `getDataSources()` is called
- **THEN** it returns `[]`

#### Scenario: One entry for several categories

- **GIVEN** `co2-emissions` and a second category registered
- **WHEN** the catalog is built through `DataSourcesService`
- **THEN** `providers` contains exactly one `owid` entry whose `categories` lists both, with no duplicate-id error

#### Scenario: Provider timestamp preferred

- **GIVEN** `recordProviderUpdate('2026-10-22T21:47:04.000Z')` was called
- **WHEN** `getDataSources()` is called
- **THEN** `lastUpdated` is `2026-10-22T21:47:04.000Z` and `lastUpdatedBasis` is `'provider'`

#### Scenario: Latest timestamp wins

- **GIVEN** `recordProviderUpdate` called with an older and then a newer timestamp, or in the opposite order
- **WHEN** `getDataSources()` is called
- **THEN** `lastUpdated` is the newer one in both cases

#### Scenario: Fallback before any retrieval

- **GIVEN** a registered category and no recorded update
- **WHEN** `getDataSources()` is called
- **THEN** `lastUpdatedBasis` is `'retrieval'` and `lastUpdated` is a valid ISO 8601 timestamp

#### Scenario: Attribution comes from the single definition

- **WHEN** the OWID entry is built
- **THEN** `provider`, `license` and `sourceUrl` equal `OWID_PUBLISHER` and no OWID name or license literal is added elsewhere in `apps/api/src`

#### Scenario: Origins are listed per category

- **GIVEN** `co2-emissions` registered with the Global Carbon Project origin and `global-temperature` registered with the ERA5 and HadCRUT5 origins
- **WHEN** `getDataSources()` is called
- **THEN** `origins` has three entries ordered by producer, each with its own category

#### Scenario: A shared origin is merged

- **GIVEN** two categories registering the same origin (same `producer` and `title`)
- **WHEN** `getDataSources()` is called
- **THEN** that origin appears once with both categories, sorted

#### Scenario: Registering without origins

- **GIVEN** a category registered with an empty origin list
- **WHEN** `getDataSources()` is called
- **THEN** `origins` is empty and no error is thrown

#### Scenario: Cataloging never calls the provider

- **WHEN** `getDataSources()` runs with a transport stub that fails on any call
- **THEN** it returns without invoking the stub

### Requirement: Grapher tab selection

`OwidGrapherSeriesOptions` SHALL accept an optional `tab` (`'chart' | 'map' | 'table'`). When set, `getGrapherSeries` SHALL append `tab=<tab>` to the request URL (after `useColumnShortNames=true` and before `country`/`time`) and SHALL include it in the cache key as `:tab=<tab>` appended to the existing key. When omitted, the request URL and the cache key SHALL be exactly what they were before this option existed, so existing callers and their cached entries are unchanged. A `tab` outside the allowed values SHALL throw `OwidInvalidParameterError` before any network call. The option exists because OWID answers `csvType=filtered` for the chart's default tab: for a chart that opens on its map tab (for example `annual-temperature-anomalies`) the `country` filter is ignored and only the map's years are returned for every entity, whereas `tab=chart` applies `country` and `time` as for a line chart.

#### Scenario: Tab appears in the URL

- **WHEN** `getGrapherSeries('annual-temperature-anomalies', { tab: 'chart', country: ['ARG'], timeRange: { from: 1950, to: 2025 } })` is called
- **THEN** the request URL is `{OWID_GRAPHER_BASE_URL}/annual-temperature-anomalies.csv?v=1&csvType=filtered&useColumnShortNames=true&tab=chart&country=ARG&time=1950..2025`

#### Scenario: Omitted tab leaves URL and key unchanged

- **WHEN** `getGrapherSeries('co-emissions-per-capita', { country: ['ARG'] })` is called
- **THEN** the request URL contains no `tab` parameter and the cache key is `owid:grapher:co-emissions-per-capita:c=ARG:t=all`

#### Scenario: Tab is part of the cache key

- **GIVEN** `getGrapherSeries(slug, { tab: 'chart' })` was called once
- **WHEN** it is called again without `tab` within the cache TTL
- **THEN** the transport is invoked again (a different cache entry), and a repeat call with `tab: 'chart'` does not invoke it

#### Scenario: Invalid tab throws before any fetch

- **WHEN** `getGrapherSeries(slug, { tab: 'bogus' })` is called
- **THEN** an `OwidInvalidParameterError` is thrown and the transport is never invoked

### Requirement: Indicator metadata carries the short description

`getIndicatorMetadata` SHALL include `descriptionShort` in the validated `OwidIndicatorMetadata` when the upstream response has it as a string, and `null` when it is absent. A present but non-string value SHALL throw `OwidParseError`. Existing required fields, error behavior and caching are unchanged, and the committed fixtures of existing suites (which may lack the field) SHALL still parse.

#### Scenario: Description present

- **GIVEN** a metadata fixture with `descriptionShort` set
- **WHEN** `getIndicatorMetadata` is called
- **THEN** the result carries that text as `descriptionShort`

#### Scenario: Description absent

- **GIVEN** a metadata fixture without `descriptionShort`
- **WHEN** `getIndicatorMetadata` is called
- **THEN** the result has `descriptionShort: null` and no error is thrown

#### Scenario: Description of the wrong type

- **GIVEN** a metadata fixture whose `descriptionShort` is a number
- **WHEN** `getIndicatorMetadata` is called
- **THEN** an `OwidParseError` is thrown

#### Scenario: Description explicitly null

- **GIVEN** a metadata fixture whose `descriptionShort` is JSON `null`
- **WHEN** `getIndicatorMetadata` is called
- **THEN** the result has `descriptionShort: null` and no error is thrown

#### Scenario: Entities without a code

- **GIVEN** a metadata fixture whose entity list includes an entity with `code: null` (regional aggregates have none)
- **WHEN** `getIndicatorMetadata` is called
- **THEN** it parses and the entity keeps `code: null`; an entity with no `code` property at all, or a non-string non-null code, throws `OwidParseError`

#### Scenario: Existing suites keep passing

- **WHEN** the existing `providers/owid` suites run
- **THEN** they pass with unchanged assertions, except those that compare a whole metadata object, which gain `descriptionShort: null`
