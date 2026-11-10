# co2-emissions-page Specification

## Purpose

Render the /co2-emissions/ page: server-rendered key figures, a chart-scoped country explorer, its data table, attribution and structured data.

## Requirements

### Requirement: The CO2 page fetches the full dataset once, server-side, with ISR

`/co2-emissions/` (rendered through the `[category]` segment and the category page registry) SHALL fetch `GET {API_BASE_URL}/co2-emissions` once, inside a Server Component, with `getCo2Emissions()`, and SHALL pass the validated payload and `meta` as props. Choosing a country or a metric MUST NOT trigger any request. The page SHALL NOT be pre-rendered at build time: it is generated on demand after a deploy and then served from cache and refreshed in the background at most once per day, so `next build` never calls the BFF. A failed fetch (including a BFF `502`) SHALL NOT be rendered or cached: during revalidation the last good page is kept; on a first render the app's `error.tsx` is shown and nothing is cached. The page SHALL have no Suspense boundary around the awaited fetch, so the delivered HTML holds the content in the visible document.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the CO2 payload
- **WHEN** `/co2-emissions/` is generated
- **THEN** the HTML contains the heading "CO2 Emissions", the World key figures and the explorer with World selected

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running
- **WHEN** `npx nx build web` runs
- **THEN** the build completes and `/co2-emissions/` is not fully pre-rendered

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

`generateMetadata` for `co2-emissions` SHALL use the keyword-bearing title "CO2 Emissions by Country" (rendered as "CO2 Emissions by Country | eco-metrics earth", 44 characters), the description "CO2 emissions by country since 1950: a world map and ranking of emissions per person, and yearly totals for every country. Data from Our World in Data." (151 characters, naming the map and ranking), the canonical URL `{siteUrl}/co2-emissions/` and matching Open Graph/Twitter tags. The `<h1>` SHALL remain "CO2 Emissions" (`co2-title-override`). The page SHALL carry the schema.org `Dataset` JSON-LD defined in "schema.org Dataset structured data for the CO2 page". The key figures, the page text, the world map card (title, slider, map skeleton, legend) with its collapsed ranking table for the default year, and the collapsed table of the default selection SHALL be in the server-rendered HTML.

#### Scenario: Metadata

- **WHEN** `/co2-emissions/` is requested
- **THEN** `<title>` is "CO2 Emissions by Country | eco-metrics earth", the meta description is the text above and `<link rel="canonical">` ends with `/co2-emissions/`
- **AND** `og:title` and `twitter:title` are "CO2 Emissions by Country", and `og:description` and `twitter:description` equal the meta description

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

An E2E spec `apps/web/e2e/co2-emissions.spec.ts` (Playwright `test(...)`, mirroring `water-footprint.spec.ts` and running against the real BFF, which in the E2E environment reads OWID from a local fixture server, in `chromium-desktop`; the render, no-overflow, 360 px layout, country-selection-by-typing and metric-toggle tests are `@smoke` and also run in the other four projects) SHALL cover: core render with heading, key figures, chart SVG and attribution; server-rendered figures in the raw HTML; metadata; combobox typing ("arg" shows Argentina, selecting it updates the chart title, flag `fi-ar` is shown, no regional-indicator emoji); the full keyboard flow (ArrowDown, ArrowUp, Home, End, Enter, Escape); the metric toggle; no URL change; the data table; the dependencies endpoint (`/api/v1/health/dependencies` is `200` with `owid` up, probing the fixture server); the theme toggle; the number of flag image requests after opening the list staying small; axe; and no console errors. `a11y.spec.ts` and `seo.spec.ts` SHALL be updated for the page (the CO2 meta description expectation changes).

#### Scenario: Spec runs in all five projects

- **WHEN** `npm run e2e` runs
- **THEN** `co2-emissions.spec.ts` executes fully in `chromium-desktop` and passes
- **AND** only its render, no-overflow, 360 px layout, country-selection and metric-toggle tests execute in `firefox-desktop`, `webkit-desktop`, `mobile-chrome` and `mobile-safari`, and pass

