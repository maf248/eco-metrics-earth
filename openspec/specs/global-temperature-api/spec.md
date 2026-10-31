# global-temperature-api Specification

## Purpose

Serve annual temperature anomalies for every country plus World (ERA5, 1991–2020 baseline) and the long-run global series (HadCRUT5, 1861–1890 baseline, 95% interval) from OWID in one BFF response, crediting each data producer.

## Requirements

### Requirement: Global temperature endpoint serves every country and World in one response

`GlobalTemperatureController` (registered by `GlobalTemperatureModule`, imported by `AppModule`) SHALL expose `GET /api/v1/global-temperature`, taking no path or query parameters, and returning `ApiResponse<GlobalTemperatureData>` as `{ success: true, status: 200, data, meta }`. `data` SHALL contain `startYear` (1940), `endYear` (the latest year with at least one value), `unit` (`'°C'`), `baseline` (`{ startYear: 1991, endYear: 2020 }`), `dataset` (`{ name, version }` taken from the OWID indicator metadata), `origin` (the upstream credit, see "Upstream origin and its credit line") and `entities`. The endpoint SHALL be documented in Swagger under the `'Global Temperature'` tag (`@ApiOperation`, `@ApiOkResponse`, `@ApiBadGatewayResponse`) and SHALL go through the same global pipeline (prefix, throttling, exception filter) as every other endpoint. Because it accepts no parameters there is no DTO to validate; a request carrying unknown query parameters SHALL be served as if they were absent. There SHALL be no per-country endpoint.

#### Scenario: Healthy provider

- **GIVEN** the OWID transport stubbed with the committed fixtures
- **WHEN** `GET /api/v1/global-temperature` is called
- **THEN** the response is `200` with `success: true` and `status: 200`
- **AND** `data.startYear` is 1940 and `data.endYear` is the latest year present in the fixtures
- **AND** `data.entities` contains the World entity and the fixture countries

#### Scenario: One request serves the whole page

- **WHEN** the endpoint is called
- **THEN** it returns every entity in that single response and no per-country endpoint exists

#### Scenario: Swagger documentation

- **WHEN** the OpenAPI document is generated
- **THEN** `GET /api/v1/global-temperature` appears under the `Global Temperature` tag with its `200` and `502` responses

#### Scenario: Unknown query parameters are ignored

- **WHEN** `GET /api/v1/global-temperature?country=ARG` is called
- **THEN** the response is identical to the one without the parameter

### Requirement: Annual anomaly per entity in a compact year-aligned payload

Each entity SHALL be `{ code, iso2, name, anomaly }` where `anomaly` is an array of length `endYear - startYear + 1`, index `i` holding the temperature anomaly for year `startYear + i` in degrees Celsius relative to the `baseline` period, rounded to 2 decimals, and `null` where the source reports no value. A value that rounds to zero SHALL be `0`, never `-0`. The wire types `GlobalTemperatureData` and `GlobalTemperatureEntity` SHALL be defined in `@eco-metrics/shared`. The payload for the real OWID data (195 entities, 1940-2025) SHALL stay at or below about 45 KB gzipped including the global block (about 29 KB measured for the entities).

#### Scenario: Arrays align with the year range

- **GIVEN** fixtures covering three consecutive years (1940-1942) where one entity has no value in the middle year
- **WHEN** the response is built
- **THEN** every entity's `anomaly` has length 3
- **AND** that entity's `anomaly` is `[a, null, c]`

#### Scenario: Values are rounded to two decimals

- **GIVEN** an OWID value of `0.5916424`
- **WHEN** the response is built
- **THEN** the entity's value is `0.59`

#### Scenario: Negative anomalies are kept

- **GIVEN** an OWID value of `-0.84749717`
- **WHEN** the response is built
- **THEN** the entity's value is `-0.85`

#### Scenario: No negative zero

- **GIVEN** an OWID value of `-0.001`
- **WHEN** the response is built
- **THEN** the entity's value is `0` and `Object.is(value, -0)` is false

