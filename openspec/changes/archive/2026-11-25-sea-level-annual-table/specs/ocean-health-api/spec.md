## MODIFIED Requirements

### Requirement: Global mean sea level is served per mission

`GET /ocean-health/sea-level` SHALL serve `OceanSeaLevelData` from the NOAA LSA CSV, one entry per mission that has values, with the trend and the data start and end dates derived from the data, and `annual`: for every mission, the mean of its observations in each calendar year, rounded to 2 decimals and aligned on one year range shared by all missions.

#### Scenario: Missions with sparse columns

- **GIVEN** a CSV where each mission column is filled only in its own period
- **WHEN** the payload is built
- **THEN** each mission has only its own `dates` and `values` (millimetres, no nulls), equal in length

#### Scenario: Decimal year to date

- **GIVEN** a row with year `2025.12680`
- **WHEN** the payload is built
- **THEN** its date is in February 2025 (UTC) and `endDate` equals the latest mission date

#### Scenario: Trend is parsed

- **GIVEN** the header line `#trend = 3.11 mm/year (no glacial isostatic adjustment correction)`
- **WHEN** the payload is built
- **THEN** `trend` is `{ value: 3.11, unit: 'mm/year', note: 'no glacial isostatic adjustment correction' }`

#### Scenario: Missing trend is a provider error

- **GIVEN** a CSV without a `#trend` line
- **WHEN** the section is assembled
- **THEN** it throws `ProviderDataError`

#### Scenario: Acknowledgment and timestamp

- **WHEN** the payload is built
- **THEN** `origin.notice` equals "Altimetry data are provided by NOAA Laboratory for Satellite Altimetry." and `lastUpdated` is the retrieval time

#### Scenario: Yearly mean per mission

- **GIVEN** mission A observed 10 and 20 mm in 2001 and 30 mm in 2002, and mission B observed 25 mm in 2002 and 40 mm in 2003
- **WHEN** the payload is built
- **THEN** `annual` is `{ startYear: 2001, endYear: 2003 }` with A `[15, 30, null]` and B `[null, 25, 40]`, in mission order

#### Scenario: Yearly mean is rounded

- **GIVEN** a mission whose observations in one year average 10.12345 mm
- **WHEN** the payload is built
- **THEN** its `annual` value for that year is `10.12`
