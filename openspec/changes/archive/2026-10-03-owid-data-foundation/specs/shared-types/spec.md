## ADDED Requirements

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

The `shared` package SHALL export an `ApiResponseMeta` interface — `{ source: DataSourceAttribution; fetchedAt: string }` — where `fetchedAt` is an ISO 8601 timestamp of when the BFF fetched (or cached) the data. It is the payload of `ApiResponse<T>.meta`, defined by the `api-response-type` capability.

#### Scenario: Meta composes attribution and fetch time

- **GIVEN** a BFF response that serves provider data
- **WHEN** its `meta` is constructed
- **THEN** `meta.source` is a `DataSourceAttribution` and `meta.fetchedAt` is an ISO 8601 string

#### Scenario: The type is exported from the package root

- **WHEN** any workspace project imports `ApiResponseMeta` from `@eco-metrics/shared`
- **THEN** TypeScript resolves the type without errors
