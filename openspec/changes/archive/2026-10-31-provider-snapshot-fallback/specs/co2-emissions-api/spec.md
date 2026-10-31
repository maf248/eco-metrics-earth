## MODIFIED Requirements

### Requirement: Provider failures and unusable data become 502

When the OWID client or transport throws and the BFF holds no stored snapshot for the category (see `provider-snapshot-fallback`), the endpoint SHALL respond `502` in the `ApiResponse` error format (see `provider-failure-contract`); when it holds one, it SHALL respond `200` with the stored payload and `meta.stale: true`. When the provider answers but the content is unusable (no `OWID_WRL` entity, no rows, no value in any year) the service SHALL throw `ProviderDataError`, which is handled the same way. The endpoint SHALL NOT return partial data.

#### Scenario: Transport failure

- **GIVEN** the OWID transport stub failing every attempt with a 503 and no stored snapshot
- **WHEN** `GET /api/v1/co2-emissions` is called
- **THEN** the response is `502` with `success: false`

#### Scenario: Malformed CSV

- **GIVEN** a stub returning a CSV whose header does not start with `entity,code,year` and no stored snapshot
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: World missing

- **GIVEN** fixtures that contain countries but no `OWID_WRL` and no stored snapshot
- **WHEN** the endpoint is called
- **THEN** the response is `502` and no `data` is returned

#### Scenario: Transport failure with a stored snapshot

- **GIVEN** the OWID transport stub failing every attempt and a stored snapshot of this category
- **WHEN** the endpoint is called
- **THEN** the response is `200` with the stored `data`, `meta.stale: true` and the snapshot's `meta.fetchedAt`
