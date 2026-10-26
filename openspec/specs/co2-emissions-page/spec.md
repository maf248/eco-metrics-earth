# co2-emissions-page Specification

## Purpose

Render the /co2-emissions/ page: server-rendered key figures, a chart-scoped country explorer, its data table, attribution and structured data.

## Requirements

### Requirement: The CO2 page fetches the full dataset once, server-side, with ISR

`/co2-emissions/` (rendered through the `[category]` segment and the category page registry) SHALL fetch `GET {API_BASE_URL}/co2-emissions` once, inside a Server Component, with `getCo2Emissions()`, and SHALL pass the validated payload and `meta` as props. Choosing a country or a metric MUST NOT trigger any request. The page SHALL NOT be pre-rendered at build time: it is generated on its first request after a deploy and then served from the ISR cache (`revalidate = 86400`), so `next build` never calls the BFF. A failed fetch (including a BFF `502`) SHALL NOT be rendered or cached: during revalidation the last good page is kept; on a first render the app's `error.tsx` is shown and nothing is cached. The Suspense boundary for the awaited fetch is the segment's `loading.tsx`.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the CO2 payload
- **WHEN** `/co2-emissions/` is generated
- **THEN** the HTML contains the heading "CO2 Emissions", the World key figures and the explorer with World selected

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running
- **WHEN** `npx nx build web` runs
- **THEN** the build completes and `/co2-emissions/` is not pre-rendered

#### Scenario: No requests on interaction

- **WHEN** a user selects another country and switches the metric
- **THEN** no additional network request to the BFF is made

#### Scenario: BFF down during revalidation

- **GIVEN** a cached `/co2-emissions/` page and a BFF that fails both attempts
- **WHEN** the page is revalidated
- **THEN** visitors keep receiving the previously cached page

#### Scenario: BFF down on first request

- **GIVEN** no cached page and a BFF that fails both attempts
- **WHEN** the page is requested
- **THEN** `error.tsx` is shown and nothing is cached

### Requirement: Server-rendered key figures

The page SHALL render, as plain server-rendered text derived from the World entity of the same payload, the latest year for which both values exist and the World total (million tonnes of CO2) and per-capita (tonnes per person) emissions for it, formatted with a fixed `en-US` locale so server and client output are identical, for example "In 2024 the world emitted ... million tonnes of CO2, ... tonnes per person.". The text SHALL be present in the raw HTML without JavaScript.

#### Scenario: Figures in the raw HTML

- **WHEN** the raw HTML of `/co2-emissions/` is fetched without executing JavaScript
- **THEN** it contains the latest year and the World total and per-capita figures as text

#### Scenario: Latest year skips trailing nulls

- **GIVEN** a World entity whose last array element is `null` for per capita
- **WHEN** the key figures are computed
- **THEN** the latest year with both values present is used

#### Scenario: Deterministic formatting

- **WHEN** the key figures are rendered on the server and again on the client during hydration
- **THEN** the text is identical and no hydration warning is logged

### Requirement: Line chart of one country over time with a Total / Per capita toggle

Below the key figures the page SHALL render an explorer (a Client Component) with an `h2`, a country selector (the `country-combobox` capability) scoped to the chart, a "Total / Per capita" toggle, and a line chart (ECharts, SVG, via `LazyEChart`) of the selected entity's selected metric from `startYear` to `endYear`. The default selection SHALL be World and the default metric Total. The toggle SHALL be a native radio group (a `fieldset` with a visible `legend`, exposed as a `group` named by the legend, two radio inputs "Total" and "Per capita", arrow-key navigation, 44 px touch targets, focus ring). Selection and metric SHALL be component state only: no query string, no path segment, no `history` change, no storage. The chart title text above the chart SHALL name the entity, the metric and its unit (for example "World: total CO2 emissions (million tonnes per year)"). Missing years SHALL appear as gaps, not zeros. The chart SHALL use only theme colors (first categorical color), a tooltip with the year, the formatted value and the unit, `confine` on small screens, and no legend (single series).

#### Scenario: Defaults

- **WHEN** the page loads
- **THEN** World is selected, "Total" is checked and the chart title reads World / total

#### Scenario: Switching the metric

- **WHEN** the user selects "Per capita"
- **THEN** the chart title and unit change to per capita and the chart redraws with the per-capita series of the same entity

#### Scenario: Switching the country

- **WHEN** the user selects Argentina in the combobox
- **THEN** the chart title names Argentina and the series is Argentina's

#### Scenario: No URL state

- **WHEN** the user changes country and metric
- **THEN** `location.pathname` is still `/co2-emissions/` and `location.search` is empty

#### Scenario: Gaps for missing years

- **GIVEN** an entity with `null` values in some years
- **WHEN** the chart option is built
- **THEN** the series data contains `null` for those years and `connectNulls` is false

#### Scenario: Toggle is keyboard accessible

- **WHEN** focus is on the checked radio and the user presses ArrowRight / ArrowLeft
- **THEN** the other metric becomes checked

#### Scenario: Chart is lazy with a same-height skeleton

