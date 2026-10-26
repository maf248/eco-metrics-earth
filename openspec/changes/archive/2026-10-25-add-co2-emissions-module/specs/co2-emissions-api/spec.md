## ADDED Requirements

### Requirement: CO2 emissions endpoint serves every country and World in one response

`Co2EmissionsController` (registered by `Co2EmissionsModule`, imported by `AppModule`) SHALL expose `GET /api/v1/co2-emissions`, taking no path or query parameters, and returning `ApiResponse<Co2EmissionsData>` as `{ success: true, status: 200, data, meta }`. `data` SHALL contain `startYear` (1950), `endYear` (the latest year with at least one value), `units` (`{ total, perCapita }` display strings), `dataset` (`{ name, version }` taken from the OWID indicator metadata) and `entities`. The endpoint SHALL be documented in Swagger under the `'CO2 Emissions'` tag (`@ApiOperation`, `@ApiOkResponse`, `@ApiBadGatewayResponse`) and SHALL go through the same global pipeline (prefix, throttling, exception filter) as every other endpoint. Because it accepts no parameters there is no DTO to validate; a request carrying unknown query parameters SHALL be served as if they were absent.

#### Scenario: Healthy provider

- **GIVEN** the OWID transport stubbed with the committed fixtures
- **WHEN** `GET /api/v1/co2-emissions` is called
- **THEN** the response is `200` with `success: true` and `status: 200`
- **AND** `data.startYear` is 1950 and `data.endYear` is the latest year present in the fixtures
- **AND** `data.entities` contains the World entity and the fixture countries

#### Scenario: One request serves the whole page

- **WHEN** the endpoint is called
- **THEN** it returns every entity and both metrics in that single response, and no per-country endpoint exists

#### Scenario: Swagger documentation

- **WHEN** the OpenAPI document is generated
- **THEN** `GET /api/v1/co2-emissions` appears under the `CO2 Emissions` tag with its `200` and `502` responses

#### Scenario: Unknown query parameters are ignored

- **WHEN** `GET /api/v1/co2-emissions?country=ARG` is called
- **THEN** the response is identical to the one without the parameter

### Requirement: Compact year-aligned payload with rounded values

