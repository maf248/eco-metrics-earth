# global-temperature-page Specification

## Purpose

Render the global temperature category page: server-side key figures, a country explorer over the ERA5 anomalies, the long-run global chart with its 1.5 °C reference, and the source attribution and structured data.

## Requirements

### Requirement: The page fetches the full dataset once, server-side, with ISR

`/global-temperature/` (rendered through the `[category]` segment and the category page registry) SHALL fetch `GET {API_BASE_URL}/global-temperature` once, inside a Server Component, with `getGlobalTemperature()`, and SHALL pass the validated payload and `meta` as props. Choosing a country MUST NOT trigger any request. The page SHALL NOT be pre-rendered at build time: it is generated on demand after a deploy and then served from cache and refreshed in the background at most once per day, so `next build` never calls the BFF. A failed fetch (including a BFF `502`) SHALL NOT be rendered or cached: during revalidation the last good page is kept; on a first render the app's `error.tsx` is shown and nothing is cached.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the global temperature payload
- **WHEN** `/global-temperature/` is generated
- **THEN** the HTML contains the heading "Global Temperature", the World key figures and the explorer with World selected

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running
- **WHEN** `npx nx build web` runs
- **THEN** the build completes and `/global-temperature/` is not fully pre-rendered

#### Scenario: No requests on interaction

- **WHEN** a user selects another country
- **THEN** no additional network request to the BFF is made

#### Scenario: BFF down during revalidation

- **GIVEN** a cached `/global-temperature/` page and a BFF that fails both attempts
- **WHEN** the page is revalidated
- **THEN** visitors keep receiving the previously cached page

#### Scenario: BFF down on first request

- **GIVEN** no cached page and a BFF that fails both attempts
- **WHEN** the page is requested
- **THEN** `error.tsx` is shown and nothing is cached

### Requirement: Signed anomaly formatting

Every anomaly shown to the user (key figures, tooltip, data table, value-axis labels) SHALL be formatted with a fixed `en-US` locale and an explicit sign: a positive value is prefixed with `+`, a negative value with the real minus sign U+2212 (never the ASCII hyphen-minus), and zero has no sign. Key figures, tooltip and table use 2 decimals (`+0.59`, `−0.45`, `0.00`); axis labels use at most 1 decimal (`+0.5`, `−1`, `0`). The unit `°C` follows the number after a space where a sentence or tooltip shows it.

#### Scenario: Positive, negative and zero

- **WHEN** the formatter receives `0.594`, `-0.451` and `0`
- **THEN** it returns `+0.59`, `−0.45` and `0.00`, and the second string contains U+2212 and no ASCII hyphen-minus

#### Scenario: Axis labels

- **WHEN** the axis formatter receives `0.5`, `-1` and `0`
- **THEN** it returns `+0.5`, `−1` and `0`

#### Scenario: Server and client agree

- **WHEN** a signed value is rendered on the server and again on the client during hydration
- **THEN** the text is identical and no hydration warning is logged

### Requirement: Server-rendered key figures

The page SHALL render, as plain server-rendered text derived from the World entity of the same payload, (a) the latest year with a World value and its signed anomaly relative to the baseline, for example "In 2025 the world's average surface temperature was +0.59 °C relative to the 1991–2020 average.", and (b) the warmest year in the series and its signed anomaly, for example "The warmest year since 1940 was 2024, at +0.72 °C." The baseline and the first year come from the payload (`baseline`, `startYear`), never from literals. When several years tie for the maximum, the most recent one is named. The text SHALL be present in the raw HTML without JavaScript. The wording SHALL NOT call the baseline "pre-industrial" and SHALL NOT claim a record beyond the years in the series.

#### Scenario: Figures in the raw HTML

- **WHEN** the raw HTML of `/global-temperature/` is fetched without executing JavaScript
- **THEN** it contains the latest year with its signed anomaly and the warmest year with its signed anomaly as text

#### Scenario: Latest year skips trailing nulls

- **GIVEN** a World entity whose last array element is `null`
- **WHEN** the key figures are computed
- **THEN** the latest year with a value is used

#### Scenario: Negative latest anomaly

- **GIVEN** a World entity whose latest value is `-0.2`
- **WHEN** the key figures render
- **THEN** the text shows `−0.20 °C` with U+2212

#### Scenario: Baseline and range come from the payload

- **GIVEN** a payload with `baseline` 1981-2010 and `startYear` 1960
- **WHEN** the key figures render
- **THEN** the text says "1981–2010 average" and "since 1960"

#### Scenario: Tied maximum