- **WHEN** the page is server-rendered
- **THEN** the chart area contains the skeleton with the chart's height, and the chart replaces it after the ECharts chunk loads without a layout shift

### Requirement: Accessible equivalents of the chart

The chart region SHALL expose a generated ECharts `aria` description, and the explorer SHALL include a visually hidden polite live region that announces the new selection ("Showing total CO2 emissions for Argentina") when the country or metric changes. A collapsible `<details>` with the summary "View data table" SHALL contain a table for the selected entity only, with a caption naming the entity, columns Year, Total (million tonnes of CO2) and Per capita (tonnes of CO2 per person), column headers with `scope`, rows from the latest to the earliest year, and empty cells rendered as an em dash. The table SHALL be collapsed by default, scrollable on small screens and re-render when the selection changes.

#### Scenario: Live region announces changes

- **WHEN** the user selects Argentina
- **THEN** the live region text becomes "Showing total CO2 emissions for Argentina"

#### Scenario: Table for the selected entity

- **WHEN** the user opens "View data table" with Argentina selected
- **THEN** the table caption names Argentina and the first body row is the latest year

#### Scenario: Tiny per-capita values

- **GIVEN** a per-capita value that is greater than 0 and rounds to `0.00` in the payload (`0`, or below `0.01`)
- **WHEN** it is shown in the data table, the tooltip or the key figures
- **THEN** it is formatted as "< 0.01" and never as "0.00"

#### Scenario: Missing values

- **GIVEN** a year with no per-capita value
- **WHEN** the table renders that row
- **THEN** the per-capita cell shows an em dash

#### Scenario: Collapsed by default

- **WHEN** the page loads
- **THEN** the `<details>` element is not open

### Requirement: Attribution and methodology next to the chart

Next to the chart the page SHALL render a compact attribution: "Data:" followed by `SourceAttribution` fed with `meta.source` from the API (provider link and license — never hard-coded in the web app) and the provider's last update as a `<time dateTime>` formatted in UTC with `formatUtcDate`; then the upstream origin from `data.origin` through the generic origin credit (producer, title linked to its URL, license name linked to its deed, then `notice` and `disclaimer` when present); then a link to `/data-sources/`. The dataset name and version and the origin `citation` are not shown on the page (they are on `/data-sources/`). A methodology note SHALL state that the figures are annual CO2 emissions from fossil fuels and industry, that land-use change is not included, and that per-capita values divide by population.

#### Scenario: Attribution from the API

- **GIVEN** `meta.source` equal to the OWID publisher
- **WHEN** the page renders
- **THEN** a link named "Our World in Data" to `https://ourworldindata.org`, the text "(CC BY 4.0)" and the lead-in "Data:" are present beside the chart

#### Scenario: Dataset and date

- **WHEN** the page renders with the dataset fixture
- **THEN** the provider's last update date is shown and the dataset version is not

#### Scenario: Methodology note

- **WHEN** the page renders
- **THEN** the text states fossil fuels and industry only and that land-use change is excluded

#### Scenario: Link to all sources

- **WHEN** the page renders
- **THEN** it contains exactly one link to `/data-sources/` in the attribution block

#### Scenario: Upstream origin credit

- **GIVEN** `data.origin` for the Global Carbon Project
- **WHEN** the page renders
- **THEN** the attribution block shows "Global Carbon Project", a link named "Global Carbon Budget" to `https://globalcarbonbudget.org/` and the license "CC BY 4.0" linked to its deed

### Requirement: SEO and metadata for the CO2 page

`generateMetadata` for `co2-emissions` SHALL use the title "CO2 Emissions" (rendered as "CO2 Emissions | eco-metrics earth"), the description "CO2 emissions by country since 1950: total annual emissions and emissions per person for every country and the world. Data from Our World in Data." (146 characters, replacing the placeholder copy), the canonical URL `{siteUrl}/co2-emissions/` and matching Open Graph/Twitter tags. The `<h1>` SHALL remain "CO2 Emissions" (`co2-title-override`). No JSON-LD SHALL be added. The key figures, the page text and the collapsed table of the default selection SHALL be in the server-rendered HTML.

#### Scenario: Metadata

- **WHEN** `/co2-emissions/` is requested
- **THEN** `<title>` is "CO2 Emissions | eco-metrics earth", the meta description is the text above and `<link rel="canonical">` ends with `/co2-emissions/`
- **AND** `og:title` and `twitter:title` are "CO2 Emissions", and `og:description` and `twitter:description` equal the meta description

#### Scenario: Description differs from placeholders

- **WHEN** the category descriptions are compared
- **THEN** the CO2 description is unique, 110-160 characters, and no longer contains "coming"

#### Scenario: Heading unchanged

- **WHEN** the page renders
- **THEN** the single `<h1>` reads "CO2 Emissions"

### Requirement: Accessible, mobile-ready presentation using tokens only

The CO2 page SHALL use only semantic color tokens (no palette or arbitrary color utilities), the focus-ring pattern on every interactive element, interactive targets of at least 44 px, no horizontal page overflow at 320 px width, and chart height `h-72` on mobile and `sm:h-96` from the small breakpoint. `@axe-core/playwright` SHALL report no critical or serious violations on the page in light and dark themes, and the page SHALL log no console errors or hydration warnings.

