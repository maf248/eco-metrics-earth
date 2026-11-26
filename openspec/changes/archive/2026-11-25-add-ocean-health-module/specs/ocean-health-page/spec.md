## ADDED Requirements

### Requirement: The page loads its five sections in parallel, server-side

`/ocean-health/` SHALL be registered in `CATEGORY_PAGES` through `defineSectionedProviderCategoryPage` with five sections (`sst`, `anomaly`, `heat`, `seaLevel`, `ph`), each read from its BFF endpoint with a runtime shape guard.

#### Scenario: Provider names per section

- **WHEN** the registry entry is inspected
- **THEN** the sections declare `Copernicus Climate Pulse`, `Our World in Data`, `Our World in Data`, `NOAA Laboratory for Satellite Altimetry` and `Our World in Data`

#### Scenario: Complete HTML on a direct visit

- **GIVEN** `/ocean-health/` is generated
- **WHEN** it is requested without executing JavaScript
- **THEN** the `<h1>`, the intro, the key figures, every section heading, the data tables and the Dataset JSON-LD are present outside any hidden element, with no `loading.tsx` or `<Suspense>` around the data

#### Scenario: Section order

- **WHEN** the page content is read in source order
- **THEN** intro, key figures, daily chart, annual anomaly, ocean heat content, sea level and ocean pH appear in that order

#### Scenario: Toggles do not fetch

- **WHEN** the user changes the region or depth toggle
- **THEN** no network request is made

#### Scenario: Shape guards reject malformed payloads

- **GIVEN** a payload whose `years` entries do not have 366 slots
- **WHEN** the web reads it
- **THEN** the read fails like any other shape mismatch (retry past the Data Cache, then throw)

### Requirement: Key figures state the latest daily value

Server-rendered text above the charts SHALL state the date, absolute value and anomaly of the latest daily SST from the Copernicus payload, flagging a preliminary value.

#### Scenario: Latest value

- **GIVEN** `latest = { date: '2026-11-22', sst: 20.875, anomaly: 0.758, status: 'final' }`
- **WHEN** the key figures render
- **THEN** the text names 22 Nov 2026 (UTC, in `<time dateTime>`), 20.88 °C, `+0.76 °C` relative to the 1991–2020 average and `60°S–60°N`
- **AND** no "preliminary" text appears and the copy never says "today"

#### Scenario: Preliminary value is flagged

- **GIVEN** `latest.status` is `preliminary`
- **WHEN** the key figures render
- **THEN** the text contains "preliminary value"

#### Scenario: Negative anomaly uses the real minus sign

- **GIVEN** `latest.anomaly = -0.154`
- **WHEN** the key figures render
- **THEN** the text shows `−0.15 °C` with U+2212

### Requirement: Key figures state the daily record and the gap to it

Server-rendered text SHALL state the highest daily SST in the series with its date and the gap between the latest value and it.

#### Scenario: Gap to the record

- **GIVEN** `record = { date: '2026-08-24', sst: 21.109 }` and `latest.sst = 20.875`
- **WHEN** the key figures render
- **THEN** the text names the record 21.11 °C on 24 Aug 2026 and "0.23 °C below the record"

#### Scenario: Latest is the record

- **GIVEN** `latest` and `record` are the same row
- **WHEN** the key figures render
- **THEN** the text says the latest value is the highest on record

#### Scenario: Gap rounds to zero

- **GIVEN** a gap that is positive but rounds to 0.00
- **WHEN** the key figures render
- **THEN** the text says "less than 0.01 °C below"

### Requirement: Daily SST chart overlays every year since the first

The first chart SHALL draw one line per year of the Copernicus payload on a calendar-day axis (labelled by month), with earlier years muted, the current and record years highlighted, and the 1991-2020 climatology as a dashed reference curve.

#### Scenario: One line per year

- **GIVEN** a payload with 47 years
- **WHEN** the option is built
- **THEN** it has 47 year series plus the climatology, and the non-highlighted years are `silent`, carry the muted flag and are absent from the legend and tooltip

#### Scenario: Current year ends at the latest date

- **GIVEN** the latest year has values only until 22 November
- **WHEN** the option is built
- **THEN** that year's line stops there (later slots are `null`, gaps never zeros)

#### Scenario: Record year is the current year

- **GIVEN** `record.date` falls in the year of `latest.date`
- **WHEN** the option is built
- **THEN** one highlighted year series exists, and its legend and tooltip entry says it is both the current and the record year

#### Scenario: Record year is an earlier year

- **GIVEN** `record.date` falls in another year
- **WHEN** the option is built
- **THEN** two highlighted series exist with different palette positions

#### Scenario: Legend, tooltip and explanation

- **WHEN** the chart renders
- **THEN** the legend lists only the highlighted series and the climatology labelled `1991–2020 average`, the axis tooltip lists the highlighted series, and a sentence under the chart explains that each grey line is one earlier year

