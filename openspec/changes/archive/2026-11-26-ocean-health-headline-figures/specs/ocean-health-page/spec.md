## MODIFIED Requirements

### Requirement: Key figures state the latest daily value

The first figure of the key figures panel SHALL state, as server-rendered text from the Copernicus payload, the latest daily SST, its anomaly against the 1991–2020 average, its date and the `60°S–60°N` coverage, flagging a preliminary value, and on a second line the highest daily value of the series with its date.

#### Scenario: Latest value

- **GIVEN** `latest = { date: '2026-11-22', sst: 20.875, anomaly: 0.758, status: 'final' }`
- **WHEN** the key figures render
- **THEN** the figure shows 20.88 °C, `+0.76 °C` against the 1991–2020 average, 22 Nov 2026 (UTC, in `<time dateTime>`) and `60°S–60°N`
- **AND** no "preliminary" text appears and the copy never says "today"

#### Scenario: Preliminary value is flagged

- **GIVEN** `latest.status` is `preliminary`
- **WHEN** the key figures render
- **THEN** the figure contains "preliminary"

#### Scenario: Negative anomaly uses the real minus sign

- **GIVEN** `latest.anomaly = -0.154`
- **WHEN** the key figures render
- **THEN** the figure shows `−0.15 °C` with U+2212

#### Scenario: Daily record line

- **GIVEN** `record = { date: '2026-08-24', sst: 21.109 }` and a series starting in 1979
- **WHEN** the key figures render
- **THEN** the figure's second line names the daily record since 1979, 21.11 °C on 24 Aug 2026, and no gap to the record is shown

#### Scenario: Latest is the record

- **GIVEN** `latest` and `record` are the same row
- **WHEN** the key figures render
- **THEN** the second line says the latest value is the daily record since the first year

### Requirement: Global mean sea level per satellite mission

A section SHALL draw one line per mission, each with its own palette color, a legend and a time axis, with the trend, the rise from the first to the latest observation and the data end date shown as text.

#### Scenario: One line per mission

- **GIVEN** five missions in the payload
- **WHEN** the option is built
- **THEN** it has five line series with distinct palette positions, and no zero line is drawn

#### Scenario: End date comes from the data

- **GIVEN** `endDate` is `2025-02-15`
- **WHEN** the section renders
- **THEN** the note names February 2025 and says the file is not current
- **AND** a payload ending in another month changes the text accordingly

#### Scenario: Trend is shown

- **WHEN** the section renders
- **THEN** the trend value, its unit and its note are visible as text next to the chart

#### Scenario: Rise over the record

- **GIVEN** the earliest observation is −19.33 mm on 1992-12-17 and the latest is 83.6 mm on 2025-02-15
- **WHEN** the section renders
- **THEN** under the trend it says that from the first measurement (17 Dec 1992) to the latest (15 Feb 2025) the global mean sea level rose 103 mm, about 10 cm, in 32 years

### Requirement: Each section degrades independently

Each section SHALL render through `ProviderBackedContent` under its own heading, so a provider outage shows the stale notice or the unavailable state for that section only.

#### Scenario: One provider unavailable

- **GIVEN** the NOAA LSA read resolves `provider-unavailable` and the others resolve data
- **WHEN** the page renders
- **THEN** the sea level section shows the unavailable state naming NOAA Laboratory for Satellite Altimetry under its heading
- **AND** the other sections and the key figures render normally and the page does not throw

#### Scenario: Copernicus unavailable

- **GIVEN** the Copernicus read resolves `provider-unavailable`
- **WHEN** the page renders
- **THEN** the daily chart's slot shows one unavailable state and no daily chart section is rendered
- **AND** the key figures panel shows the other three figures and the other four sections render

#### Scenario: Stale section

- **GIVEN** the OWID anomaly payload is stale and 14 days old
- **WHEN** the page renders
- **THEN** the stale notice appears above that section only

#### Scenario: Copernicus freshness override

- **GIVEN** a stale Copernicus payload 3 days old
- **WHEN** the page renders
- **THEN** the stale notice appears once above the daily chart (silent threshold of 2 days), and the SST figure still names its own date

#### Scenario: Our own BFF failing still throws

- **GIVEN** a section read fails for a reason other than a provider outage
- **WHEN** the page loads
- **THEN** the error propagates as in every other category