- **GIVEN** a World series whose maximum value occurs in two years
- **WHEN** the key figures render
- **THEN** the later year is named

### Requirement: Line chart of one country's anomaly with a labelled zero line

Below the key figures the page SHALL render an explorer (a Client Component built on the generic country explorer) with an `h2`, the country selector (the `country-combobox` capability) scoped to the chart, and a line chart (ECharts, SVG, via `LazyEChart`) of the selected entity's anomaly from `startYear` to `endYear`. The default selection SHALL be World. There SHALL be no measure toggle: the dataset has one measure, so a toggle would have nothing to switch. The chart SHALL draw a horizontal reference line at zero, labelled with the short baseline label (for example "1991–2020 average", placed at the start of the line, clear of the data), using theme colors only; the value axis SHALL include zero. The series SHALL use the first categorical color, a single line, no legend, `connectNulls: false` (missing years are gaps, never zeros), and a tooltip with the year and the signed anomaly with the unit. The chart title above the chart SHALL name the entity, the quantity and the baseline (for example "World: annual temperature anomaly (°C, relative to the 1991–2020 average)"). Selection SHALL be component state only: no query string, no path segment, no `history` change, no storage.

#### Scenario: Defaults

- **WHEN** the page loads
- **THEN** World is selected and the chart title reads World / annual temperature anomaly with the baseline

#### Scenario: Switching the country

- **WHEN** the user selects Argentina in the combobox
- **THEN** the chart title names Argentina and the series is Argentina's

#### Scenario: Zero reference line

- **WHEN** the chart option is built
- **THEN** the series carries a reference line at `0` whose label is the baseline text, with no color property in the option

#### Scenario: Gaps for missing years

- **GIVEN** an entity with `null` values in some years
- **WHEN** the chart option is built
- **THEN** the series data contains `null` for those years and `connectNulls` is false

#### Scenario: Signed tooltip

- **WHEN** the tooltip value formatter receives `-0.45` and `null`
- **THEN** it returns `−0.45 °C` and "No data"

#### Scenario: No metric toggle and no URL state

- **WHEN** the page renders and the user changes country
- **THEN** no radio group is present, `location.pathname` is still `/global-temperature/` and `location.search` is empty

#### Scenario: Chart is lazy with a same-height skeleton

- **WHEN** the page is server-rendered
- **THEN** the chart area contains the skeleton with the chart's height, and the chart replaces it after the ECharts chunk loads without a layout shift

### Requirement: Accessible equivalents of the chart

The explorer SHALL include a visually hidden polite live region that announces the new selection ("Showing temperature anomaly for Argentina"), and the chart region SHALL expose the generated ECharts `aria` description. A collapsible `<details>` with the summary "View data table" SHALL contain a table for the selected entity only, with a caption naming the entity, the quantity and the years, columns Year and "Anomaly (°C vs <baseline> average)", column headers with `scope`, rows from the latest to the earliest year, signed values and an em dash for missing values. It SHALL be collapsed by default, scrollable and keyboard-focusable on small screens, and re-render when the selection changes.

#### Scenario: Live region announces changes

- **WHEN** the user selects Argentina
- **THEN** the live region text becomes "Showing temperature anomaly for Argentina"

#### Scenario: Table for the selected entity

- **WHEN** the user opens "View data table" with Argentina selected
- **THEN** the caption names Argentina and the first body row is the latest year

#### Scenario: Signed values and missing values

- **GIVEN** an entity with a negative value in one year and `null` in another
- **WHEN** the table renders
- **THEN** the negative cell uses U+2212 and the missing cell shows an em dash

#### Scenario: Collapsed by default

- **WHEN** the page loads
- **THEN** the `<details>` element is not open

### Requirement: Attribution, upstream credit and methodology next to the chart

Next to the per-country chart the page SHALL render a compact attribution: "Data:" followed by `SourceAttribution` fed with `meta.source` from the API and the provider's last update as a `<time dateTime>` formatted in UTC; then the upstream origin from `data.origin` through the generic origin credit: the producer, the origin `title` linked to `origin.url`, the license name linked to `license.url`, the `notice` text and the `disclaimer`; then a link to `/data-sources/`. The OWID dataset name and version and the origin `citation` are not shown on the page (they are on `/data-sources/` and in the JSON-LD). None of these strings SHALL be hard-coded in the web app. A methodology note SHALL state that: an anomaly is how far a year's average surface (near-ground air) temperature is from the average of the baseline period for the same place; this baseline is a recent reference period, so these values are not warming since pre-industrial times (the pre-industrial figures are in the section below); country values cover land inside the borders only while the World value covers land and ocean, so they are not comparable with each other; and very small countries are less reliable because of the data's resolution.

