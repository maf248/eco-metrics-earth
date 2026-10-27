# energy-sources-api Specification

## Purpose

TBD - created by archiving change energy-sources. Update Purpose after archive.

## Requirements

### Requirement: Energy sources endpoint serves every country and World in one response

`EnergySourcesController` (registered by `EnergySourcesModule`, imported by `AppModule`) SHALL expose `GET /api/v1/energy-sources`, taking no path or query parameters, and returning `ApiResponse<EnergySourcesData>` as `{ success: true, status: 200, data, meta }`. `data` SHALL contain `startYear` (2000), `endYear` (the latest year with real generation), `unit` (`'TWh'`), `dataset` (`{ name, version }` from the OWID indicator metadata), `origin` (the Ember origin, below) and `entities`. The endpoint SHALL be documented in Swagger under the `'Energy Sources'` tag (`@ApiOperation`, `@ApiOkResponse`, `@ApiBadGatewayResponse`) and go through the same global pipeline as every other endpoint. Unknown query parameters SHALL be ignored.

#### Scenario: Healthy provider

- **GIVEN** the OWID transport stubbed with the committed fixtures
- **WHEN** `GET /api/v1/energy-sources` is called
- **THEN** the response is `200` with `success: true` and `status: 200`
- **AND** `data.startYear` is 2000, `data.endYear` is the latest year with generation in the fixtures and `data.unit` is `TWh`
- **AND** `data.entities` contains the World entity and the fixture countries

#### Scenario: Swagger documentation

- **WHEN** the OpenAPI document is generated
- **THEN** `GET /api/v1/energy-sources` appears under the `Energy Sources` tag with its `200` and `502` responses

#### Scenario: Unknown query parameters are ignored

- **WHEN** `GET /api/v1/energy-sources?country=ARG` is called
- **THEN** the response is identical to the one without the parameter

### Requirement: The service reads one verified OWID chart

The service SHALL read exactly one OWID grapher chart through `OwidClient.getGrapherSeries`, slug `electricity-production-by-source` (unit terawatt-hours), once per column, each with an explicit `column`, an explicit `country` allowlist and `timeRange = { from: 2000, to: <current UTC year> }`, and SHALL NOT pass `tab` (the chart opens on its chart tab, where the `country` filter is honoured; verified against the live provider). It SHALL NOT read the share chart: shares are derived from the served generation (see the page capability). Slug, columns and indicator IDs SHALL be declared once in `energy-sources.constants.ts`: `coal_generation__twh` (indicator 1295503), `gas_generation__twh` (1295509), `oil_generation__twh` (1295524), `nuclear_generation__twh` (1295521), `hydro_generation__twh` (1295516), `wind_generation__twh` (1295559), `solar_generation__twh` (1295552), `bioenergy_generation__twh` (1295498) and `other_renewables_excluding_bioenergy_generation__twh` (1295525). The dataset identity and `lastUpdated` SHALL come from the metadata of indicator 1295503 (dataset "Electricity mix", version `2026-06-30` at the time of writing). A comment SHALL note that the former slug `electricity-prod-source-stacked` redirects to an Explorer and must not be used. A cold start SHALL cost exactly two outbound requests (one CSV, one metadata document) however many columns are selected.

#### Scenario: Request URLs

- **GIVEN** the transport stub records every URL
- **WHEN** the service builds the payload on a cold cache
- **THEN** exactly two URLs are requested: `.../grapher/electricity-production-by-source.csv?...` and `.../indicators/1295503.metadata.json`
- **AND** the CSV URL contains `time=2000..<current year>` and a `country=` list equal to the allowlist, and no `tab=`

#### Scenario: Dataset identity and timestamp

- **GIVEN** the indicator metadata fixture
- **WHEN** the response is built
- **THEN** `data.dataset` is `{ name: 'Electricity mix', version: '2026-06-30' }` and `meta.source.lastUpdated` is the indicator's `updatedAt`

### Requirement: Compact year-aligned payload with eight sources

Each entity SHALL be `{ code, iso2, name, generation }` where `generation` is an object keyed by the eight ids of `ENERGY_SOURCE_IDS` (`coal`, `gas`, `oil`, `nuclear`, `hydro`, `wind`, `solar`, `bioenergyOther`, in that fixed order), each holding an array of length `endYear - startYear + 1`, index `i` holding the value for year `startYear + i` in terawatt-hours rounded to 2 decimals, or `null` where the source reports no value. The payload SHALL NOT carry shares. `bioenergyOther` SHALL be the sum of OWID's `bioenergy` and `other renewables excluding bioenergy` for the same entity and year: `null` only when both are `null`, the other part otherwise; the sum is computed before rounding. The service SHALL assemble the payload with `buildYearAlignedEntities` (one measure key per source, regrouped afterwards) in a pure exported builder. The wire types SHALL be defined in `@eco-metrics/shared`. The serialized `data` for the real data (about 216 entities, 2000-2025, 8 arrays each) SHALL stay at or below about 55 KB gzipped.

