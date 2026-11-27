# copernicus-climate-pulse-provider Specification

## Purpose

API client, parser, catalog entry and health check for the Copernicus Climate Pulse daily sea surface temperature series (ERA5, CC BY 4.0).

## Requirements

### Requirement: A Copernicus Climate Pulse client reads the daily CSV

The API SHALL provide a `CopernicusClimatePulseClient` (in `apps/api/src/modules/providers/copernicus-climate-pulse/`) that fetches `{COPERNICUS_CLIMATE_PULSE_BASE_URL}/era5_daily_series_sst_60S-60N_ocean.csv` through the shared `OutboundHttpClient` and returns parsed rows `{ date, sst, climatology, anomaly, status }`.

#### Scenario: Header comments are skipped

- **GIVEN** a CSV with 20 `#` lines before the header
- **WHEN** the client parses it
- **THEN** only the data rows are returned, in file order

#### Scenario: Cached between calls

- **GIVEN** two calls within `COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS`
- **WHEN** the transport is counted
- **THEN** it was called once, and callers never share references with the cache

#### Scenario: Transport failures are provider errors

- **GIVEN** the transport answering `503` three times
- **WHEN** the client is called
- **THEN** it throws an error that is a `ProviderError`

### Requirement: The Copernicus parser rejects a changed layout

The parser SHALL throw `ProviderDataError` when the header, the units or a row is not the expected one, so a changed file fails instead of mislabelling a chart.

#### Scenario: Header mismatch

- **GIVEN** a CSV whose header is not `date,sst,clim_91-20,ano_91-20,status` (for example `clim_81-10`)
- **WHEN** the client parses it
- **THEN** it throws `ProviderDataError`

#### Scenario: Unit mismatch

- **GIVEN** a CSV whose units line says `K` instead of `deg. C`
- **WHEN** the client parses it
- **THEN** it throws `ProviderDataError`

#### Scenario: Malformed row

- **GIVEN** a row with a non-numeric `sst` or a date that is not ISO `YYYY-MM-DD`
- **WHEN** the client parses it
- **THEN** it throws `ProviderDataError` naming the line

### Requirement: The provider timestamp comes from the file

The client SHALL take the provider timestamp from the `# Last updated: <D Mon YYYY>` line, falling back to the date of the latest row.

#### Scenario: Timestamp from the header

- **GIVEN** the line `# Last updated: 24 Nov 2026`
- **WHEN** the client parses it
- **THEN** the provider timestamp is `2026-11-24T00:00:00.000Z`

#### Scenario: Fallback

- **GIVEN** no such line
- **WHEN** the client parses it
- **THEN** the timestamp is the latest row's date at UTC midnight

### Requirement: Copernicus Climate Pulse is declared once as a live data source

A `CopernicusClimatePulseStatus` provider decorated with `@DataSourceContributor()` SHALL declare one live data source with id `copernicus-climate-pulse` for category `ocean-health`.

#### Scenario: Catalog entry

- **WHEN** the data sources catalog is collected
- **THEN** it contains one provider with id `copernicus-climate-pulse`, provider `Copernicus Climate Pulse`, license `CC BY 4.0`, source URL `https://pulse.climate.copernicus.eu`, categories `['ocean-health']` and one origin

#### Scenario: Origin credit

- **WHEN** the origin is read
- **THEN** its producer is Copernicus Climate Change Service (C3S) / ECMWF with `CC BY 4.0`, the credit notice and the no-liability disclaimer verified against the Climate Pulse terms before the constants are written

#### Scenario: Timestamp basis

- **GIVEN** no update recorded yet
- **WHEN** the entry is read
- **THEN** its basis is `retrieval`; after `recordProviderUpdate` it is `provider` with that timestamp

#### Scenario: Publisher is resolvable by host

- **WHEN** `resolvePublisher` is called with `https://pulse.climate.copernicus.eu/` or `https://sites.ecmwf.int/data/climatepulse/`
- **THEN** it returns `COPERNICUS_CLIMATE_PULSE_PUBLISHER`

### Requirement: Copernicus reachability is one dependency indicator

`CopernicusClimatePulseHealthIndicator` SHALL check the CSV URL with a `HEAD` request, so a probe never downloads the file.

#### Scenario: Reachable

- **GIVEN** the injected HTTP client answering 200
- **WHEN** the indicator checks
- **THEN** `copernicus-climate-pulse.status` is `up`, the method was `HEAD`, the timeout 3000 ms and the API `User-Agent` was sent

#### Scenario: Down

- **GIVEN** the injected HTTP client failing
- **WHEN** the indicator checks
- **THEN** the key is `down`