Each entity SHALL be `{ code, iso2, name, total, perCapita }` where `total` and `perCapita` are arrays of length `endYear - startYear + 1`, index `i` holding the value for year `startYear + i` and `null` where the source reports no value. `total` SHALL be in million tonnes of CO2 rounded to 3 decimals (converted from OWID's tonnes); `perCapita` SHALL be in tonnes of CO2 per person rounded to 2 decimals. The wire types `Co2EmissionsData`, `Co2EmissionsEntity` and `Co2EmissionsMetric` SHALL be defined in `@eco-metrics/shared`. The payload for the real OWID data (217 entities, 1950-2024) SHALL stay at or below about 80 KB gzipped.

#### Scenario: Arrays align with the year range

- **GIVEN** fixtures covering 1950-1952 where one entity has no 1951 per-capita value
- **WHEN** the response is built
- **THEN** every entity's `total` and `perCapita` have length 3
- **AND** that entity's `perCapita` is `[a, null, c]`

#### Scenario: Totals are converted and rounded

- **GIVEN** an OWID total of `29921192` tonnes
- **WHEN** the response is built
- **THEN** the entity's `total` value is `29.921`

#### Scenario: Per-capita values are rounded to two decimals

- **GIVEN** an OWID per-capita value of `1.7582052`
- **WHEN** the response is built
- **THEN** the entity's `perCapita` value is `1.76`

#### Scenario: Entities without a per-capita series are kept

- **GIVEN** an entity (e.g. `ATA`) present in the totals but absent from the per-capita data
- **WHEN** the response is built
- **THEN** it is returned with a `perCapita` array of only `null`

#### Scenario: Entities with no data at all are dropped

- **GIVEN** an entity whose values are `null` in every year of both metrics
- **WHEN** the response is built
- **THEN** it is not part of `data.entities`

#### Scenario: Payload budget

- **GIVEN** the full real dataset shape (about 217 entities x 75 years x 2 metrics, rounded as above)
- **WHEN** the serialized `data` is gzipped
- **THEN** it is about 70 KB and at most about 80 KB

### Requirement: Only countries and World are returned, with a flag code

The service SHALL request from OWID exactly the entity codes in the shared crosswalk allowlist (every ISO 3166-1 alpha-3 code of `ISO3_TO_ISO2`, plus `OWID_WRL` and `OWID_KOS`) with `timeRange = { from: 1950, to: <current UTC year> }`, through `OwidClient.getGrapherSeries` for the charts `annual-co2-emissions-per-country` (column `emissions_total`) and `co-emissions-per-capita` (column `emissions_total_per_capita`). Entities with any other code (continents, income groups, `OWID_EU27`, regional aggregates) SHALL NOT appear in the response, even if the provider returns them. Each entity SHALL carry `iso2` from the crosswalk: the ISO alpha-2 code for countries, `XK` for Kosovo (`OWID_KOS`) and `null` for World (`OWID_WRL`). `entities` SHALL be ordered World first, then countries by `name` (English collation), deterministically.

#### Scenario: Aggregates are excluded

- **GIVEN** a provider response that also contains `OWID_EUR` (Europe), `OWID_HIC` (High-income countries) and `OWID_EU27`
- **WHEN** the response is built
- **THEN** none of those codes appears in `data.entities`

#### Scenario: Request uses an explicit allowlist

- **WHEN** the service calls the OWID client
- **THEN** the `country` option equals the crosswalk allowlist and `timeRange.from` is 1950
- **AND** the recorded request URL contains a `country` parameter (so OWID's default chart selection is not used)

#### Scenario: World is represented without a flag

- **WHEN** the response is built
- **THEN** the World entity has `code: 'OWID_WRL'`, `iso2: null`, and is the first element of `entities`

#### Scenario: Countries carry alpha-2 codes

- **GIVEN** fixture entities `ARG`, `USA` and `OWID_KOS`
- **WHEN** the response is built
- **THEN** their `iso2` values are `AR`, `US` and `XK`

#### Scenario: Ordering is deterministic

- **WHEN** the response is built twice from the same fixtures
- **THEN** both results are deeply equal and countries after World are sorted by name

#### Scenario: A code outside the crosswalk is dropped

- **GIVEN** a provider response containing an alpha-3 code that is not in the crosswalk
- **WHEN** the response is built
- **THEN** that entity is not returned and the request still succeeds

### Requirement: Attribution metadata on the response

The response SHALL carry `meta.source` equal to the OWID publisher definition (`OWID_PUBLISHER`: provider, license, source URL, from `owid.attribution.ts`, never repeated as literals) plus `lastUpdated`, the latest `updatedAt` of the OWID indicator metadata for the two charts' indicators (`1119906` and `1119914`, via `OwidClient.getIndicatorMetadata`), and `meta.fetchedAt` as the ISO 8601 time the response was assembled. `data.dataset` SHALL carry the indicator metadata's `datasetName` and `datasetVersion`.

#### Scenario: Source attribution from the single definition

- **WHEN** the endpoint responds
- **THEN** `meta.source.provider`, `license` and `sourceUrl` equal the values of `OWID_PUBLISHER`

#### Scenario: Provider timestamp is used

- **GIVEN** indicator metadata fixtures with `updatedAt` values `2026-09-10T01:10:54.000Z` and `2026-10-22T21:47:04.000Z`
- **WHEN** the endpoint responds
- **THEN** `meta.source.lastUpdated` is `2026-10-22T21:47:04.000Z`

#### Scenario: Dataset identity

- **GIVEN** metadata fixtures with `datasetName` `Global Carbon Budget` and `datasetVersion` `2025-11-13`
- **WHEN** the endpoint responds
- **THEN** `data.dataset` equals `{ name: 'Global Carbon Budget', version: '2025-11-13' }`

### Requirement: Provider failures and unusable data become 502

When the OWID client or transport throws, the endpoint SHALL respond `502` in the `ApiResponse` error format (see `provider-failure-contract`). When the provider answers but the content is unusable (no `OWID_WRL` entity, no rows, no value in any year) the service SHALL throw `ProviderDataError`, which is mapped the same way. The endpoint SHALL NOT return partial data.

#### Scenario: Transport failure

- **GIVEN** the OWID transport stub failing every attempt with a 503
- **WHEN** `GET /api/v1/co2-emissions` is called
- **THEN** the response is `502` with `success: false`

#### Scenario: Malformed CSV

- **GIVEN** a stub returning a CSV whose header does not start with `entity,code,year`
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: World missing

- **GIVEN** fixtures that contain countries but no `OWID_WRL`
- **WHEN** the endpoint is called
- **THEN** the response is `502` and no `data` is returned

### Requirement: The CO2 module registers OWID as its data source

`Co2EmissionsService` SHALL register the category `co2-emissions` with `OwidProviderStatus` on construction and SHALL record the provider timestamp after each successful assembly, so that the OWID live data source in the catalog lists `co2-emissions` (see `owid-provider-client`). The service SHALL NOT build a data-source entry itself.

#### Scenario: Catalog lists OWID for the category

- **GIVEN** the application with `Co2EmissionsModule`
- **WHEN** `GET /api/v1/data-sources` is called
- **THEN** `data.providers` contains one entry with `id: 'owid'` whose `categories` include `co2-emissions`

#### Scenario: Removing the module removes the category

- **GIVEN** a testing module with `OwidModule` and `DataSourcesModule` but without `Co2EmissionsModule`
- **WHEN** the catalog is requested
- **THEN** it contains no `owid` provider entry

### Requirement: Fixture-based tests with zero network calls

All tests of the module SHALL run against static fixtures under `apps/api/__tests__/co2-emissions/fixtures/`, captured once, manually, from the exact URLs used by the service (filtered CSVs for both charts and both indicator metadata responses), trimmed to a few entities (including `OWID_WRL`, `OWID_KOS`, one entity without per-capita data and one aggregate) and years 1950-1952, and committed as static data. The transport SHALL be stubbed through `OUTBOUND_FETCH`; no test SHALL perform a network call, and the suite SHALL produce zero errors and zero warnings while holding the api coverage thresholds.

#### Scenario: Fixtures cover the edge cases

- **GIVEN** the committed fixture set
- **THEN** it includes World, Kosovo, an entity with no per-capita values, a continent aggregate and both metadata captures

#### Scenario: No test reaches the network

- **WHEN** `npx nx test api` runs the `co2-emissions` suites
- **THEN** every transport interaction goes through the `OUTBOUND_FETCH` stub