#### Scenario: Entities with no data at all are dropped

- **GIVEN** an entity whose values are `null` in every year
- **WHEN** the response is built
- **THEN** it is not part of `data.entities`

#### Scenario: Payload budget

- **GIVEN** the full real dataset shape (about 195 entities x 86 years, rounded as above)
- **WHEN** the serialized `data` is gzipped
- **THEN** it is about 29 KB (entities) and the whole `data`, including the global block, is at most about 45 KB

### Requirement: The service requests the per-country chart explicitly, completed years only

The service SHALL call `OwidClient.getGrapherSeries('annual-temperature-anomalies', options)` with `column: 'temperature_anomaly'`, `tab: 'chart'`, `country` equal to the shared crosswalk allowlist (every ISO 3166-1 alpha-3 code of `ISO3_TO_ISO2`, plus `OWID_WRL` and `OWID_KOS`) and `timeRange = { from: 1940, to: <previous UTC calendar year> }`. The upper bound is the previous year so a partial current year (whose annual mean covers only some months) is never served as an annual value. The explicit `tab: 'chart'` is mandatory: this chart opens on its map tab, where OWID ignores `country` and returns only the map's years for every entity. Entities with any other code (continents, regions, the `(NIAID)` sea and continent regions, which have an empty code) SHALL NOT appear in the response, even if the provider returns them. Each entity SHALL carry `iso2` from the crosswalk: the ISO alpha-2 code for countries, `XK` for Kosovo and `null` for World. `entities` SHALL be ordered World first, then countries by `name` (English collation), deterministically. Countries the provider has no row for (for example Antarctica) SHALL simply be absent.

#### Scenario: Request uses the chart tab and an explicit allowlist

- **WHEN** the service calls the OWID client
- **THEN** the `tab` option is `chart`, the `country` option equals the crosswalk allowlist, `timeRange.from` is 1940 and `timeRange.to` is the previous UTC year
- **AND** the recorded request URL contains `tab=chart` and a `country` parameter

#### Scenario: A partial current year is not requested

- **GIVEN** the current UTC year is 2026
- **WHEN** the service builds the request
- **THEN** `timeRange.to` is 2025

#### Scenario: Aggregates and unknown codes are excluded

- **GIVEN** a provider response that also contains `OWID_EUR` and an alpha-3 code that is not in the crosswalk
- **WHEN** the response is built
- **THEN** neither appears in `data.entities` and the request still succeeds

#### Scenario: World and countries carry flag codes

- **GIVEN** fixture entities `OWID_WRL`, `ARG`, `USA` and `OWID_KOS`
- **WHEN** the response is built
- **THEN** their `iso2` values are `null`, `AR`, `US` and `XK`, and World is the first element

#### Scenario: Ordering is deterministic

- **WHEN** the response is built twice from the same fixtures
- **THEN** both results are deeply equal and countries after World are sorted by name

### Requirement: Attribution metadata on the response

The response SHALL carry `meta.source` equal to the OWID publisher definition (`OWID_PUBLISHER`, never repeated as literals) plus `lastUpdated`, the `updatedAt` of the OWID indicator metadata for indicator `1325256` (via `OwidClient.getIndicatorMetadata`), and `meta.fetchedAt` as the ISO 8601 time the response was assembled. `data.dataset` SHALL carry the indicator metadata's `datasetName` and `datasetVersion`. The envelope SHALL be assembled by the shared OWID envelope helper (see `year-aligned-country-series`), not by category-specific code.

#### Scenario: Source attribution from the single definition

- **WHEN** the endpoint responds
- **THEN** `meta.source.provider`, `license` and `sourceUrl` equal the values of `OWID_PUBLISHER`

#### Scenario: Provider timestamp is used

- **GIVEN** an indicator metadata fixture with `updatedAt` `2026-10-13T08:42:32.000Z`
- **WHEN** the endpoint responds
- **THEN** `meta.source.lastUpdated` is `2026-10-13T08:42:32.000Z`

