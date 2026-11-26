## ADDED Requirements

### Requirement: Each ocean health section keeps its own snapshot

Each of the five ocean-health services SHALL use its own fixed snapshot key, so a provider outage serves the stored last good payload of that section only, under the existing write policy.

#### Scenario: Stale snapshot per section

- **GIVEN** a snapshot stored for `ocean-health-sea-surface-temperature` and the Copernicus transport failing
- **WHEN** that endpoint is requested
- **THEN** it answers `200` with `meta.stale: true` while the OWID-backed endpoints answer fresh

#### Scenario: No snapshot is a 502 for that section only

- **GIVEN** no snapshot for `ocean-health-sea-level` and the NOAA LSA transport failing
- **WHEN** all endpoints are requested
- **THEN** only `sea-level` answers `502`

#### Scenario: Keys are valid and fixed

- **WHEN** the five keys are validated against the snapshot key pattern
- **THEN** every key matches `^[a-z0-9-]+$` and is a developer constant (`ocean-health-sea-surface-temperature`, `-sea-surface-anomaly`, `-heat-content`, `-sea-level`, `-ph`)

#### Scenario: Write policy and tests

- **WHEN** the section snapshots are persisted in tests
- **THEN** the existing write policy applies unchanged and the stub `SnapshotStore` is used, never GCP

#### Scenario: A plain Error is not masked

- **GIVEN** a builder throwing a plain `Error`
- **WHEN** the endpoint is requested
- **THEN** the response is `500`, never a snapshot