#### Scenario: Attribution from the API

- **GIVEN** `meta.source` equal to the OWID publisher
- **WHEN** the page renders
- **THEN** a link named "Our World in Data" to `https://ourworldindata.org`, the text "(CC BY 4.0)" and the lead-in "Data:" are present beside the chart

#### Scenario: Copernicus credit

- **GIVEN** `data.origin` from the fixture
- **WHEN** the page renders
- **THEN** the text `Contains modified Copernicus Climate Change Service information (2026)`, a link to the dataset page, the license "CC BY 4.0" linked to its deed and the disclaimer are visible next to the chart

#### Scenario: Dataset and date

- **WHEN** the page renders with the dataset fixture
- **THEN** the provider's last update date is shown and the dataset version and the citation are not

#### Scenario: Methodology note

- **WHEN** the page renders
- **THEN** the note explains the anomaly and the baseline, says it is not warming since pre-industrial times, and says country values are land-only while World is land and ocean

#### Scenario: Link to all sources

- **WHEN** the page renders
- **THEN** it contains exactly one link to `/data-sources/` in each attribution block

### Requirement: SEO and metadata

`generateMetadata` for `global-temperature` SHALL use the keyword-bearing title "Global Temperature Anomalies by Country" (rendered as "Global Temperature Anomalies by Country | eco-metrics earth", 59 characters), the description "Global temperature by country since 1940: how far each year's surface temperature is from the 1991–2020 average. Data from Our World in Data." (141 characters, replacing the placeholder copy), the canonical URL `{siteUrl}/global-temperature/` and matching Open Graph/Twitter tags. The `<h1>` SHALL remain "Global Temperature". The key figures, the page text and the collapsed table of the default selection SHALL be in the server-rendered HTML.

#### Scenario: Metadata

- **WHEN** `/global-temperature/` is requested
- **THEN** `<title>` is "Global Temperature Anomalies by Country | eco-metrics earth", the meta description is the text above and `<link rel="canonical">` ends with `/global-temperature/`
- **AND** `og:title` and `twitter:title` are "Global Temperature Anomalies by Country", and `og:description` and `twitter:description` equal the meta description

#### Scenario: Description differs from placeholders

- **WHEN** the category descriptions are compared
- **THEN** the global temperature description is unique, 110-160 characters, and no longer contains "coming"

### Requirement: schema.org Dataset structured data

