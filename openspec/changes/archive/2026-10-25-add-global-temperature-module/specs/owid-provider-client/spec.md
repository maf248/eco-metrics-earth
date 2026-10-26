## ADDED Requirements

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

## MODIFIED Requirements

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