#### Scenario: Healthy providers show no degraded UI

- **WHEN** the page renders with all payloads fresh
- **THEN** no `stale-data-notice` and no `data-unavailable` element exists

### Requirement: Each chart credits its sources next to it

Under each chart the "Data:" line SHALL name the publisher, its license and update date through `DataAttribution` and, through `OriginCredit`, the producer credit each license asks for, every string coming from the API payload.

#### Scenario: Credit per section

- **WHEN** each section renders
- **THEN** its attribution shows:
  - daily chart: Copernicus Climate Pulse with the C3S/ECMWF notice and disclaimer;
  - annual anomaly: Our World in Data as processor and the Met Office HadSST notice;
  - heat content: NOAA NCEI and the US EPA, with IAP, MRI/JMA and CSIRO named;
  - sea level: NOAA Laboratory for Satellite Altimetry and its verbatim acknowledgment;
  - pH: Our World in Data as processor and the Hawaii Ocean Time-series (SOEST, University of Hawaii)

#### Scenario: Credits come from the payload

- **GIVEN** a payload whose origin notice is changed
- **WHEN** the section renders
- **THEN** the changed text is shown with no component edit

#### Scenario: Links

- **WHEN** an attribution renders
- **THEN** publisher, producer and license names are external links with the shared link style, and an "All data sources" link goes to `/data-sources/`

## ADDED Requirements

### Requirement: Key figures show ocean warming, sea level rise and acidity

After the daily SST figure the panel SHALL show, as server-rendered text derived from each section's payload, three headline figures, each naming its period and its source.

#### Scenario: Ocean warming

- **GIVEN** the World anomaly is `+1.10` in 2025, the last year, and the highest World anomaly is `+1.21` in 2024
- **WHEN** the key figures render
- **THEN** the figure shows `+1.10 °C` in 2025 against the 1861–1890 average, and "Warmest year: 2024 (+1.21 °C)"
- **AND** when the last year is itself the highest, the second line says it is the warmest year since the first year of the series

#### Scenario: Sea level rise

- **GIVEN** the earliest observation is −19.33 mm on 1992-12-17 and the latest is 83.6 mm on 2025-02-15
- **WHEN** the key figures render
- **THEN** the figure shows `+10 cm` (the change rounded to whole centimetres), Dec 1992 to Feb 2025, and the published trend
- **AND** when two missions observed on the latest date, the value of the mission listed last in the payload is used

#### Scenario: Ocean acidity

- **GIVEN** the first yearly pH average is 8.109 (1989) and the latest is 8.042 (2024)
- **WHEN** the key figures render
- **THEN** the figure shows `+17%` (the change in hydrogen ion concentration, `10^(first − latest) − 1`, rounded to a whole percent), pH 8.11 to 8.04, 1989–2024, at Hawaii
- **AND** a pH that rose shows a negative percentage and says "less acidic"

#### Scenario: Each figure names its source

- **WHEN** the key figures render
- **THEN** each figure ends with its source: Copernicus Climate Pulse, the Met Office Hadley Centre via Our World in Data, the NOAA Laboratory for Satellite Altimetry, and the Hawaii Ocean Time-series via Our World in Data

### Requirement: The key figures panel shows only the figures with data

The panel SHALL sit between the intro and the daily chart and show one figure per section whose payload is shown (fresh or under a stale notice), in the order SST, warming, sea level, acidity; it SHALL NOT be rendered when no figure is available.

#### Scenario: One provider unavailable

- **GIVEN** the NOAA LSA section is unavailable
- **WHEN** the page renders
- **THEN** the panel shows the other three figures and no sea level figure

#### Scenario: Every provider unavailable

- **GIVEN** every section is unavailable
- **WHEN** the page renders
- **THEN** no key figures panel is rendered

#### Scenario: One-sentence intro

- **WHEN** the page renders
- **THEN** the intro is one sentence listing the daily sea surface temperature and the ocean's annual warming, stored heat, sea level and pH

## REMOVED Requirements

### Requirement: Key figures state the daily record and the gap to it

**Reason**: The key figures become a panel of short headline figures; the daily record moves to the second line of the SST figure and the gap to it is dropped.

**Migration**: The record is covered by the "Daily record line" and "Latest is the record" scenarios of "Key figures state the latest daily value".
