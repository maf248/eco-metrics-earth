## ADDED Requirements

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

`OwidModule` SHALL provide and export `OwidProviderStatus`, decorated with `@DataSourceContributor()`, as the only place that builds the OWID `LiveDataSource`. Category modules SHALL call `registerCategory(category)` once and `recordProviderUpdate(updatedAt)` after each successful retrieval. `getDataSources()` SHALL return `[]` when no category has registered; otherwise one `{ kind: 'provider', source }` with `id: 'owid'`, `provider`, `license` and `sourceUrl` from `OWID_PUBLISHER`, a `description`, `categories` (registered categories, sorted, de-duplicated), and `lastUpdated`/`lastUpdatedBasis`: the latest recorded provider timestamp with basis `'provider'`, or, when none has been recorded in this process, the status service's creation time with basis `'retrieval'`. `getDataSources()` SHALL NOT perform any network call (the catalog is collected at application bootstrap). Two or more categories registering SHALL produce a single `owid` entry, never a duplicate id.

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
