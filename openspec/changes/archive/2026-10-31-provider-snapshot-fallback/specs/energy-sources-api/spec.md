## MODIFIED Requirements

### Requirement: Provider failures and unusable data become 502

Provider failures SHALL propagate as `ProviderError` subclasses. When the BFF holds no stored snapshot for the category (see `provider-snapshot-fallback`), the global filter SHALL answer them with `502` and the constant body, with no per-controller mapping; when it holds one, the endpoint SHALL respond `200` with the stored payload and `meta.stale: true`. The service SHALL throw `ProviderDataError` when the provider answered with unusable content. Unexpected errors SHALL stay `500` and SHALL never be replaced by a snapshot.

#### Scenario: Provider down

- **GIVEN** the transport stub fails every request and no snapshot is stored
- **WHEN** `GET /api/v1/energy-sources` is called
- **THEN** the response is `502` with the constant provider-error body

#### Scenario: Unusable or malformed content

- **GIVEN** a CSV without a World row, or whose header lacks the expected columns, and no snapshot is stored
- **WHEN** the endpoint is called
- **THEN** the response is `502`

#### Scenario: Unexpected error stays 500

- **GIVEN** a service bug that throws a plain `Error`, even with a snapshot stored
- **WHEN** the endpoint is called
- **THEN** the response is `500`

#### Scenario: Provider down with a stored snapshot

- **GIVEN** the transport stub fails every request and a snapshot of this category is stored
- **WHEN** `GET /api/v1/energy-sources` is called
- **THEN** the response is `200` with the stored `data`, `meta.stale: true` and the snapshot's `meta.fetchedAt`
