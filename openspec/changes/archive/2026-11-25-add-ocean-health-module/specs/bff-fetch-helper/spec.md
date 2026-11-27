## ADDED Requirements

### Requirement: Ocean health fetches built on the helper

`apps/web/src/lib/oceanHealth.ts` (`server-only`) SHALL export five loaders (`getOceanSst`, `getOceanSstAnomaly`, `getOceanHeatContent`, `getOceanSeaLevel`, `getOceanPh`) built on `fetchProviderPayloadFromBff`, each resolving `ok` with `{ data, meta }` or `provider-unavailable`.

#### Scenario: Valid payload

- **GIVEN** a BFF answering a valid envelope for each path
- **WHEN** each loader runs
- **THEN** it resolves `ok` with the payload and its `meta`

#### Scenario: Provider 502

- **GIVEN** the BFF answering its provider-error `502`
- **WHEN** a loader runs
- **THEN** it resolves `provider-unavailable`

#### Scenario: Malformed payload

- **GIVEN** a payload with a 365-slot daily array, unequal year-aligned or date-aligned lengths, an origin without a string `notice`, a non-ISO date, or no missions or sources
- **WHEN** the loader runs
- **THEN** its shape guard rejects it, it retries past the Data Cache and then throws

#### Scenario: Paths

- **WHEN** the five loaders are called
- **THEN** they request `/ocean-health/sea-surface-temperature`, `/sea-surface-anomaly`, `/ocean-heat-content`, `/sea-level` and `/ocean-ph`
