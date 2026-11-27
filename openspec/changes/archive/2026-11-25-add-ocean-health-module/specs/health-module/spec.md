## ADDED Requirements

### Requirement: Dependencies health covers every live provider

`DependenciesHealthController` SHALL run one indicator per live provider (`owid`, `copernicus-climate-pulse`, `noaa-lsa`), not one per category, keeping its Terminus-native body.

#### Scenario: All providers reachable

- **GIVEN** the injected HTTP client answering 200 for every URL
- **WHEN** `GET /api/v1/health/dependencies` is called
- **THEN** it answers `200` and `info` has `owid`, `copernicus-climate-pulse` and `noaa-lsa` all `up`

#### Scenario: One provider down

- **GIVEN** only the NOAA LSA URL failing
- **WHEN** the endpoint is called
- **THEN** it answers `503`, `error` has `noaa-lsa` `down` and `info` still has the other two `up`

#### Scenario: Probes use HEAD

- **WHEN** the two new indicators check
- **THEN** their requests use method `HEAD` at `{base URL}/<file>.csv` with a 3000 ms timeout and the API `User-Agent`

#### Scenario: Swagger example

- **WHEN** the endpoint's Swagger example is read
- **THEN** it lists all three keys

#### Scenario: Liveness is untouched

- **WHEN** the liveness controller test runs
- **THEN** `HealthController` still takes no provider dependency and `GET /api/v1/health` calls no provider