#### Scenario: Axe on the page

- **WHEN** the axe audit runs on `/co2-emissions/` (default state and with the listbox open)
- **THEN** there are no critical or serious violations

#### Scenario: Dark theme repaint

- **WHEN** the theme is toggled to dark
- **THEN** the chart is repainted with dark-theme colors and the page still has no axe violations

#### Scenario: Mobile viewport

- **WHEN** the page is viewed at 360 px width
- **THEN** there is no horizontal scrolling and the combobox, toggle and summary are at least 44 px tall

#### Scenario: Token guard

- **WHEN** `npx nx test web` runs
- **THEN** `designTokens.test.ts` passes with the new components

### Requirement: End-to-end coverage against fixture-backed OWID

An E2E spec `apps/web/e2e/co2-emissions.spec.ts` (Playwright `test(...)`, mirroring `water-footprint.spec.ts` and running against the real BFF, which in the E2E environment reads OWID from a local fixture server, in all five browser projects) SHALL cover: core render with heading, key figures, chart SVG and attribution; server-rendered figures in the raw HTML; metadata; combobox typing ("arg" shows Argentina, selecting it updates the chart title, flag `fi-ar` is shown, no regional-indicator emoji); the full keyboard flow (ArrowDown, ArrowUp, Home, End, Enter, Escape); the metric toggle; no URL change; the data table; the dependencies endpoint (`/api/v1/health/dependencies` is `200` with `owid` up, probing the fixture server); the theme toggle; the number of flag image requests after opening the list staying small; axe; and no console errors. `a11y.spec.ts` and `seo.spec.ts` SHALL be updated for the page (the CO2 meta description expectation changes).

#### Scenario: Spec runs in all five projects

- **WHEN** `npm run e2e` runs
- **THEN** `co2-emissions.spec.ts` executes in `chromium-desktop`, `firefox-desktop`, `webkit-desktop`, `mobile-chrome` and `mobile-safari` and passes

#### Scenario: E2E never reaches live OWID

- **WHEN** the E2E webServer wrapper starts the servers
- **THEN** a local fixture server is listening and the API is started with `OWID_GRAPHER_BASE_URL` (and `OWID_API_BASE_URL`) pointing at it, so no E2E request leaves the machine for OWID
- **AND** the fixture server serves, for both chart slugs, the filtered CSV and the `.metadata.json`, and the indicator metadata, with a handful of entities (World, Argentina, one entity with null years)

#### Scenario: Existing specs still pass

- **WHEN** the E2E suite runs
- **THEN** `seo.spec.ts` expects the new CO2 description and the other category expectations are unchanged

### Requirement: schema.org Dataset structured data for the CO2 page

The page SHALL server-render exactly one `<script type="application/ld+json">` block describing the data behind the chart as a schema.org `Dataset`, built from the same BFF payload as the page (no hard-coded years, units or dataset version). It SHALL carry `name` (including the year range), a `description` of 50 to 5000 characters, `url` (the canonical page URL with trailing slash), `keywords`, `isAccessibleForFree: true`, `license` as the versioned license URL when the API's license name is a Creative Commons license (derived from the name, e.g. `https://creativecommons.org/licenses/by/4.0/`, so the name stays spelled out only in the API's publisher definition) and the license name otherwise, `creator` (the provider as an `Organization`), `isBasedOn` (the upstream dataset with its name, version and publisher), `dateModified` (the provider timestamp from `meta.source.lastUpdated`), `temporalCoverage` as an ISO 8601 interval `startYear/endYear`, `spatialCoverage` (a `Place` named World with a whole-Earth `GeoShape` box), `variableMeasured` (one `PropertyValue` per metric with the payload's unit as `unitText`) and `includedInDataCatalog` (the site's `/data-sources/` page). No `distribution` is declared: the site offers no download. The JSON SHALL be serialized with `<` escaped as `\u003c`.

#### Scenario: Dataset in the server-rendered HTML

- **WHEN** the raw HTML of `/co2-emissions/` is fetched
- **THEN** it contains exactly one `application/ld+json` block whose `@type` is `Dataset`, whose `url` ends with `/co2-emissions/` and whose `temporalCoverage` is `1950/<endYear>`

#### Scenario: Fields derive from the payload

- **WHEN** the structured data is built from a payload covering 2020-2024
- **THEN** `name` ends with `2020–2024`, `temporalCoverage` is `2020/2024`, `dateModified` equals `meta.source.lastUpdated` and both `variableMeasured` entries carry the payload units

#### Scenario: Unknown license name

- **WHEN** the API reports a license name that is not a Creative Commons license
- **THEN** `license` is that name

#### Scenario: Script cannot be closed early

- **WHEN** a value contains `</script>`
- **THEN** the serialized block contains `\u003c/script>` and still parses to the original value

#### Scenario: Validators accept the markup

- **WHEN** the block built from real OWID data is checked with the Schema.org Markup Validator
- **THEN** it reports no errors and no warnings