#### Scenario: Option names no color

- **WHEN** the builder output is scanned
- **THEN** it contains no color string; the grey comes from the theme adapter's muted role

#### Scenario: Leap day

- **GIVEN** a leap-year entry
- **WHEN** the tooltip is read for the 29 February slot
- **THEN** it shows 29 Feb for that year and "No data" for years without that day

#### Scenario: First chart and mobile

- **WHEN** the page renders at 360 px
- **THEN** this chart is not deferred, sets its own `aria.label.description` and does not overflow horizontally

### Requirement: Annual SST anomaly with uncertainty band and region toggle

A section SHALL draw the annual sea surface temperature anomaly relative to the pre-industrial average as a line with a 95% uncertainty band and a labelled zero line, with a `MeasureToggle` (legend "Region") for World, Northern Hemisphere and Southern Hemisphere.

#### Scenario: Default region

- **WHEN** the section renders
- **THEN** World is selected and the chart title names World, the baseline from the payload and the unit

#### Scenario: Switching region

- **WHEN** the user selects Southern Hemisphere
- **THEN** the chart, the table and a hidden live-region announcement show that region

#### Scenario: Band follows missing bounds

- **GIVEN** a year without bounds
- **WHEN** the option is built
- **THEN** the band has a gap there

### Requirement: Ocean heat content with a depth toggle and every source overlaid

A section SHALL draw one line per source for the selected depth on a shared year axis with a legend, with a `MeasureToggle` (legend "Depth") for 0–700 m (default) and 0–2000 m.

#### Scenario: Four sources at 700 m, three at 2000 m

- **WHEN** each depth is selected
- **THEN** the chart has four, then three, line series named after their sources, with a stable palette position per source

#### Scenario: Different spans

- **GIVEN** a source with values only to 2015
- **WHEN** the chart is drawn
- **THEN** its line stops there and the table shows an em dash afterwards

#### Scenario: Copy

- **WHEN** the section renders
- **THEN** it states the unit (10²² joules), that each source covers a different period and uses its own reference period (compare shape and trend, not level), and names the groups

### Requirement: Global mean sea level per satellite mission

A section SHALL draw one line per mission, each with its own palette color, a legend and a time axis, with the trend and the data end date shown as text.

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

### Requirement: Ocean pH at Hawaii with an explanatory note

A section SHALL draw the monthly pH measurements as markers with the rolling yearly average as a line over them, and a short note on why the Hawaii station is the reference record for open-ocean acidification.

#### Scenario: Markers and rolling line

- **WHEN** the option is built
- **THEN** the monthly series has symbols and no connecting line, the rolling average is a line drawn after it, and the value axis follows the data

#### Scenario: Blank rolling average in the first year

- **GIVEN** `yearlyAverage` is `null` for the first year
- **WHEN** the chart is drawn
- **THEN** the line starts where values begin

#### Scenario: Note content

- **WHEN** the section renders
- **THEN** the note says it is an open-ocean station far from coasts, measured since October 1988, where falling pH shows the ocean absorbing atmospheric CO2, and that it is one site, not a global average (static copy reviewed against the HOT documentation)

### Requirement: Every chart has a data table disclosure

Under every chart a collapsed `DataTableDisclosure` SHALL give its text equivalent, using `YearDataTable` for year-keyed data and a new generic `RowDataTable` for date-keyed data.

#### Scenario: Every chart has one

- **WHEN** the page is rendered
- **THEN** there are five "View data table" disclosures, each with a distinct accessible description and a keyboard-focusable scroll region, server-rendered for the default selection

#### Scenario: Daily table is bounded

- **GIVEN** a payload whose `recent` holds 90 rows
- **WHEN** the daily section renders
- **THEN** its table has 90 body rows, newest first (Date, SST, Anomaly, 1991–2020 average, Status), and a note "Showing the most recent 90 days"

#### Scenario: Table follows the toggle

- **WHEN** the user selects the 0–2000 m depth
- **THEN** the table's columns are the three 0–2000 m sources

#### Scenario: Sea level and pH tables

- **WHEN** those sections render
- **THEN** the sea level table lists every observation (Date, Mission, Value) and the pH table every monthly row (Date, Monthly, Yearly average), newest first

#### Scenario: Null is an em dash

- **GIVEN** a `null` rolling average
- **WHEN** the pH table renders
- **THEN** the cell shows an em dash

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
- **THEN** the key-figures slot shows one unavailable state and no daily chart section is rendered
- **AND** the other four sections render

#### Scenario: Stale section

- **GIVEN** the OWID anomaly payload is stale and 14 days old
- **WHEN** the page renders
- **THEN** the stale notice appears above that section only

#### Scenario: Copernicus freshness override

