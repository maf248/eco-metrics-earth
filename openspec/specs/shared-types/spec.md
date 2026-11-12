# shared-types Specification

## Purpose

Defines the shared TypeScript types for API responses and ecological categories used across apps.

## Requirements

### Requirement: Package shared with base domain types

The `shared` package SHALL export base TypeScript interfaces that represent the data contracts between the BFF and the frontend. It SHALL include at least the base API response interface and the ecological category identifiers.

#### Scenario: Frontend imports types from shared

- **WHEN** a file in `apps/web` imports from `@eco-metrics/shared`
- **THEN** TypeScript resolves the types correctly without errors

#### Scenario: BFF imports types from shared

- **WHEN** a file in `apps/api` imports from `@eco-metrics/shared`
- **THEN** TypeScript resolves the types correctly without errors

### Requirement: Base API response interface

A generic `ApiResponse<T>` interface SHALL exist that wraps all BFF responses with a consistent structure: `data`, `timestamp`, and optionally `error`.

#### Scenario: Successful response is typed correctly

- **WHEN** the BFF returns category data
- **THEN** the response matches the `ApiResponse<T>` interface with `data` populated and no `error`

#### Scenario: Error response is typed correctly

- **WHEN** the BFF returns an error
- **THEN** the response matches `ApiResponse<T>` with `error` populated

### Requirement: Enum of ecological categories

An enum or union type `EcoCategory` SHALL exist with the identifiers of the MVP's initial categories: `air-quality`, `endangered-species`, `global-temperature`, `deforestation`, `ocean-health`, `co2-emissions`.

#### Scenario: Categories available in frontend and backend

- **WHEN** `EcoCategory` is imported from `@eco-metrics/shared`
- **THEN** the six MVP category identifiers are available

### Requirement: Metric time-series types

The `shared` package SHALL export a `MetricPoint` interface — `{ year: number; value: number | null }`, one observation of a metric for one entity in one year, where `value` is `null` when the source reports no data for that year — and a `MetricSeries` interface — `{ entityName: string; entityCode: string; points: MetricPoint[] }`, the year/value points of a single metric for a single entity, identified by a stable entity code (an ISO-3166 alpha-3 country code such as `ARG`, or an OWID region code such as `OWID_WRL`). Both SHALL be exported from `@eco-metrics/shared`.

#### Scenario: A series carries its entity identity and points

- **GIVEN** a `MetricSeries` for Argentina's annual CO₂ emissions
- **WHEN** it is constructed
- **THEN** `entityName` is `'Argentina'`, `entityCode` is `'ARG'`, and `points` holds `{ year, value }` objects

#### Scenario: Missing observations are null, not dropped

- **GIVEN** a source year with no reported value
- **WHEN** the observation is represented as a `MetricPoint`
- **THEN** `value` is `null` and the year remains present in the series

#### Scenario: Types are importable from both apps

- **WHEN** a file in `apps/web` or `apps/api` imports `MetricPoint` or `MetricSeries` from `@eco-metrics/shared`
- **THEN** TypeScript resolves the types without errors

### Requirement: Data source attribution type

