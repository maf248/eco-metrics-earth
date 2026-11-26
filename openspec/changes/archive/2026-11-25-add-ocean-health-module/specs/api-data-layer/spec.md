## ADDED Requirements

### Requirement: Copernicus Climate Pulse and NOAA LSA environment variables validated at startup

The Joi env-validation schema SHALL validate four optional variables with defaults, exposed by `AppConfigService` as `copernicusClimatePulseBaseUrl`, `copernicusClimatePulseCacheTtlSeconds`, `noaaLsaBaseUrl` and `noaaLsaCacheTtlSeconds`, and documented in `.env.example` and the READMEs.

#### Scenario: Defaults apply when variables are absent

- **WHEN** the API starts with none of the four variables set
- **THEN** the getters return `https://sites.ecmwf.int/data/climatepulse/data/series`, `21600`, `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr` and `604800`, and the API starts

#### Scenario: Trailing slash fails startup

- **WHEN** `NOAA_LSA_BASE_URL` ends with `/`
- **THEN** validation throws with the same trailing-slash message the OWID base URLs use

#### Scenario: Out-of-bounds TTL fails startup

- **WHEN** `COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS` is outside 60 to 86400 (for example `10`) or `NOAA_LSA_CACHE_TTL_SECONDS` is outside 3600 to 2592000 (for example `60`)
- **THEN** validation throws and the API does not start

#### Scenario: Documentation is in sync

- **WHEN** `.env.example` and both READMEs are read
- **THEN** all four variables appear with their defaults

#### Scenario: Shared HTTP timeout

- **WHEN** a new provider client requests a file
- **THEN** the shared `OutboundHttpClient` applies `OWID_HTTP_TIMEOUT_MS` as it does for OWID