- **GIVEN** a stale Copernicus payload 3 days old
- **WHEN** the page renders
- **THEN** the stale notice appears once above the key figures (silent threshold of 2 days)

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
  - daily chart and key figures: Copernicus Climate Pulse with the C3S/ECMWF notice and disclaimer;
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

### Requirement: Page metadata is unique and indexable

The page SHALL have a unique title, meta description, canonical URL with a trailing slash and Open Graph and Twitter fields, built through the existing category metadata path.

#### Scenario: Metadata values

- **WHEN** `generateMetadata` runs for `ocean-health`
- **THEN** the title is "Ocean Health: Sea Temperature, Sea Level & pH", the description is "Ocean health data: daily sea surface temperature and its record, ocean heat content, sea level and ocean pH. Data from Copernicus, NOAA and Our World in Data." (158 characters, unique), the canonical is `{siteUrl}/ocean-health/`, `openGraph` and `twitter` match, and `robots` has no `noindex`

#### Scenario: Heading structure

- **WHEN** the rendered page is inspected
- **THEN** there is exactly one `<h1>` ("Ocean Health") and one `<h2>` per section

#### Scenario: Home card and sitemap

- **WHEN** the home page and the sitemap are built
- **THEN** the home card summary is "Daily sea surface temperature and its record, plus ocean heat, sea level rise and ocean acidification." (at most 120 characters) and the sitemap lists `/ocean-health/`

#### Scenario: Skeleton and registry agree

- **WHEN** the unit tests compare `CATEGORY_PAGES`, `CATEGORY_SKELETONS` and `LIVE_CATEGORY_SUMMARIES`
- **THEN** all three contain `ocean-health`, and the skeleton shows the intro, key figures and the first chart block in order

### Requirement: One Dataset JSON-LD credits every provider and origin present

The page SHALL declare exactly one schema.org `Dataset` in JSON-LD, built from the sections present, whose `isBasedOn` (typed `CreativeWork`) credits every provider and origin of those sections.

#### Scenario: All sections present

- **WHEN** the structured data is built from five sections
- **THEN** `isBasedOn` includes Copernicus Climate Pulse and C3S/ECMWF, Our World in Data as processor, Met Office HadSST, NOAA NCEI, the US EPA, IAP, MRI/JMA, CSIRO, NOAA Laboratory for Satellite Altimetry and the Hawaii Ocean Time-series (SOEST), and `variableMeasured` has one entry per section

#### Scenario: From present sections only

- **GIVEN** the sea level section is unavailable
- **WHEN** the structured data is built
- **THEN** `isBasedOn` has no NOAA LSA entry and `variableMeasured` has no sea level variable

#### Scenario: Nothing present

- **GIVEN** every section is unavailable
- **WHEN** the page renders
- **THEN** no JSON-LD is rendered

### Requirement: The data sources page lists the new providers and origins

`/data-sources/` SHALL list, from the API catalog and with no web change, the two new providers and the origins OWID gained for ocean health.

#### Scenario: Catalog and page

- **WHEN** `GET /api/v1/data-sources` and `/data-sources/` are read
- **THEN** both show `copernicus-climate-pulse` and `noaa-lsa` with `ocean-health`, and OWID's origins list the HadSST, ocean heat content and Hawaii Ocean Time-series producers

### Requirement: Accessible, mobile-ready presentation using tokens only

The page SHALL take colors only from the design tokens, use `MeasureToggle` radio groups, give multi-series charts a legend and an accessible description, and follow the mobile bleed layout.

#### Scenario: Tokens only

- **WHEN** `designTokens.test.ts` runs
- **THEN** it passes with the new components

#### Scenario: No horizontal overflow at 360 px

- **WHEN** the page is rendered at 360 px width
- **THEN** the document does not scroll horizontally

#### Scenario: Axe finds no violations

- **WHEN** the axe E2E check runs on `/ocean-health/` in light and dark themes
- **THEN** it reports no violations

### Requirement: End-to-end coverage against fixture-backed providers

`apps/web/e2e/ocean-health.spec.ts` SHALL run against the fixture server, never a live provider.

#### Scenario: Coverage

- **WHEN** `npm run e2e` runs
- **THEN** the spec covers the render (heading, key figures, five charts with lazy ones scrolled into view, attribution links), both toggles, the NOAA acknowledgment and end-date note, the five tables, no stale or unavailable state, no console errors and no overflow on mobile

#### Scenario: Smoke tagging

- **WHEN** the spec is read
- **THEN** only render, toggle and overflow checks are tagged `@smoke`; header, SEO, attribution and provider-state checks are not

#### Scenario: Shared specs and placeholder examples

- **WHEN** the axe, SEO and sitemap specs and the unit and E2E suites are read
- **THEN** the axe, SEO and sitemap specs include the category and none uses `/ocean-health/` as a placeholder example