#### Scenario: Arrays align with the year range

- **GIVEN** fixtures covering 2000-2002 where one entity has no 2001 coal value
- **WHEN** the response is built
- **THEN** every entity's eight arrays have length 3 and that entity's `generation.coal` is `[a, null, c]`

#### Scenario: Values are rounded to two decimals

- **GIVEN** an OWID generation of `10538.944`
- **WHEN** the response is built
- **THEN** the served value is `10538.94`

#### Scenario: Bioenergy and other renewables are summed before rounding

- **GIVEN** bioenergy `0.004` and other renewables `0.004` for an entity-year
- **WHEN** the response is built
- **THEN** `generation.bioenergyOther` for that year is `0.01`

#### Scenario: One missing part does not hide the other

- **GIVEN** an entity-year where bioenergy is `null` and other renewables is `0.5`
- **WHEN** the response is built
- **THEN** `bioenergyOther` for that year is `0.5`

#### Scenario: Both parts missing give null

- **GIVEN** an entity-year where both parts are `null`
- **WHEN** the response is built
- **THEN** `bioenergyOther` is `null`, never `0`

#### Scenario: Missing sources stay null

- **GIVEN** an entity (for example Bosnia and Herzegovina) whose gas and nuclear cells are blank in early years (2000)
- **WHEN** the response is built
- **THEN** its `generation.gas` and `generation.nuclear` contain only `null`, and no blank is converted to `0`

#### Scenario: Source order is fixed and shares are absent

- **WHEN** `Object.keys(entity.generation)` is read and the entity's keys are listed
- **THEN** the first equals `['coal', 'gas', 'oil', 'nuclear', 'hydro', 'wind', 'solar', 'bioenergyOther']` and the entity has no `share` key

### Requirement: No year before 2000 is requested or served

The service SHALL request OWID with `time=2000..<current year>` and the builder SHALL ignore any provider row before `startYear` and keep `startYear` fixed at 2000, so every served value belongs to the range in which OWID's electricity series are Ember's (CC BY 4.0). Earlier years combine the Energy Institute Statistical Review ("© Energy Institute", all rights reserved), which this site does not republish. The rationale SHALL be documented next to `ENERGY_START_YEAR` in the constants and in `docs/data-sources/energy-sources.md`.

#### Scenario: Provider rows before 2000 are ignored

- **GIVEN** builder input that includes rows for 1990 and 1999 for the World
- **WHEN** the response is built
- **THEN** `data.startYear` is 2000, every array starts at 2000 and no value of 1999 or earlier appears in `data`

### Requirement: Years without real generation are not served

Before alignment, for every entity, the builder SHALL drop each year whose eight generation values are all `null` or sum to 0, so that `endYear` derives only from years with real generation and an entity left with no year is dropped. Reason: in the live data the chart has 55 country-years (the 2025 row of 29 countries, plus the whole series of one entity) made of zeros and blanks (for example only `nuclear = 0`); serving them would show an empty year as real data.

#### Scenario: A zeros-only row is not served

- **GIVEN** an entity whose 2025 row holds `nuclear = 0` and blanks, and whose 2024 row has real values
- **WHEN** the response is built
- **THEN** all its 2025 values are `null`

#### Scenario: endYear ignores empty years

- **GIVEN** a payload whose only 2026 values are zeros-only rows
- **WHEN** the response is built
- **THEN** `data.endYear` is the latest year with real generation

#### Scenario: An all-zero entity is dropped

- **GIVEN** an entity whose every row is zeros or blanks
- **WHEN** the response is built
- **THEN** it is not part of `data.entities`

#### Scenario: Real years are served unchanged

- **GIVEN** an entity-year with positive generation
- **WHEN** the response is built
- **THEN** its values are served (rounded), explicit zeros among them kept as `0`

### Requirement: Only countries and World are returned, with a flag code

The service SHALL request exactly the entity codes of `listCountryEntityCodes()`. Entities with any other code (continents, income groups, `OWID_EU27`, aggregates) SHALL NOT appear, even if the provider returns them. Each entity SHALL carry `iso2` from the crosswalk (`XK` for Kosovo, `null` for World). `entities` SHALL be ordered World first, then countries by `name` (English collation). A response without a World entity or without any value SHALL be rejected as unusable (`ProviderDataError`).

