# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
