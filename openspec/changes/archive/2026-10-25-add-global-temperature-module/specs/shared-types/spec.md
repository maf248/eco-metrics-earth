## ADDED Requirements

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

## MODIFIED Requirements

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
