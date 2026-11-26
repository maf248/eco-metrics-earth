# ocean-health-api Specification

## Purpose

The five BFF endpoints under `/api/v1/ocean-health/` that serve the ocean health sections, each with its own provider, envelope and snapshot fallback.

## Requirements

### Requirement: Five section endpoints, each with its own envelope

The API SHALL expose five endpoints under `GET /api/v1/ocean-health/` (`sea-surface-temperature`, `sea-surface-anomaly`, `ocean-heat-content`, `sea-level`, `ocean-ph`), each answering `ApiResponse<T>` with the `meta.source` of the provider that serves that section.

#### Scenario: Each endpoint answers with its own source

- **GIVEN** all providers stubbed with fixtures
- **WHEN** the five endpoints are requested
- **THEN** each answers `200` with `success: true` and the matching payload type
- **AND** `meta.source` names Copernicus Climate Pulse, Our World in Data, Our World in Data, NOAA Laboratory for Satellite Altimetry and Our World in Data respectively, with the payload's own `lastUpdated`

#### Scenario: Routes are documented and parameterless

- **WHEN** the Swagger document and a request with an unknown query parameter are inspected
- **THEN** the routes are tagged `Ocean Health` with `@ApiOkResponse` and `@ApiBadGatewayResponse`, and the unknown parameter is ignored

### Requirement: Each section is resolved through its own snapshot

Each section service SHALL return `ProviderSnapshotService.resolve(<key>, () => this.assemble())` with its own key, so one provider failing affects only its section.

#### Scenario: Snapshot keys

- **WHEN** the services are inspected
- **THEN** the keys are `ocean-health-sea-surface-temperature`, `ocean-health-sea-surface-anomaly`, `ocean-health-heat-content`, `ocean-health-sea-level` and `ocean-health-ph`

#### Scenario: One provider failing leaves the other sections intact

- **GIVEN** the Copernicus transport answers `503` and no snapshot is stored
- **WHEN** all five endpoints are requested
- **THEN** `sea-surface-temperature` answers `502` through the global filter
- **AND** the other four answer `200`

#### Scenario: A stored snapshot is served stale

- **GIVEN** a stored snapshot for `ocean-health-sea-level` and the NOAA LSA transport failing
- **WHEN** `GET /api/v1/ocean-health/sea-level` is requested
- **THEN** it answers `200` with `meta.stale: true` and the snapshot's `meta.fetchedAt`

#### Scenario: A plain Error is not masked

- **GIVEN** a builder throwing a plain `Error`
- **WHEN** the endpoint is requested
- **THEN** the response is `500`, never a snapshot

### Requirement: The daily sea surface temperature is reduced in the BFF

`GET /ocean-health/sea-surface-temperature` SHALL serve `OceanSstDailyData`, a compact calendar-day-aligned reduction of the Copernicus rows; the raw CSV SHALL NOT be part of any response.

#### Scenario: Calendar-day alignment

- **GIVEN** rows for a common year and a leap year
- **WHEN** the payload is built
- **THEN** `years` has one entry per calendar year, ascending, each with 366 slots indexed by month-day in a leap year
- **AND** 1 March has the same slot in both years and the 29 February slot is `null` in the common year

#### Scenario: Latest value and its date

- **GIVEN** rows ending on 2026-11-22
- **WHEN** the payload is built
- **THEN** `latest.date` is `2026-11-22` and `endYear` is `2026` (the year of the latest row, never the clock)
- **AND** every later slot of that year is `null`

#### Scenario: Record is the highest absolute value

- **GIVEN** a series whose highest anomaly is on a different day from its highest `sst`
- **WHEN** the payload is built
- **THEN** `record` is the row with the highest `sst`

#### Scenario: Ties name the most recent date

- **GIVEN** two rows with the same highest `sst`
- **WHEN** the payload is built
- **THEN** `record.date` is the later one

#### Scenario: Climatology and constants

- **WHEN** the payload is built
- **THEN** `climatology` is the 366-slot 1991-2020 curve from the data, `unit` is `°C`, `baseline` is 1991-2020 and `coverage` is `60°S–60°N`, with values at the source's three decimals

#### Scenario: Recent rows are bounded

- **GIVEN** more than 90 days of data
- **WHEN** the payload is built
- **THEN** `recent` has exactly 90 entries, ascending, the last being `latest`

#### Scenario: Preliminary status is preserved

- **GIVEN** a final row followed by a `PRELIMINARY` row
- **WHEN** the payload is built
- **THEN** `latest.status` is `preliminary`

#### Scenario: Unknown status is a provider error

- **GIVEN** a row with status `DRAFT`
- **WHEN** the payload is built
- **THEN** the builder throws `ProviderDataError`

#### Scenario: Payload stays compact

- **GIVEN** a synthetic dataset of full size (1979 to the current year)
- **WHEN** the payload is serialized and gzipped
- **THEN** it is under about 80 KB

#### Scenario: Empty data

- **GIVEN** a CSV with no data rows
- **WHEN** the section is assembled
- **THEN** it throws `ProviderDataError` and the endpoint answers `502`

### Requirement: The annual sea surface temperature anomaly is verified before it is served

`GET /ocean-health/sea-surface-anomaly` SHALL serve `OceanSstAnomalyData` for World, Northern Hemisphere and Southern Hemisphere from the OWID chart `sea-surface-temperature-anomaly`, failing with `ProviderDataError` when the provider's description does not confirm the 1861-1890 baseline.

#### Scenario: The request names the chart tab and the entities