The page SHALL server-render exactly one `<script type="application/ld+json">` block describing the data as a schema.org `Dataset` through the generic builder (see `dataset-structured-data`), built from the same payload as the page: `name` including the union year range (for example "Global temperature anomalies by country and since pre-industrial times, 1850–2025"), a `description` of 50 to 5000 characters stating both baselines and the land-versus-World coverage, `url`, `keywords`, `temporalCoverage` as `1850/endYear` (from the earliest `startYear` to the latest `endYear` of the per-country and global series), `dateModified` from `meta.source.lastUpdated`, two `variableMeasured` `PropertyValue` entries (per-country anomaly against the 1991–2020 baseline, global anomaly against the 1861–1890 baseline, both with the payload's unit), `isBasedOn` listing the OWID dataset (name, version, publisher) and both upstream datasets (ERA5 and HadCRUT5, each with `origin.title`, `origin.url` and `origin.producer` as publisher), and the license derived from the API's license name. No `distribution` is declared and there is still only one block per page.

#### Scenario: Dataset in the server-rendered HTML

- **WHEN** the raw HTML of `/global-temperature/` is fetched
- **THEN** it contains exactly one `application/ld+json` block whose `@type` is `Dataset`, whose `url` ends with `/global-temperature/` and whose `temporalCoverage` is `1850/<endYear>`

#### Scenario: Both upstream datasets are credited

- **WHEN** the structured data is built
- **THEN** `isBasedOn` contains three datasets: the OWID one, ERA5 published by the Copernicus Climate Change Service (C3S) and HadCRUT5 published by the Met Office Hadley Centre
- **AND** `variableMeasured` has two entries

#### Scenario: Validators accept the markup

- **WHEN** the block built from real OWID data is checked with the Schema.org Markup Validator
- **THEN** it reports no errors and no warnings

### Requirement: Accessible, mobile-ready presentation using tokens only

The page SHALL use only semantic color tokens (no palette or arbitrary color utilities), the focus-ring pattern on every interactive element, interactive targets of at least 44 px, no horizontal page overflow at 320 px width, and chart height `h-72` on mobile and `sm:h-96` from the small breakpoint. `@axe-core/playwright` SHALL report no critical or serious violations on the page in light and dark themes, with the listbox open, and the page SHALL log no console errors or hydration warnings. No divergent palette SHALL be introduced: the anomaly is drawn with one categorical color and the zero line.

#### Scenario: Axe on the page

- **WHEN** the axe audit runs on `/global-temperature/` in light and dark themes and with the listbox open
- **THEN** there are no critical or serious violations

#### Scenario: Dark theme repaint

- **WHEN** the theme is toggled to dark
- **THEN** the chart, including its zero line and label, is repainted with dark-theme colors

#### Scenario: Mobile viewport

- **WHEN** the page is viewed at 360 px width
- **THEN** there is no horizontal scrolling and the combobox and the table summary are at least 44 px tall

#### Scenario: Token guard

- **WHEN** `npx nx test web` runs
- **THEN** `designTokens.test.ts` passes with the new components

### Requirement: End-to-end coverage against fixture-backed OWID

An E2E spec `apps/web/e2e/global-temperature.spec.ts` (Playwright `test(...)`, running against the real BFF, which reads OWID from the local fixture server, in `chromium-desktop`; the render, no-overflow, 360 px layout and country-selection-by-typing tests are `@smoke` and also run in the other four projects) SHALL cover: core render with heading, key figures, chart SVG and attribution including the Copernicus credit; server-rendered figures and the single JSON-LD `Dataset` in the raw HTML; metadata; selecting a country by typing (the fixture country has a negative anomaly and a missing year, shown in the table with U+2212 and an em dash); the keyboard flow; no URL change; no measure toggle; the data table; the theme toggle repainting; and no console errors. `a11y.spec.ts` SHALL cover the page in light and dark and with the listbox open, and `seo.spec.ts` SHALL expect the new description. The OWID fixture server SHALL serve the temperature chart CSV (World, a country with negative values and a null year, Kosovo, 1940-2025) and the indicator `1325256` metadata (with `descriptionShort`, `datasetName`, `datasetVersion`, `updatedAt`), with no E2E request leaving the machine.

#### Scenario: Spec runs in all five projects

- **WHEN** `npm run e2e` runs
- **THEN** `global-temperature.spec.ts` executes fully in `chromium-desktop` and passes
- **AND** only its render, no-overflow, 360 px layout and country-selection tests execute in `firefox-desktop`, `webkit-desktop`, `mobile-chrome` and `mobile-safari`, and pass

#### Scenario: E2E never reaches live OWID

- **WHEN** the E2E webServer wrapper starts the servers
- **THEN** the fixture server answers the temperature chart and indicator routes and the API is started against it, as for CO2

#### Scenario: Existing specs still pass

- **WHEN** the full E2E suite runs
- **THEN** `co2-emissions.spec.ts` and every other spec pass without assertion changes

### Requirement: Pre-industrial key figure

Next to the per-country key figures the page SHALL render, as server-rendered text from `data.global`, the latest year with a global `mean` value and its signed anomaly against the pre-industrial baseline, for example "In 2025 the world was +1.41 °C warmer than the 1861–1890 (pre-industrial) average." For a zero or negative value the sentence SHALL read "was <signed value> °C relative to the 1861–1890 (pre-industrial) average" instead of "warmer than". Both baselines SHALL be named wherever their figures appear, so the two key figures are clearly labelled: the existing figure keeps its 1991–2020 wording. The years and baseline come from the payload, never from literals.

#### Scenario: Pre-industrial figure in the raw HTML

- **WHEN** the raw HTML of `/global-temperature/` is fetched without JavaScript
- **THEN** it contains the latest global year, its signed anomaly, "warmer than" and "1861–1890 (pre-industrial)"

#### Scenario: Both baselines are visible

- **WHEN** the key figures render
- **THEN** one sentence names the 1991–2020 average and another the 1861–1890 (pre-industrial) average

#### Scenario: Non-positive value

- **GIVEN** a latest global mean of `-0.1`
- **WHEN** the sentence renders
- **THEN** it reads "was −0.10 °C relative to the 1861–1890 (pre-industrial) average" with U+2212

#### Scenario: Trailing nulls

- **GIVEN** a global series whose last element is `null`
- **WHEN** the sentence renders
- **THEN** the latest year with a value is used

### Requirement: Long-run global chart with confidence band and 1.5 °C reference

Below the country explorer the page SHALL render a second section with an `h2` (for example "Global temperature since 1850, relative to 1861–1890"), with no country selector, containing a line chart (ECharts, SVG) of `data.global.mean` from `startYear` to `endYear`, a shaded band between `lower` and `upper` (the 95% confidence interval), a reference line at zero with the short label "1861–1890 average" and a reference line at 1.5 °C with the short label "1.5 °C" (labels placed clear of the data line and never clipped at 375 px; the Paris Agreement explanation is in the methodology sentence). The band SHALL be drawn with the series color at low opacity through the theme (no color named in the option), the band SHALL NOT appear as separate series in the tooltip, and the tooltip SHALL show the year, the signed mean and the signed interval with the unit. The chart title above it SHALL state the quantity and the baseline. A methodology sentence SHALL state that the 1.5 °C reference refers to the long-term average (decades), so a single year above 1.5 °C does not by itself mean the limit is breached. The chart SHALL be mounted and its ECharts chunk requested only when its container scrolls into view (the server-rendered HTML holds a same-height skeleton), and SHALL repaint with the theme like every chart. It SHALL have its own text equivalent: a collapsed `<details>` "View data table" with a caption, columns Year, "Mean (°C vs 1861–1890)", "Lower bound (95%)" and "Upper bound (95%)", signed values, rows newest first and an em dash for missing values. The per-country explorer and this section SHALL each render their own table, so the page has two.

#### Scenario: Section is present with its own title

- **WHEN** the page renders
- **THEN** a second `h2` names the global series and the pre-industrial baseline, and no combobox is inside it

#### Scenario: Reference lines

- **WHEN** the chart option is built
- **THEN** the series carries reference lines at `0` and `1.5` with the short labels "1861–1890 average" and "1.5 °C", and the option contains no color property, `var(`, `oklch(`, `#` literal or `rgb` string

#### Scenario: Confidence band

- **WHEN** the chart option is built from `mean`, `lower` and `upper`
- **THEN** a stacked pair of series draws the band between `lower` and `upper` with a low-opacity area and an invisible base, and the tooltip shows the interval once

#### Scenario: Gaps

- **GIVEN** `null` values in `mean`, `lower` or `upper`
- **WHEN** the option is built
- **THEN** the mean line has gaps (`connectNulls` false) and the band is not drawn for those years

#### Scenario: Lazy rendering

- **GIVEN** the section is below the fold
- **WHEN** the page loads
- **THEN** the HTML holds the skeleton and no ECharts request for this chart is made until the container intersects the viewport

#### Scenario: Methodology sentence

- **WHEN** the section renders
- **THEN** it states that single years above 1.5 °C do not by themselves mean the long-term limit is breached

#### Scenario: Data table equivalent

- **WHEN** the user opens the section's "View data table"
- **THEN** the first body row is the latest global year with signed mean, lower and upper values

#### Scenario: Attribution for the global series

- **WHEN** the page renders
- **THEN** next to this chart "Data:" with Our World in Data, the update date, and the Met Office origin credit (producer, linked title, linked Open Government Licence v3.0 and the notice) are visible

#### Scenario: Axe and theme

- **WHEN** axe runs in light and dark with the section in view
- **THEN** there are no critical or serious violations and the band and lines repaint with the theme

### Requirement: End-to-end coverage of the additions

`global-temperature.spec.ts` SHALL also cover: the pre-industrial key figure in the raw HTML; the second section after scrolling into view (chart SVG appears, its ECharts chunk is not requested before it intersects); its data table with signed values; the Met Office credit and license link; one JSON-LD block with `temporalCoverage` `1850/<endYear>`. The OWID fixture server SHALL additionally serve the `temperature-anomaly` chart CSV (World rows with the mean and both bounds from 1850, with the partial current year omitted, a blank bound for one year, and Northern/Southern Hemisphere rows that must be ignored) and the indicator `1325020` metadata (with the `1861-1890` description), and the per-country fixture SHALL start in 1940. `data-sources.spec.ts` SHALL cover the origins listed under OWID, and `co2-emissions.spec.ts` the Global Carbon Project credit, without any other assertion change.

#### Scenario: New fixture routes

- **WHEN** the fixture server's route test runs
- **THEN** `/grapher/temperature-anomaly.csv` and `/v1/indicators/1325020.metadata.json` are served

#### Scenario: Data sources page shows origins

- **WHEN** `/data-sources/` is opened against the E2E stack
- **THEN** the Global Carbon Project, the Copernicus Climate Change Service and the Met Office Hadley Centre appear under Our World in Data with their licenses

#### Scenario: CO2 credit

- **WHEN** `/co2-emissions/` is opened
- **THEN** the attribution shows the Global Carbon Project credit