#### Scenario: Dataset identity

- **GIVEN** a metadata fixture with `datasetName` `Annual surface temperatures and anomalies by country` and `datasetVersion` `2026-10-12`
- **WHEN** the endpoint responds
- **THEN** `data.dataset` equals `{ name: 'Annual surface temperatures and anomalies by country', version: '2026-10-12' }`

### Requirement: Upstream origins are declared once and served in the payload

The measurements are not OWID's: the per-country series comes from the Copernicus Climate Change Service (ERA5) and the long-run global series from the Met Office Hadley Centre (HadCRUT5). Their origins SHALL be defined once, as static `DataSourceOrigin` constants in the module (no OWID call), and those same constants SHALL be (a) passed to `OwidProviderStatus.registerCategory` so the catalog lists them (see `owid-provider-client`) and (b) the only source of `data.origin` (ERA5) and `data.global.origin` (HadCRUT5) in the payload. No origin string SHALL be written anywhere else in `apps/api/src`.

- ERA5: `producer` `Copernicus Climate Change Service (C3S)`, `title` `ERA5 monthly averaged data on single levels from 1940 to present`, `url` `https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means`, `license` `{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }`, `notice` `Contains modified Copernicus Climate Change Service information`, a `citation` with the dataset DOI `10.24381/cds.f17050d7`, and the `disclaimer` `Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains.`
- HadCRUT5: `producer` `Met Office Hadley Centre`, `title` `HadCRUT5`, `url` `https://www.metoffice.gov.uk/hadobs/hadcrut5/`, `license` `{ name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/' }`, `notice` `© British Crown Copyright, Met Office, provided under the Open Government Licence v3.0`, and `citation` `Morice et al. (2021), Journal of Geophysical Research: Atmospheres, 126, e2019JD032361, doi:10.1029/2019JD032361`.

In the payload the ERA5 `notice` SHALL be completed with the four-digit year at the start of the ERA5 dataset version in parentheses (`Contains modified Copernicus Climate Change Service information (2026)`); the catalog lists the notice without a year because it is built without calling the provider. The service SHALL throw `ProviderDataError` when the ERA5 dataset version does not start with a four-digit year.

#### Scenario: Notice carries the dataset year

- **GIVEN** a dataset version `2026-10-12`
- **WHEN** the response is built
- **THEN** `data.origin.notice` is `Contains modified Copernicus Climate Change Service information (2026)`

#### Scenario: Unusable dataset version

- **GIVEN** a metadata fixture whose `datasetVersion` is `latest`
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: Licenses are Creative Commons and Open Government

- **WHEN** the endpoint responds
- **THEN** `data.origin.license` is `{ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }` and `data.global.origin.license.name` is `Open Government Licence v3.0`

#### Scenario: One definition feeds payload and catalog

- **WHEN** the payload origins and the catalog origins for `global-temperature` are compared
- **THEN** they come from the same constants and differ only by the year appended to the ERA5 notice in the payload

#### Scenario: Disclaimer and citation are kept

- **WHEN** the endpoint responds
- **THEN** `data.origin.disclaimer` is the Copernicus no-liability sentence and `data.global.origin.citation` names Morice et al. (2021) with its DOI

### Requirement: The baseline is verified against the provider, not assumed

`data.baseline` is `{ startYear: 1991, endYear: 2020 }`, defined once as constants. Because the baseline is not machine-readable in the provider's data, the service SHALL check that the indicator's short description (`descriptionShort`, parsed by `OwidClient.getIndicatorMetadata`) mentions the baseline period written `1991-2020` (hyphen or en dash) and SHALL throw `ProviderDataError` when it does not, so a provider change of the reference period becomes a `502` plus an error log instead of silently mislabelled data.

#### Scenario: Baseline matches the provider description

- **GIVEN** a metadata fixture whose description says `...from the 1991-2020 mean...`
- **WHEN** the endpoint is called
- **THEN** the response is `200` and `data.baseline` is `{ startYear: 1991, endYear: 2020 }`