#### Scenario: Aggregates are filtered out

- **GIVEN** a provider response that includes `OWID_EU27`, `OWID_WRL` and `ARG`
- **WHEN** the response is built
- **THEN** `data.entities` contains `OWID_WRL` and `ARG` and not `OWID_EU27`

#### Scenario: Ordering and flags

- **WHEN** the response is built from the fixtures
- **THEN** the first entity is World with `iso2: null`, the rest are ordered by name, and `ARG` has `iso2: 'AR'`

#### Scenario: Missing World is rejected

- **GIVEN** builder input without `OWID_WRL`
- **WHEN** the response is built
- **THEN** it throws `ProviderDataError`

### Requirement: Attribution metadata and the Ember origin

The success envelope SHALL be built with `buildOwidEnvelope(data, lastUpdated)`. The module SHALL declare one `DataSourceOrigin` constant, `ENERGY_ORIGIN`, used both by `registerCategory` and by `data.origin`: producer `Ember`, title `Yearly Electricity Data`, url `https://ember-energy.org/data/yearly-electricity-data/`, license `{ name: 'CC BY 4.0', url: 'https://ember-energy.org/creative-commons/' }`. It SHALL NOT declare the Energy Institute, Pinto et al. or UK DESNZ: no value from them is served. (European countries' values may come from Ember's sibling dataset "Yearly Electricity Data Europe": same producer and licence, covered by the same credit.)

#### Scenario: The payload carries the Ember origin

- **WHEN** the endpoint is called
- **THEN** `data.origin` equals `ENERGY_ORIGIN` and `meta.source` is the OWID publisher definition with the provider's `lastUpdated`

#### Scenario: One definition feeds the catalog and the payload

- **WHEN** `GET /api/v1/data-sources` is called with the energy module loaded
- **THEN** the `owid` provider's `origins` include the same Ember origin with `categories` containing `energy-sources`

### Requirement: Provider failures and unusable data become 502

Provider failures SHALL propagate as `ProviderError` subclasses and the global filter SHALL answer them with `502` and the constant body, with no per-controller mapping. The service SHALL throw `ProviderDataError` when the provider answered with unusable content. Unexpected errors SHALL stay `500`.

#### Scenario: Provider down

- **GIVEN** the transport stub fails every request
- **WHEN** `GET /api/v1/energy-sources` is called
- **THEN** the response is `502` with the constant provider-error body

#### Scenario: Unusable or malformed content

- **GIVEN** a CSV without a World row, or whose header lacks the expected columns
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: Unexpected error stays 500

- **GIVEN** a service bug that throws a plain `Error`
- **WHEN** the endpoint is called
- **THEN** the response is `500`

### Requirement: The module registers with the single OWID data source and the existing health check

`EnergySourcesService` SHALL call `OwidProviderStatus.registerCategory('energy-sources', [ENERGY_ORIGIN])` in its constructor and `recordProviderUpdate(lastUpdated)` after each successful assembly. It SHALL NOT build an OWID data-source entry of its own and SHALL NOT add a health indicator: the existing `owid` indicator covers the provider.

#### Scenario: Category registered once

- **WHEN** the application boots with the CO2, global temperature and energy modules
- **THEN** the catalog contains exactly one `owid` entry whose `categories` include `energy-sources`, with `lastUpdatedBasis` `provider` after a success

#### Scenario: No new health indicator

- **WHEN** `GET /api/v1/health/dependencies` is called
- **THEN** the result has the same indicators as before this change

### Requirement: Fixture-based tests with zero network calls

The API tests SHALL use fixtures captured once from the exact URLs the service uses (never fetched inside a test) under `apps/api/__tests__/energy-sources/fixtures/`: the chart CSV and the indicator metadata, trimmed to World plus a few countries (one with blank source cells, one with a zeros-only latest row) and including a few pre-2000 rows to prove they are dropped. The transport SHALL be stubbed through `OUTBOUND_FETCH`; no test SHALL open a socket. The suite SHALL cover the pure builder and the controller.

#### Scenario: No network

- **WHEN** the energy-sources test suites run with the network unavailable
- **THEN** they pass and zero real HTTP requests are made

#### Scenario: Fixtures match the real format

- **WHEN** the fixture CSV is parsed by the real `parseGrapherTable`
- **THEN** its header is `entity,code,year,<column short names>` as the provider returns it with `useColumnShortNames=true`