#### Scenario: E2E never reaches live OWID

- **WHEN** the E2E webServer wrapper starts the servers
- **THEN** a local fixture server is listening and the API is started with `OWID_GRAPHER_BASE_URL` (and `OWID_API_BASE_URL`) pointing at it, so no E2E request leaves the machine for OWID
- **AND** the fixture server serves, for both chart slugs, the filtered CSV and the `.metadata.json`, and the indicator metadata, with a handful of entities (World, Argentina, one entity with null years)

#### Scenario: Existing specs still pass

- **WHEN** the E2E suite runs
- **THEN** `seo.spec.ts` expects the new CO2 description and the other category expectations are unchanged

### Requirement: schema.org Dataset structured data for the CO2 page

The page SHALL server-render exactly one `<script type="application/ld+json">` block describing the data behind the page (the world map, its ranking table and the explorer chart all show this one dataset, so they share this one block and none gets its own) as a schema.org `Dataset`, built from the same BFF payload as the page (no hard-coded years, units or dataset version). It SHALL carry `name` (including the year range), a `description` of 50 to 5000 characters (naming the world map and country ranking as views of the data), `url` (the canonical page URL with trailing slash), `keywords`, `isAccessibleForFree: true`, `license` as the versioned license URL when the API's license name is a Creative Commons license (derived from the name, e.g. `https://creativecommons.org/licenses/by/4.0/`, so the name stays spelled out only in the API's publisher definition) and the license name otherwise, `creator` (the provider as an `Organization`), `isBasedOn` (the upstream dataset with its name, version and publisher), `dateModified` (the provider timestamp from `meta.source.lastUpdated`), `temporalCoverage` as an ISO 8601 interval `startYear/endYear`, `spatialCoverage` (a `Place` named World with a whole-Earth `GeoShape` box), `variableMeasured` (one `PropertyValue` per metric with the payload's unit as `unitText`) and `includedInDataCatalog` (the site's `/data-sources/` page). No `distribution` is declared: the site offers no download. The JSON SHALL be serialized with `<` escaped as `\u003c`.

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

### Requirement: World map of CO2 emissions per capita for a selected year

Below the explorer, the CO2 page SHALL render a card titled "CO2 emissions per capita, {year} (tonnes per person)" holding a year slider, a world choropleth map and a legend. Each country SHALL be filled by its per-capita value for the selected year in five classes (< 1, 1–3, 3–6, 6–10, ≥ 10 tonnes per person) of the sequential palette; World is not drawn. Regions without a value for that year (no entity, no per-capita value, or a region without an entity code) SHALL use the no-data fill and be inert: no hover emphasis, no tooltip, no selection. The tooltip of a country SHALL read "{name} · {year}", its per-capita value with the per-capita formatter and "t per person", and its total with the total formatter and "Mt total" ("Total: no data" when missing). The map SHALL support zoom and drag; on viewports 640 px and wider a vertical control group SHALL offer "Zoom in", "Zoom out" and "Reset view"; below 640 px only a "Reset view" button SHALL appear, once the view has moved, and disappear after resetting. The map SHALL show the whole world at zoom 1 in a box that keeps the map's aspect ratio. The legend SHALL be HTML, listing the five classes and "No data", each label under its swatch.

#### Scenario: Latest year by default

- **WHEN** the page loads
- **THEN** the slider value and the map title show `data.endYear`

#### Scenario: Changing the year

- **WHEN** the user moves the slider to 1990
- **THEN** the title reads "CO2 emissions per capita, 1990 (tonnes per person)", the map recolors for 1990 and the year bubble shows 1990

#### Scenario: Region without data

- **GIVEN** a region with no per-capita value for the selected year
- **WHEN** the user hovers or taps it
- **THEN** no tooltip appears and it is not selected

#### Scenario: Reset button on narrow screens

- **GIVEN** a viewport narrower than 640 px
- **WHEN** the page loads
- **THEN** no map control button is shown
- **AND WHEN** the user zooms or drags the map
- **THEN** a "Reset view" button appears, and pressing it restores the initial view and hides the button