#### Scenario: The provider changes the baseline

- **GIVEN** a metadata fixture whose description says `...from the 2001-2030 mean...`
- **WHEN** the endpoint is called
- **THEN** the response is `502` and no `data` is returned

#### Scenario: Description missing

- **GIVEN** a metadata fixture without a short description
- **WHEN** the endpoint is called
- **THEN** the response is `502`

### Requirement: Provider failures and unusable data become 502

When the OWID client or transport throws and the BFF holds no stored snapshot for the category (see `provider-snapshot-fallback`), the endpoint SHALL respond `502` in the `ApiResponse` error format (see `provider-failure-contract`); when it holds one, it SHALL respond `200` with the stored payload and `meta.stale: true`. When the provider answers but the content is unusable (no `OWID_WRL` entity, no rows, no value in any year, or a World series with fewer than two years of values, which is what a response ignoring the chart tab looks like) the service SHALL throw `ProviderDataError`, handled the same way. The endpoint SHALL NOT return partial data.

#### Scenario: Transport failure

- **GIVEN** the OWID transport stub failing every attempt with a 503 and no stored snapshot
- **WHEN** `GET /api/v1/global-temperature` is called
- **THEN** the response is `502` with `success: false`

#### Scenario: Malformed CSV

- **GIVEN** a stub returning a CSV whose header does not start with `entity,code,year` and no stored snapshot
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: World missing

- **GIVEN** fixtures that contain countries but no `OWID_WRL` and no stored snapshot
- **WHEN** the endpoint is called
- **THEN** the response is `502` and no `data` is returned

#### Scenario: Map-tab response is rejected

- **GIVEN** a stub returning one row per entity (the map-tab shape), including World, and no stored snapshot
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: Transport failure with a stored snapshot

- **GIVEN** the OWID transport stub failing every attempt and a stored snapshot of this category
- **WHEN** the endpoint is called
- **THEN** the response is `200` with the stored `data`, `meta.stale: true` and the snapshot's `meta.fetchedAt`

### Requirement: The module registers with the single OWID data source and the existing health check

`GlobalTemperatureService` SHALL register the category `global-temperature` with `OwidProviderStatus` on construction, passing its two static origins (ERA5 and HadCRUT5), and record the provider timestamp after each successful assembly, so that the OWID live data source lists `global-temperature` and its origins next to `co2-emissions`. The service SHALL NOT build a data-source entry itself. The dependencies health check SHALL stay one `owid` indicator, unchanged.

#### Scenario: Catalog lists both categories under one OWID entry

- **GIVEN** the application with `Co2EmissionsModule` and `GlobalTemperatureModule`
- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** `data.providers` contains exactly one entry with `id: 'owid'` whose `categories` include `co2-emissions` and `global-temperature`
- **AND** its `origins` include ERA5 and HadCRUT5 listed for `global-temperature`

#### Scenario: Application boots with both categories

- **WHEN** the `AppModule` testing module is compiled
- **THEN** it compiles without a duplicate data-source error

#### Scenario: Dependencies check is unchanged

- **WHEN** `GET /api/v1/health/dependencies` is called with the transport stubbed
- **THEN** the body reports a single `owid` entry and `GET /api/v1/health` never touches the provider

### Requirement: Fixture-based tests with zero network calls

All tests of the module SHALL run against static fixtures under `apps/api/__tests__/global-temperature/fixtures/`, captured once, manually, from the exact URLs used by the service (the filtered CSV with `tab=chart` and the indicator metadata for `1325256`), trimmed to a few entities (including `OWID_WRL`, `OWID_KOS`, one aggregate, one code outside the allowlist, a negative value, a value that rounds to zero and one missing year) and years 1940-1942. The transport SHALL be stubbed through `OUTBOUND_FETCH`; no test SHALL perform a network call, and the suite SHALL produce zero errors and zero warnings while holding the api coverage thresholds.

#### Scenario: Fixtures cover the edge cases