The `shared` package SHALL export a `DataSourceAttribution` interface with exactly four string fields: `provider` (data provider name, e.g. `'Our World in Data'`), `license` (license identifier, e.g. `'CC BY 4.0'`), `sourceUrl` (URL of the source dataset or chart), and `lastUpdated` (ISO 8601 timestamp of the upstream data's last update).

#### Scenario: Attribution carries the four fields

- **GIVEN** an OWID grapher chart consumed by the BFF
- **WHEN** a `DataSourceAttribution` value is constructed for it
- **THEN** it carries `provider`, `license`, `sourceUrl`, and `lastUpdated` — all four populated

#### Scenario: The type is available to the frontend

- **WHEN** the web app imports `DataSourceAttribution` from `@eco-metrics/shared`
- **THEN** TypeScript resolves the type without errors

### Requirement: Response metadata type

The `shared` package SHALL export an `ApiResponseMeta` interface — `{ source: DataSourceAttribution; fetchedAt: string; stale?: boolean }` — where `fetchedAt` is an ISO 8601 timestamp of when the BFF last successfully fetched the data from its provider (the assembly time of a fresh response, the stored time of a stale one) and `stale` is `true` when the payload is a stored last-known-good snapshot served because the provider failed. `stale` is optional: absent means fresh, so responses that never emit it (water footprint, data sources) and payloads cached before this field existed stay valid. It is the payload of `ApiResponse<T>.meta`, defined by the `api-response-type` capability.

#### Scenario: Meta composes attribution and fetch time

- **GIVEN** a BFF response that serves provider data
- **WHEN** its `meta` is constructed
- **THEN** `meta.source` is a `DataSourceAttribution` and `meta.fetchedAt` is an ISO 8601 string

#### Scenario: The type is exported from the package root

- **WHEN** any workspace project imports `ApiResponseMeta` from `@eco-metrics/shared`
- **THEN** TypeScript resolves the type without errors

#### Scenario: Stale flag is optional

- **GIVEN** a meta literal `{ source, fetchedAt }` without `stale`
- **WHEN** it is assigned to `ApiResponseMeta`
- **THEN** it type-checks, and `{ source, fetchedAt, stale: true }` type-checks too

#### Scenario: Stale flag is a boolean

- **WHEN** a meta literal sets `stale` to a string
- **THEN** TypeScript reports an error

### Requirement: Data sources catalog types

The `shared` package SHALL export, from the package root and as types only (no data, no runtime values), the following for the data-sources catalog: `DataSourceTimestampBasis` (`'provider' | 'retrieval'`); `DataSourcePublisher` (`Pick<DataSourceAttribution, 'provider' | 'license' | 'sourceUrl'>`); `DataSourceLicense` (`name`, `url`); `LiveDataSource` (extends `DataSourceAttribution` with `id`, `description`, `categories: EcoCategory[]`, `lastUpdatedBasis: DataSourceTimestampBasis`); `DataSourcePublication` (`citation`, `url`, `publishedYear: number`, `entryCount`, optional `publisher`, optional `license: DataSourceLicense`); `StaticDataSource` (`id`, `name`, `description`, `categories: EcoCategory[]`, `publications`; no `lastUpdated`, because a static dataset's dates are the publication years of its citations); and `DataSourcesCatalog` (`providers: LiveDataSource[]`, `datasets: StaticDataSource[]`). The existing `DataSourceAttribution`, `ApiResponseMeta` and `ApiResponse` definitions SHALL be unchanged. `WaterFootprintProduct` SHALL gain one optional field, `publisher?: DataSourcePublisher`, and no other change.

#### Scenario: Types importable from both apps

- **WHEN** a file in `apps/api` or `apps/web` imports `DataSourcesCatalog` from `@eco-metrics/shared`
- **THEN** TypeScript resolves it without errors

#### Scenario: Live source is a superset of the attribution

- **GIVEN** a `LiveDataSource` value
- **WHEN** it is passed where a `DataSourceAttribution` is expected
- **THEN** it type-checks

#### Scenario: Publisher is accepted from a full attribution

- **GIVEN** a `DataSourceAttribution` value
- **WHEN** it is passed where a `DataSourcePublisher` is expected
- **THEN** it type-checks

#### Scenario: Package stays types-only for sources

- **WHEN** the shared package's built output is inspected
- **THEN** it contains no provider name, license string or source URL belonging to a data source

#### Scenario: Product publisher is optional

- **GIVEN** an existing `WaterFootprintProduct` value without `publisher`
- **WHEN** it is type-checked
- **THEN** it still compiles, and a value with `publisher` also compiles

#### Scenario: Publication license is optional

- **GIVEN** an existing `DataSourcePublication` value without `license`
- **WHEN** it is type-checked
- **THEN** it still compiles, and a value with `license: { name, url }` also compiles

### Requirement: CO2 emissions wire types

The `shared` package SHALL export, from `packages/shared/src/lib/co2-emissions.ts` and the package root: `Co2EmissionsMetric` (`'total' | 'perCapita'`), `Co2EmissionsEntity` (`{ code: string; iso2: string | null; name: string; total: (number | null)[]; perCapita: (number | null)[] }`) and `Co2EmissionsData` (`{ startYear: number; endYear: number; units: { total: string; perCapita: string }; dataset: { name: string; version: string }; origin: DataSourceOrigin; entities: Co2EmissionsEntity[] }`), documented with English doc comments stating that array index `i` is the year `startYear + i`, the units and the rounding. They are types only. `ApiResponse<Co2EmissionsData>` SHALL type-check for the endpoint's success response, including `meta`.

#### Scenario: Types are exported from the root

- **WHEN** a file imports `Co2EmissionsData`, `Co2EmissionsEntity` and `Co2EmissionsMetric` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in both `apps/api` and `apps/web`

#### Scenario: Missing observations are null

- **GIVEN** an entity with an unreported year
- **WHEN** it is typed as `Co2EmissionsEntity`
- **THEN** `null` is assignable to the corresponding `total` or `perCapita` element

#### Scenario: World has no alpha-2 code

- **WHEN** an entity for World is typed as `Co2EmissionsEntity`
- **THEN** `iso2: null` is accepted

#### Scenario: Envelope with meta type-checks

- **WHEN** `{ success: true, status: 200, data, meta: { source, fetchedAt } }` is assigned to `ApiResponse<Co2EmissionsData>`
- **THEN** it type-checks

### Requirement: Static ISO country-code crosswalk

The `shared` package SHALL export from `packages/shared/src/lib/country-codes.ts` and the package root: `ISO3_TO_ISO2` (a read-only record of ISO 3166-1 alpha-3 -> alpha-2 codes, upper case), `WORLD_ENTITY_CODE` (`'OWID_WRL'`), `KOSOVO_ENTITY_CODE` (`'OWID_KOS'`), `iso2ForEntityCode(code: string): string | null` and `listCountryEntityCodes(): string[]`. `iso2ForEntityCode` SHALL return the alpha-2 code for an ISO alpha-3 code in the table, `'XK'` for `OWID_KOS` and `null` for `OWID_WRL` and for any unknown code. `listCountryEntityCodes` SHALL return every alpha-3 key of the table plus `OWID_KOS` and `OWID_WRL`, sorted and without duplicates. The data SHALL be static (no I/O) and SHALL cover every country code present in the committed OWID fixtures.

#### Scenario: Known countries

- **WHEN** `iso2ForEntityCode` is called with `ARG`, `USA` and `GBR`
- **THEN** it returns `AR`, `US` and `GB`

#### Scenario: Kosovo is handled

- **WHEN** `iso2ForEntityCode('OWID_KOS')` is called
- **THEN** it returns `XK`

#### Scenario: World is represented without a flag

- **WHEN** `iso2ForEntityCode('OWID_WRL')` is called
- **THEN** it returns `null`

#### Scenario: Unknown and aggregate codes

- **WHEN** `iso2ForEntityCode` is called with `OWID_EUR`, `OWID_HIC` and `ZZZ`
- **THEN** it returns `null` for each, and none of them is in `listCountryEntityCodes()`

#### Scenario: Table is well formed

- **WHEN** every entry of `ISO3_TO_ISO2` is inspected
- **THEN** each key matches `/^[A-Z]{3}$/`, each value matches `/^[A-Z]{2}$/`, and no alpha-2 value is used by two keys

#### Scenario: Allowlist helper

- **WHEN** `listCountryEntityCodes()` is called
- **THEN** it contains `ARG`, `OWID_KOS` and `OWID_WRL`, is sorted, and has no duplicates

#### Scenario: Fixture codes are covered

- **GIVEN** the country codes (alpha-3 shaped, non-aggregate) present in the committed CO2 fixtures
- **WHEN** each is passed to `iso2ForEntityCode`
- **THEN** none returns `null`, except `OWID_WRL`

#### Scenario: Every alpha-2 has a flag

- **WHEN** the web test suite compares the alpha-2 values the crosswalk can produce with the `.fi-xx` rules of the installed `flag-icons` stylesheet
- **THEN** every value (including `XK`) has a matching rule

### Requirement: Shared country entity and dataset identity types

The `shared` package SHALL export, from `packages/shared/src/lib/country-series.ts` and the package root, `CountryEntity` (`{ code: string; iso2: string | null; name: string }`, with the doc comments that `code` is an ISO 3166-1 alpha-3 code or `OWID_WRL`/`OWID_KOS`, `iso2` is `null` for World, and a year-aligned measure array has index `i` for year `startYear + i`) and `DatasetIdentity` (`{ name: string; version: string }`). They are types only. `Co2EmissionsEntity` SHALL extend `CountryEntity` and `Co2EmissionsData['dataset']` SHALL be a `DatasetIdentity`, without any structural change to the CO2 types.

#### Scenario: Types are exported from the root

- **WHEN** a file imports `CountryEntity` and `DatasetIdentity` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in `apps/api` and `apps/web`

#### Scenario: CO2 types are structurally unchanged

- **WHEN** the existing shared type tests for `Co2EmissionsEntity` and `Co2EmissionsData` run
- **THEN** they pass without changes

#### Scenario: World has no alpha-2 code

- **WHEN** an entity for World is typed as `CountryEntity`
- **THEN** `iso2: null` is accepted

### Requirement: Global temperature wire types

The `shared` package SHALL export, from `packages/shared/src/lib/global-temperature.ts` and the package root, `GlobalTemperatureEntity` (`CountryEntity & { anomaly: (number | null)[] }`), `GlobalTemperatureGlobal` and `GlobalTemperatureData`. `GlobalTemperatureGlobal` is `{ startYear: number; endYear: number; baseline: { startYear: number; endYear: number }; mean: (number | null)[]; lower: (number | null)[]; upper: (number | null)[]; dataset: DatasetIdentity; origin: DataSourceOrigin }` (the World series since 1850 against the pre-industrial baseline with its 95% confidence bounds). `GlobalTemperatureData` is `{ startYear: number; endYear: number; unit: string; baseline: { startYear: number; endYear: number }; dataset: DatasetIdentity; origin: DataSourceOrigin; entities: GlobalTemperatureEntity[]; global: GlobalTemperatureGlobal }`. They SHALL be documented with English doc comments stating that array index `i` is the year `startYear + i`, the unit (degrees Celsius), that values are relative to the stated `baseline` and rounded to 2 decimals, that country values cover land only while World covers land and ocean, and that `lower`/`upper` are the 95% confidence bounds of `mean`. `ApiResponse<GlobalTemperatureData>` SHALL type-check for the endpoint's success response, including `meta`. The earlier `GlobalTemperatureOrigin` type is replaced by `DataSourceOrigin`.

#### Scenario: Types are exported from the root

- **WHEN** a file imports `GlobalTemperatureData`, `GlobalTemperatureEntity` and `GlobalTemperatureGlobal` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in both apps

#### Scenario: Negative and missing observations

- **WHEN** an entity is typed as `GlobalTemperatureEntity` and a `global` block is typed as `GlobalTemperatureGlobal`
- **THEN** negative numbers and `null` are assignable to `anomaly`, `mean`, `lower` and `upper` elements

#### Scenario: Envelope with meta type-checks

- **WHEN** `{ success: true, status: 200, data, meta: { source, fetchedAt } }` is assigned to `ApiResponse<GlobalTemperatureData>`
- **THEN** it type-checks

### Requirement: Upstream origin types for the catalog and the payloads

The `shared` package SHALL export, from `packages/shared/src/lib/data-sources.ts` and the root, `DataSourceOrigin` (`{ producer: string; title: string; url: string; license: { name: string; url: string }; notice?: string; citation?: string; disclaimer?: string }`: the organization that produced the data a live provider republishes, with its license and the credit texts the license asks for) and `LiveDataSourceOrigin` (`DataSourceOrigin & { categories: EcoCategory[] }`). `LiveDataSource` SHALL gain `origins: LiveDataSourceOrigin[]`. Types only.

#### Scenario: Types are exported from the root

- **WHEN** a file imports `DataSourceOrigin` and `LiveDataSourceOrigin` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in both apps

#### Scenario: Optional credit texts

- **WHEN** an origin without `notice`, `citation` and `disclaimer` is typed as `DataSourceOrigin`
- **THEN** it type-checks

#### Scenario: Live sources carry origins

- **WHEN** a `LiveDataSource` is built without `origins`
- **THEN** type-checking fails

### Requirement: Energy sources wire types

The `shared` package SHALL export, from `packages/shared/src/lib/energy-sources.ts` and the package root: the runtime constant `ENERGY_SOURCE_IDS` (`['coal', 'gas', 'oil', 'nuclear', 'hydro', 'wind', 'solar', 'bioenergyOther']`, `as const`: the one definition of the sources and of their fixed order, read by the API builder, the web helpers and the chart palette), the runtime constant `RENEWABLE_SOURCE_IDS` (`['hydro', 'wind', 'solar', 'bioenergyOther']`), and the types `EnergySourceId`, `EnergySourcesEntity` and `EnergySourcesData`. `EnergySourcesEntity` is `CountryEntity & { generation: Record<EnergySourceId, (number | null)[]> }` and `EnergySourcesData` is `{ startYear: number; endYear: number; unit: string; dataset: DatasetIdentity; origin: DataSourceOrigin; entities: EnergySourcesEntity[] }`. Doc comments SHALL state that array index `i` is the year `startYear + i`, that values are terawatt-hours rounded to 2 decimals, that `bioenergyOther` is bioenergy plus other renewables excluding bioenergy, that the data covers electricity (not primary energy) from 2000, that `null` means the provider reports no value (never zero), and that **shares are not on the wire**: they are derived from `generation` by the web. `ApiResponse<EnergySourcesData>` SHALL type-check for the endpoint's success response, including `meta`.

#### Scenario: Types and constants are exported from the root

- **WHEN** a file imports `ENERGY_SOURCE_IDS`, `RENEWABLE_SOURCE_IDS`, `EnergySourceId`, `EnergySourcesData` and `EnergySourcesEntity` from `@eco-metrics/shared`
- **THEN** TypeScript resolves them in both apps

#### Scenario: Fixed order and renewables subset

- **WHEN** `ENERGY_SOURCE_IDS` and `RENEWABLE_SOURCE_IDS` are read
- **THEN** the first equals the eight ids in the order above and every id of the second is in the first

#### Scenario: Incomplete source record fails type-checking

- **WHEN** an entity's `generation` object lacks one of the eight source keys
- **THEN** type-checking fails

### Requirement: Waste and recycling wire types

The `shared` package SHALL export, as types only, the payload of the waste-recycling endpoint: `WasteTreatmentGroup`, `WasteCompositionGroup`, `WasteGeneration`, `WasteCountry` and `WasteRecyclingData`. Every share SHALL be a percent or `null` (not reported) in a `Record` keyed by its group, so a missing group fails type-checking and "not reported" is never confused with 0.

#### Scenario: Group names

- **WHEN** the group types are read
- **THEN** `WasteTreatmentGroup` is `recycling`, `composting`, `incineration`, `sanitaryLandfill`, `otherLandfill`, `openDump`, `uncollected` or `other`
- **AND** `WasteCompositionGroup` is `foodOrganic`, `paperCardboard`, `plastic`, `glass`, `metal` or `other`

#### Scenario: Payload shape

- **WHEN** a `WasteRecyclingData` value is built
- **THEN** each `WasteCountry` has the shared country entity, its 2022 `population` (or `null`), a `WasteGeneration` (kg per person per day and tonnes for 2022, tonnes for 2030, 2040 and 2050, reported year or `null`), an optional treatment and an optional composition, each with its data year
- **AND** `world` has the world generation and the recycling summary (tonnage-weighted share recycled, number of reporting countries, their share of the world's population)
- **AND** `dataset` has the title and the publisher's suggested citation of the published dataset, so the page cites it from the payload

#### Scenario: Missing group fails type-checking

- **GIVEN** a treatment value without the `openDump` share
- **WHEN** it is type-checked as a `WasteCountry` treatment
- **THEN** type-checking fails

#### Scenario: Country without treatment

- **GIVEN** a `WasteCountry` value with generation and no treatment or composition
- **WHEN** it is type-checked
- **THEN** it compiles