### Requirement: Ranking table of countries for the selected year

Below the map, in the same card, the page SHALL render a table collapsed under "View data table" (like the other data tables), captioned "Countries ranked by {measure}, {year}" ({measure} is "CO2 emissions per capita" or "total CO2 emissions", the sort measure) inside a keyboard-focusable scroll region, with columns Rank, Country (flag and name), Per capita (t/person) and Total (Mt). At 360 px the table SHALL fit without horizontal scrolling, flags included; the Rank header shows "#" below 640 px (still named "Rank" for assistive technology). Rows SHALL be every country with a per-capita value for the selected year (World excluded), ordered from the highest per-capita value by default. Both value headers SHALL be sort buttons: pressing the active one reverses the order, pressing the other one sorts by it, highest first; the active header cell carries `aria-sort`. Ranks are competition ranks by the sort measure, highest first (equal values share a rank and are ordered by name), and SHALL not change with the order; a country without a total is listed last, unranked, when sorting by total. Changing the year SHALL keep the chosen sort. The table SHALL be server-rendered for the default year.

#### Scenario: Highest first by default

- **WHEN** the page loads
- **THEN** the first row is the country with the highest per-capita value in `data.endYear` and its rank is 1, and the per-capita header has `aria-sort="descending"`

#### Scenario: Reverse the order

- **WHEN** the user activates the per-capita header button
- **THEN** the first row is the country with the lowest value, it keeps its descending rank, and the header has `aria-sort="ascending"`

#### Scenario: Sort by total

- **WHEN** the user activates the total header button
- **THEN** the first row is the country with the highest total in the selected year, ranked 1, the caption reads "Countries ranked by total CO2 emissions, {year}" and the total header has `aria-sort="descending"`

#### Scenario: Order survives a year change

- **GIVEN** the table sorted lowest first
- **WHEN** the user selects another year
- **THEN** the rows are the countries of that year, still lowest first

### Requirement: Map and table selection highlight each other

Activating a country on the map SHALL select it on the map and highlight its table row (marked with `aria-current="true"`) and scroll the row into view inside the table region without scrolling the page. Each row's country name SHALL be a button that selects that country on the map and highlights the row. Activating the selected country again SHALL clear the selection. The selection SHALL persist across year changes while the country has a value, and clear when it has none.

#### Scenario: Selection ends in a year without a value

- **GIVEN** Argentina is selected
- **WHEN** the user moves to a year where Argentina has no value, and back
- **THEN** nothing is selected

#### Scenario: From the table to the map

- **WHEN** the user activates the "Argentina" button in the table
- **THEN** Argentina's row has `aria-current="true"` and Argentina is selected on the map

#### Scenario: Toggle off

- **GIVEN** Argentina is selected
- **WHEN** the user activates the "Argentina" button again
- **THEN** no row has `aria-current` and nothing is selected on the map

### Requirement: The map loads lazily behind a same-shape skeleton

The map sits below the explorer's chart, the first chart of the page, so it SHALL mount when it scrolls into view (`RenderWhenVisible`) and render in the browser only, through the lazy map entry, with a `map` skeleton of the same box in the server HTML, until it scrolls into view and while the geometry loads; the skeleton draws the land outline of the map in the map's own frame (generated with the geometry). The explorer's line chart, the first chart, SHALL NOT be deferred. The CO2 entry in `CATEGORY_SKELETONS` SHALL be the introduction, the key figures and the explorer, down to the first chart, so a pending navigation shows the same shape.

#### Scenario: Server HTML

- **WHEN** the page HTML is requested
- **THEN** it contains the map card with its title, the slider, the map skeleton and the ranking table rows, and no map SVG

#### Scenario: Map mounts when scrolled into view

- **GIVEN** the page has loaded with the map card below the viewport
- **WHEN** the map card scrolls into view
- **THEN** the map draws in place of its skeleton without a layout shift

#### Scenario: Pending navigation

- **WHEN** a client navigation to the CO2 page is pending
- **THEN** the skeleton shows the introduction, key figures and explorer blocks, and no map block
