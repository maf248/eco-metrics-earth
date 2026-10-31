## MODIFIED Requirements

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