- **WHEN** the service assembles the section with a stubbed transport
- **THEN** the requested URL contains `tab=chart` and `country=OWID_NH~OWID_SH~OWID_WRL`, and the three value columns (mean, lower, upper) are read

#### Scenario: Three regions in order

- **GIVEN** a fixture with the three entities
- **WHEN** the payload is built
- **THEN** `regions` lists World, Northern Hemisphere, Southern Hemisphere with arrays of equal length, rounded to 2 decimals without `-0`
- **AND** `dataset` and `lastUpdated` come from the indicator metadata

#### Scenario: Partial current year is not served

- **GIVEN** rows including the current UTC year and an injected clock
- **WHEN** the payload is built
- **THEN** `endYear` is the previous UTC year

#### Scenario: Baseline mismatch is a provider error

- **GIVEN** a description that states a 1961-1990 baseline, or no description
- **WHEN** the payload is built
- **THEN** the builder throws `ProviderDataError`

#### Scenario: Map-tab shaped response is rejected

- **GIVEN** a World series with fewer than two years of values
- **WHEN** the payload is built
- **THEN** the builder throws `ProviderDataError`

### Requirement: Ocean heat content serves both depths with every source

`GET /ocean-health/ocean-heat-content` SHALL serve `OceanHeatContentData`: World only, in `10²² J`, for 0-700 m (IAP, NOAA, MRI/JMA, CSIRO) and 0-2000 m (NOAA, MRI/JMA, IAP), on one shared year range.

#### Scenario: Sources per depth

- **GIVEN** the two fixtures
- **WHEN** the payload is built
- **THEN** the `700m` depth has sources `iap`, `noaa`, `mri`, `csiro` and the `2000m` depth has `noaa`, `mri`, `iap`

#### Scenario: Sources with different spans

- **GIVEN** CSIRO ending in 2015 and NOAA in 2025
- **WHEN** the payload is built
- **THEN** CSIRO's array has `null` after 2015 (never zero) and every array has the same length

#### Scenario: Origins and datasets

- **WHEN** the payload is built
- **THEN** `origins` lists the producers of both charts (NOAA NCEI and the US EPA) with the licenses and notices the OWID indicator metadata records, and `dataset` is set per depth

#### Scenario: Missing column or unit is a provider error

- **GIVEN** a CSV without the NOAA 2000 m column, or a unit that is not joules based
- **WHEN** the payload is built
- **THEN** the builder throws `ProviderDataError`

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

### Requirement: Ocean pH is served as aligned monthly and rolling values

`GET /ocean-health/ocean-ph` SHALL serve `OceanPhData` for the entity `Hawaii` from the OWID chart `seawater-ph`, read through the dated-series method, with `monthly` and `yearlyAverage` aligned to ascending ISO `dates`.

#### Scenario: Aligned columns

- **GIVEN** the fixture rows
- **WHEN** the payload is built
- **THEN** `dates`, `monthly` and `yearlyAverage` have equal length and a blank cell is `null`
- **AND** `unit` is `pH`, `station` is `Hawaii` and `origin` is the Hawaii Ocean Time-series (SOEST, University of Hawaii)

#### Scenario: No cap is applied

- **GIVEN** rows up to a recent month
- **WHEN** the payload is built
- **THEN** every row is served (the previous-year cap applies only to annual series)

#### Scenario: Unexpected entity or no monthly value

- **GIVEN** a CSV with another entity, or with no monthly value in any row
- **WHEN** the section is assembled
- **THEN** it throws `ProviderDataError`

### Requirement: Non-OWID responses use a generic envelope

`common/envelope/provider-envelope.ts` SHALL export `buildProviderEnvelope(publisher, data, lastUpdated, { fetchedAt, stale })`, and `buildOwidEnvelope` SHALL delegate to it with `OWID_PUBLISHER`.

#### Scenario: OWID output is unchanged

- **WHEN** the existing CO2, global temperature and energy sources controller tests run unmodified
- **THEN** they pass

#### Scenario: Generic envelope shape

- **WHEN** `buildProviderEnvelope` is called with the NOAA LSA publisher
- **THEN** the result has `success: true`, `status: 200`, `meta.source` equal to the publisher plus `lastUpdated`, and the given `fetchedAt` and `stale`

#### Scenario: Layering

- **WHEN** imports under `common/` are checked
- **THEN** none points into `modules/`

### Requirement: OWID registers the category and its origins once

The ocean-health services that read OWID SHALL register the category and the static origins of their producers on `OwidProviderStatus` and record each fresh update, leaving a single `owid` catalog entry.

#### Scenario: Single OWID entry

- **WHEN** the catalog is collected with all four OWID-backed categories
- **THEN** exactly one entry has id `owid` and its categories include `ocean-health`
- **AND** its origins include the HadSST, ocean heat content and Hawaii Ocean Time-series producers, sorted by producer then title

#### Scenario: Both new providers are listed

- **WHEN** the catalog is collected
- **THEN** it also lists `copernicus-climate-pulse` and `noaa-lsa`, each with category `ocean-health` and its origin

### Requirement: Fixture-based tests with zero network calls

Tests of the section builders, services and controller SHALL use fixtures captured once from the exact URLs the services request, the transport stubbed through `OUTBOUND_FETCH`, and no network.

#### Scenario: No network

- **WHEN** `npx nx test api` runs
- **THEN** no test reaches a provider and no test emits a warning or error

#### Scenario: Fixtures and module wiring

- **WHEN** the fixtures folder and the `AppModule` compile test are inspected
- **THEN** fixtures live under `apps/api/__tests__/ocean-health/fixtures/` with a note on every hand edit, and `AppModule` compiles with `OceanHealthModule`