- **GIVEN** the committed fixture set
- **THEN** it includes World, Kosovo, a continent aggregate, a negative value, a near-zero value, a null year and the metadata capture

#### Scenario: No test reaches the network

- **WHEN** `npx nx test api` runs the `global-temperature` suites
- **THEN** every transport interaction goes through the `OUTBOUND_FETCH` stub

### Requirement: A pre-industrial global series since 1850 in the same payload

`data.global` SHALL be `{ startYear, endYear, baseline, mean, lower, upper, dataset, origin }` for World only (hemispheres are not requested or served): `startYear` 1850, `endYear` the latest year with a value, `baseline` `{ startYear: 1861, endYear: 1890 }` (OWID's pre-industrial baseline), `mean`, `lower` and `upper` arrays of length `endYear - startYear + 1` in degrees Celsius relative to that baseline, rounded to 2 decimals with `null` for gaps (`lower` and `upper` are the 95% confidence bounds), `dataset` the OWID dataset identity of the HadCRUT5 indicators and `origin` the static HadCRUT5 origin. The service SHALL call `getGrapherSeries('temperature-anomaly', ...)` with `tab: 'chart'`, `country: ['OWID_WRL']`, `timeRange = { from: 1850, to: <previous UTC calendar year> }` once per column (`near_surface_temperature_anomaly` for `mean`, `near_surface_temperature_anomaly_lower`, `near_surface_temperature_anomaly_upper`), which share one download and cache entry, and `getIndicatorMetadata(1325020)` for the dataset identity and timestamp. The upper bound is the previous year because the provider already includes the partial current year. `meta.source.lastUpdated` SHALL be the latest `updatedAt` of the per-country and global indicators. The total payload (entities plus `global`) SHALL stay at or below about 45 KB gzipped (about 30 KB measured).

#### Scenario: Global series is served

- **GIVEN** the committed HadCRUT5 fixtures
- **WHEN** `GET /api/v1/global-temperature` is called
- **THEN** `data.global.startYear` is 1850 and `mean`, `lower` and `upper` have length `endYear - 1850 + 1`

#### Scenario: Request uses the chart tab and World only

- **WHEN** the service calls the OWID client for the global series
- **THEN** the options are `tab: 'chart'`, `country: ['OWID_WRL']` and `timeRange.to` equal to the previous UTC year, and the three columns result in one transport request

#### Scenario: The partial current year is not served

- **GIVEN** a provider response that includes a row for the current year
- **WHEN** the response is built
- **THEN** `data.global.endYear` is at most the previous year

#### Scenario: Hemispheres are ignored

- **GIVEN** a provider response that also contains `OWID_NH` and `OWID_SH`
- **WHEN** the response is built
- **THEN** the global block contains only World values

#### Scenario: Values and gaps

- **GIVEN** a World row with `mean` `1.4119903`, `lower` `1.3725953`, `upper` `1.4513854` and a year with blank bounds
- **WHEN** the response is built
- **THEN** the values are `1.41`, `1.37`, `1.45` and the blank year is `null` in the affected arrays

#### Scenario: Pre-industrial baseline is verified

- **GIVEN** a metadata fixture for indicator `1325020` whose short description says `compared to the 1861-1890 mean`
- **WHEN** the endpoint is called
- **THEN** the response is `200` and `data.global.baseline` is `{ startYear: 1861, endYear: 1890 }`
- **AND** a description naming another period, or none, yields `502`

#### Scenario: Unusable global data

- **GIVEN** fixtures without `OWID_WRL` in the global series, or with fewer than two years of values
- **WHEN** the endpoint is called
- **THEN** the response is `502` and no partial `data` is returned

#### Scenario: Latest timestamp across series

- **GIVEN** per-country `updatedAt` `2026-10-13T08:42:32.000Z` and global `updatedAt` `2026-10-13T08:33:29.000Z`
- **WHEN** the endpoint responds
- **THEN** `meta.source.lastUpdated` is `2026-10-13T08:42:32.000Z`
