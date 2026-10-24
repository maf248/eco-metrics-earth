## ADDED Requirements

### Requirement: Data sources catalog types

The `shared` package SHALL export, from the package root and as types only (no data, no runtime values), the following for the data-sources catalog: `DataSourceTimestampBasis` (`'provider' | 'retrieval'`); `DataSourcePublisher` (`Pick<DataSourceAttribution, 'provider' | 'license' | 'sourceUrl'>`); `LiveDataSource` (extends `DataSourceAttribution` with `id`, `description`, `categories: EcoCategory[]`, `lastUpdatedBasis: DataSourceTimestampBasis`); `DataSourcePublication` (`citation`, `url`, `publishedYear: number`, `entryCount`, optional `publisher`); `StaticDataSource` (`id`, `name`, `description`, `categories: EcoCategory[]`, `publications`; no `lastUpdated`, because a static dataset's dates are the publication years of its citations); and `DataSourcesCatalog` (`providers: LiveDataSource[]`, `datasets: StaticDataSource[]`). The existing `DataSourceAttribution`, `ApiResponseMeta` and `ApiResponse` definitions SHALL be unchanged. `WaterFootprintProduct` SHALL gain one optional field, `publisher?: DataSourcePublisher`, and no other change.

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
