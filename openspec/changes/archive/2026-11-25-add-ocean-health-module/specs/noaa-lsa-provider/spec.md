## ADDED Requirements

### Requirement: A NOAA LSA client reads the altimetry CSV

The API SHALL provide a `NoaaLsaClient` (in `apps/api/src/modules/providers/noaa-lsa/`) that fetches `{NOAA_LSA_BASE_URL}/slr_sla_gbl_free_ref_90.csv` through the shared `OutboundHttpClient` and returns the trend, the mission names and one row per data line (decimal year and one value or `null` per mission).

#### Scenario: Trend and rows

- **GIVEN** the committed fixture
- **WHEN** the client parses it
- **THEN** the trend value is `3.11` with unit `mm/year`, and each row has one entry per mission column

#### Scenario: Blank cells are null

- **GIVEN** a row `1992.96140,-19.33000,,,,`
- **WHEN** it is parsed
- **THEN** only the first mission has a value

#### Scenario: Cached between calls

- **GIVEN** two calls within `NOAA_LSA_CACHE_TTL_SECONDS`
- **WHEN** the transport is counted
- **THEN** it was called once, and callers never share references with the cache

### Requirement: The NOAA LSA parser rejects a changed layout

The parser SHALL throw `ProviderDataError` when the trend line, the header or a row is not as expected.

#### Scenario: Missing or malformed trend

- **GIVEN** a CSV without a `#trend = <number> <unit> (<note>)` line
- **WHEN** it is parsed
- **THEN** `ProviderDataError` is thrown

#### Scenario: Bad header or values

- **GIVEN** a header that does not start with `year` or has no mission columns, a non-numeric year or value, or no data rows
- **WHEN** it is parsed
- **THEN** `ProviderDataError` is thrown

### Requirement: NOAA LSA is declared once as a live data source

A `NoaaLsaStatus` provider decorated with `@DataSourceContributor()` SHALL declare one live data source with id `noaa-lsa` for category `ocean-health`, with retrieval time as its timestamp basis (the feed carries none).

#### Scenario: Catalog entry

- **WHEN** the data sources catalog is collected
- **THEN** it contains one provider with id `noaa-lsa`, provider `NOAA Laboratory for Satellite Altimetry`, license `Public domain`, source URL `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/`, categories `['ocean-health']` and basis `retrieval`

#### Scenario: Origin acknowledgment

- **WHEN** the origin is read
- **THEN** its `notice` is exactly "Altimetry data are provided by NOAA Laboratory for Satellite Altimetry." and its license name and URL were verified against NOAA's data policy page

#### Scenario: Publisher is resolvable by host

- **WHEN** `resolvePublisher('https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/')` is called
- **THEN** it returns `NOAA_LSA_PUBLISHER`

### Requirement: NOAA LSA reachability is one dependency indicator

`NoaaLsaHealthIndicator` SHALL check the CSV URL with a `HEAD` request, a 3000 ms timeout and the API `User-Agent`.

#### Scenario: Reachable and down

- **GIVEN** the injected HTTP client answering 200, then failing
- **WHEN** the indicator checks twice
- **THEN** `noaa-lsa.status` is `up`, then `down`
