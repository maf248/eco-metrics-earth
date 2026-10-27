## ADDED Requirements

### Requirement: The page fetches the full dataset once, server-side, with ISR

`/energy-sources/` (rendered through the `[category]` segment and the category page registry) SHALL fetch `GET {API_BASE_URL}/energy-sources` once, inside a Server Component, with `getEnergySources()`, and SHALL pass the validated payload and `meta` as props. Choosing a country or switching the measure toggle MUST NOT trigger any request. The page SHALL NOT be pre-rendered at build time: it is generated on its first request after a deploy and then served from the ISR cache (`revalidate = 86400`), so `next build` never calls the BFF. A failed fetch (including a BFF `502`) SHALL NOT be rendered or cached: during revalidation the last good page is kept; on a first render the app's `error.tsx` is shown and nothing is cached.

#### Scenario: Healthy BFF

- **GIVEN** the BFF serves the energy sources payload
- **WHEN** `/energy-sources/` is generated
- **THEN** the HTML contains the heading "Energy Sources", the World key figures and the explorer with World selected

#### Scenario: Build does not call the BFF

- **GIVEN** no API server is running
- **WHEN** `npx nx build web` runs
- **THEN** the build completes and `/energy-sources/` is not pre-rendered

#### Scenario: No requests on interaction

- **WHEN** a user selects another country or switches between "Share (%)" and "Generation (TWh)"
- **THEN** no additional network request to the BFF is made

#### Scenario: BFF down during revalidation

- **GIVEN** a cached `/energy-sources/` page and a BFF that fails both attempts
- **WHEN** the page is revalidated
- **THEN** visitors keep receiving the previously cached page

#### Scenario: BFF down on first request

- **GIVEN** no cached page and a BFF that fails both attempts
- **WHEN** the page is requested
- **THEN** `error.tsx` is shown and nothing is cached

### Requirement: Shares are derived from generation by one pure helper

The payload carries only generation (TWh); every percentage on the page SHALL come from one pure helper in `apps/web/src/lib/energyMix.ts` (also defining the source display labels, in the order of `ENERGY_SOURCE_IDS`, `Coal`, `Gas`, `Oil`, `Nuclear`, `Hydro`, `Wind`, `Solar`, `Bioenergy & other renewables`, and a lower-case form for running text). For each year, `share_i = generation_i / sum(present generation) × 100` computed from the served (already rounded) values; a `null` generation stays a `null` share and does not enter the sum; a year whose present generation is all `null` or sums to 0 has no shares at all. Shares are rounded only for display. The **latest year** of an entity SHALL be the latest year with a positive generation sum. **Renewables** are the sources in `RENEWABLE_SOURCE_IDS`; the **renewables share** of an entity-year is the sum of its renewable shares (a `null` renewable counts as nothing); the **largest source** is the source with the greatest present share, ties going to the earlier source in the fixed order. There is no low-carbon aggregate.

#### Scenario: Shares from generation

- **GIVEN** an entity-year with generation `coal 60`, `gas 40` and every other source `null`
- **WHEN** the shares are derived
- **THEN** `coal` is 60, `gas` is 40, the others are `null`, and the present shares sum to 100

#### Scenario: A year without generation has no shares

- **GIVEN** a year whose eight generation values are all `null`, or sum to 0
- **WHEN** the shares are derived
- **THEN** every share of that year is `null`

#### Scenario: Latest year skips years without generation

- **GIVEN** an entity whose last array position has only `null` values and whose previous year has generation
- **WHEN** its latest year is computed
- **THEN** it is the previous year

#### Scenario: Renewables share sums the renewable sources

- **GIVEN** World 2025 generation (TWh) `coal 10471.53`, `gas 6921.14`, `oil 841.62`, `nuclear 2811.57`, `hydro 4434.97`, `wind 2713.14`, `solar 2778.64`, `bioenergyOther 799.74`
- **WHEN** the renewables share is computed
- **THEN** it is about `33.76`, which displays as `33.8`

#### Scenario: Largest source and ties

- **GIVEN** the generation above, and another entity-year where `coal` and `gas` are equal and highest
- **WHEN** the largest source is computed
- **THEN** the first returns `coal` (32.96%) and the second also returns `coal` (earlier in the fixed order)

### Requirement: Share and generation formatting

Every share (derived) and generation value shown to the user (key figures, tooltips, tables, axis labels) SHALL be formatted with a fixed `en-US` locale so server and client render identical text. Shares SHALL have one decimal (`33.0`, `8.5`); a positive share below `0.05` SHALL read `< 0.1` and an exact `0` SHALL read `0.0`. Generation in TWh SHALL have no decimals from 100 up (`10,539`), one decimal from 1 up to 100 (`62.2`) and two decimals below 1 (`0.01`). The percentage axis labels SHALL be whole numbers followed by `%`; the TWh axis labels SHALL use the compact formatter. Missing values SHALL read as an em dash in tables and `No data` in tooltips, never `0`.

#### Scenario: Share formatting

- **WHEN** the share formatter receives `32.957996`, `0`, `0.003` and `100`
- **THEN** it returns `33.0`, `0.0`, `< 0.1` and `100.0`

#### Scenario: Generation formatting

- **WHEN** the TWh formatter receives `10538.94`, `62.21` and `0.01`
- **THEN** it returns `10,539`, `62.2` and `0.01`

#### Scenario: Server and client agree

- **WHEN** a formatted value is rendered on the server and again on the client during hydration
- **THEN** the text is identical and no hydration warning is logged

### Requirement: Server-rendered key figures

The page SHALL render, as plain server-rendered text derived from the World entity of the same payload (shares via the helper) and inside a single box, exactly two figures: (a) the World's renewables share in its latest year and (b) the World's largest single source in that year with its share. The wording SHALL be of the form "In 2025, renewables generated 33.8% of the world's electricity. The largest single source was coal, at 33.0%." The year SHALL come from the payload (the World's latest year), the percentages SHALL be formatted with one decimal, and the source name SHALL be the lower-case label (`bioenergy & other renewables` for that source). The text SHALL be present in the raw HTML without JavaScript and SHALL carry `data-testid="energy-key-figures"`. The page SHALL NOT show any other key figure (no fossil, low-carbon or per-country figure).

#### Scenario: Figures in the raw HTML

- **WHEN** the raw HTML of `/energy-sources/` is fetched without executing JavaScript
- **THEN** it contains the latest year, the World's renewables share and the largest source with its share as text

#### Scenario: Exactly two figures

- **WHEN** the key-figures box renders
- **THEN** it contains the renewables share and the largest-source name with its share, and nothing else numeric apart from the year

#### Scenario: Latest year skips trailing nulls

- **GIVEN** a World entity whose last array element is `null` for every source
- **WHEN** the key figures are computed
- **THEN** the latest year with generation is used

#### Scenario: Year and shares come from the payload

- **GIVEN** a payload whose World latest year is 2023
- **WHEN** the key figures render
- **THEN** the text starts with "In 2023," and the shares are those of 2023

### Requirement: Stacked area of one country's mix with a Share / Generation toggle

Below the key figures, `CountryExplorer` SHALL host the selected country's mix as a stacked area chart (ECharts `line` series with `areaStyle` and a shared `stack`), World selected by default through the country combobox. A measure toggle (the generic `MeasureToggle`, legend "Measure") SHALL offer "Share (%)" (default) and "Generation (TWh)". The chart option SHALL come from a pure builder with these properties: eight series in the fixed source order (coal at the bottom of the stack, bioenergy & other renewables at the top), named with the source labels, always all eight so that each source keeps its position and its colour whatever the data; opaque areas (`areaStyle.opacity` 1) so the rendered colours are the validated palette; the year axis from the shared `buildYearAxis` helper; a visible `legend` of type `scroll`; `tooltip` on the axis with a value formatter (`<share>%` or `<TWh> TWh`, `No data` for `null`); `null` values left as gaps, never zeros; in "Share (%)" mode a value axis fixed to 0-100 with `%` labels, and in "Generation (TWh)" mode a value axis starting at 0 with compact labels. The option SHALL name no colour: the chart SHALL use the energy mix palette (`palette="energyMix"`), selected through the chart wrapper. The chart title SHALL name the country and the measure (for example "Spain: share of electricity by source (%)"), and a polite live region SHALL announce the selection ("Showing share of electricity by source for Spain").

#### Scenario: World and share by default

- **WHEN** the page renders
- **THEN** the combobox shows World, "Share (%)" is checked and the chart title reads "World: share of electricity by source (%)"

#### Scenario: Eight stacked series in fixed order

- **WHEN** the option is built for any entity and either measure
- **THEN** it has eight `line` series sharing one `stack`, each with an area style, named Coal, Gas, Oil, Nuclear, Hydro, Wind, Solar and Bioenergy & other renewables, in that order

#### Scenario: Share axis is 0 to 100

- **WHEN** the option is built for the "Share (%)" measure
- **THEN** the value axis has `min` 0 and `max` 100 and its labels end with `%`

#### Scenario: Generation axis starts at zero

- **WHEN** the option is built for the "Generation (TWh)" measure
- **THEN** the value axis has `min` 0 and no fixed `max`, and the series data are the entity's `generation` arrays (in "Share (%)" mode the series data are the derived shares)

#### Scenario: Missing values are gaps

- **GIVEN** an entity whose gas share is `null` in 2000
- **WHEN** the option is built
- **THEN** the gas series has `null` at the 2000 index and the tooltip formatter prints `No data` for it

#### Scenario: Options carry no colours

- **WHEN** the area and donut option builders run
- **THEN** the returned options contain no color property, `var(`, `oklch(`, `#` colour literal or `rgb` string (only an opacity is set)

#### Scenario: Legend always visible

- **WHEN** the chart renders
- **THEN** a legend naming all eight sources is shown

#### Scenario: Switching the measure rebuilds the chart without a request

- **WHEN** the user selects "Generation (TWh)"
- **THEN** the chart title, the axis and the series change, the live region announces it and no network request is made

#### Scenario: Selecting another country

- **WHEN** the user selects Argentina in the combobox
- **THEN** the chart title, the donut and both tables show Argentina

### Requirement: Donut of the latest year's mix for the selected country

Below the stacked chart, inside the same explorer card and driven by the same selection, the page SHALL render a donut (ECharts `pie` with an inner radius) of the selected country's mix in its latest year (as defined above), with no year selector and no dependence on the measure toggle (slice sizes are shares). Its heading SHALL name the country and the year (for example "Spain: electricity mix in 2024"). The option SHALL come from a pure builder: eight data items always present in the fixed source order, so that each source keeps its colour; a source without a value has `value: null` (no slice, `No data` in the tooltip); labels on the slices hidden (the legend and the table carry the names); a visible `legend` of type `scroll`; a tooltip showing the source, the share in `%` and the generation in TWh (for example "Coal: 33.0% (10,472 TWh)"); and no colours. The donut SHALL use the energy mix palette. It SHALL be mounted with `RenderWhenVisible` (a same-height skeleton, including in the server-rendered HTML, until it scrolls near the viewport) and loaded through a dedicated lazy entry that registers ECharts' `PieChart` where it is used, so the pie code never ships to pages without a donut. A polite live region SHALL announce the selection change.

#### Scenario: Latest year of the selected entity

- **GIVEN** Algeria, whose latest generation is 2024 although the payload `endYear` is 2025
- **WHEN** Algeria is selected
- **THEN** the donut heading says "Algeria: electricity mix in 2024"

#### Scenario: Eight items in fixed order

- **WHEN** the donut option is built
- **THEN** its single `pie` series has eight data items named Coal ... Bioenergy & other renewables in the fixed order, with an inner radius greater than 0

#### Scenario: A source without data keeps its slot

- **GIVEN** an entity with no gas generation in its latest year
- **WHEN** the option is built
- **THEN** the gas item has `value: null`, and the remaining items keep their positions

#### Scenario: The accessible description never reads NaN

- **GIVEN** an entity with a source without a value
- **WHEN** the donut or the stacked area option is built and rendered
- **THEN** its `aria.label.description` names the entity (and for the donut each source with its share or "no data"), and the chart container's `aria-label` contains no "NaN"

#### Scenario: Tooltip shows percentage and TWh

- **WHEN** the tooltip formatter runs for Coal with share 32.96 and generation 10471.53
- **THEN** it returns text containing "Coal", "33.0%" and "10,472 TWh"

#### Scenario: Rendered only when visible

- **GIVEN** an `IntersectionObserver` that has not reported an intersection
- **WHEN** the explorer renders
- **THEN** the donut area shows a skeleton of the chart's height and the pie chart is not mounted

#### Scenario: Mounted on intersection

- **WHEN** the observer reports an intersection
- **THEN** the pie chart mounts and renders an SVG

#### Scenario: Pie is registered where used

- **WHEN** the module graph of the cartesian chart wrapper (`LazyEChart`) is inspected
- **THEN** it does not import `PieChart`; the donut's lazy entry registers it

#### Scenario: Synced with the selector

- **WHEN** the user changes the country
- **THEN** the donut heading, slices and table change to that country's latest year without a request

### Requirement: Accessible equivalents of both charts

The page SHALL pair the charts with tables, because ECharts offers no keyboard navigation inside a chart. (a) For the stacked chart, a collapsed "View data table" built on `YearDataTable` in its wide form: one row per year from `endYear` down to `startYear`, a `Year` column plus eight source columns, horizontally scrollable on a 375 px viewport (a keyboard-focusable scroll region labelled `Data table for <entity name>, scrollable`), headers carrying the unit (for example `Coal (%)`). The table SHALL follow the measure toggle: in "Share (%)" it shows shares, in "Generation (TWh)" it shows generation, so it is always the equivalent of the visible chart (decision recorded in `design.md`). (b) For the donut, a table of the selected country's latest year with one row per source in the fixed order and the columns `Source`, `Share (%)` and `Generation (TWh)`, a caption naming the country and the year, `scope` on every header and an em dash where a value is `null`; it SHALL be visible (not collapsed) and server-rendered for the default selection. Neither table SHALL be drawn by ECharts.

#### Scenario: Year table is wide, collapsed and labelled

- **WHEN** the page renders
- **THEN** a `<details>` with the summary "View data table" is collapsed, its scroll region has `tabIndex` 0 and the label `Data table for World, scrollable`, and the table has nine column headers (`Year` plus eight sources)

#### Scenario: Year table follows the toggle

- **WHEN** the user selects "Generation (TWh)"
- **THEN** the year table's headers end with `(TWh)` and its cells show generation values; selecting "Share (%)" restores `(%)` headers and shares

#### Scenario: Rows newest first with em dash for gaps

- **GIVEN** an entity whose 2000 gas share is `null`
- **WHEN** the year table renders in "Share (%)"
- **THEN** the first body row is `endYear` and the 2000 gas cell shows an em dash

#### Scenario: Wide table scrolls on mobile

- **GIVEN** a 375 px viewport
- **WHEN** the year table is opened
- **THEN** the table is wider than its scroll region, the page itself does not scroll horizontally, and the region can be scrolled by keyboard

#### Scenario: Latest-year table

- **WHEN** the page renders for World
- **THEN** a visible table captioned "World: electricity mix in 2025" lists eight sources with share and generation, in the fixed order, in the raw HTML

#### Scenario: Latest-year table has dashes for missing values

- **GIVEN** an entity with no nuclear value in its latest year
- **WHEN** the latest-year table renders
- **THEN** the nuclear row shows em dashes in both value columns

### Requirement: Attribution, upstream credit and methodology below the explorer

Below the explorer card the page SHALL render, in this order: a methodology footnote and the "Data:" attribution built with `DataAttribution` (OWID, license and dataset name from `meta.source`) whose `extra` slot holds `OriginCredit` for `data.origin` (Ember, linked title, linked license, then any notice the origin carries). Every string SHALL come from the API payload, none from literals. The footnote SHALL state: (1) the page covers **electricity generation only**, not total (primary) energy, so the share of renewables in all energy use (heating, transport, industry) is lower than their share of electricity; (2) shares are each source's part of the electricity generated by the eight sources shown, computed by this site from the generation values; (3) "Bioenergy & other renewables" is the sum of bioenergy and other renewables, which include geothermal, wave and tidal (a change made by this site to the provider's series, stated as CC BY 4.0 asks); (4) the data starts in 2000; and (5) a blank value means the source reported no generation. It SHALL carry `data-testid="energy-methodology"`; the attribution `data-testid="energy-attribution"` and the origin `data-testid="energy-origin"`.

#### Scenario: Attribution links

- **WHEN** the page renders
- **THEN** the "Data:" paragraph links "Our World in Data" to `https://ourworldindata.org`, shows `(CC BY 4.0)` and the dataset name, and links "All data sources" to `/data-sources/`

#### Scenario: Ember is credited

- **WHEN** the page renders
- **THEN** the attribution contains `Ember`, a link "Yearly Electricity Data" to `https://ember-energy.org/data/yearly-electricity-data/` and a link "CC BY 4.0" to `https://ember-energy.org/creative-commons/`

#### Scenario: Footnote content

- **WHEN** the footnote is read
- **THEN** it mentions electricity (not total energy), the bioenergy and other renewables grouping with geothermal, wave and tidal, and the 2000 start

#### Scenario: Credit comes from the payload

- **GIVEN** a payload whose `origin.producer` is changed in a test
- **WHEN** the page renders
- **THEN** the credit shows that producer

### Requirement: SEO and metadata for the energy sources page

`CATEGORY_DESCRIPTIONS['energy-sources']` in `apps/web/src/lib/categoryMetadata.ts` SHALL replace the "coming soon" placeholder with copy describing the live content, 110-160 characters, unique and different from the site description: `Electricity mix by country since 2000: coal, gas, oil, nuclear, hydro, wind, solar and bioenergy, as a share and in TWh. Data from Our World in Data.` The page `<title>` SHALL be overridden to `Electricity Mix by Country` (so the document title is `Electricity Mix by Country | eco-metrics earth`) while the `<h1>` stays `Energy Sources`. The page SHALL keep a canonical URL with a trailing slash, the shared Open Graph and Twitter metadata, and server-rendered key figures, the latest-year table and the default year table in the HTML.

#### Scenario: Description is live and within bounds

- **WHEN** the description of `energy-sources` is read
- **THEN** it is between 110 and 160 characters, does not contain "coming soon", and is unique among the 12 categories

#### Scenario: Title override

- **WHEN** the metadata of `/energy-sources/` is generated
- **THEN** its title is `Electricity Mix by Country | eco-metrics earth` and the `<h1>` is `Energy Sources`

#### Scenario: Canonical and social tags

- **WHEN** the page head is read
- **THEN** it has a canonical link ending in `/energy-sources/` and `og:title`, `og:description`, `twitter:description` equal to the page description

### Requirement: schema.org Dataset structured data for the energy sources page

The page SHALL declare its data once as a schema.org `Dataset` in JSON-LD (rendered with `JsonLd`, built by `buildDatasetJsonLd` from the page's own payload, never one block per chart). The name SHALL read `Electricity generation mix by country, 2000–2025` (years from the payload), `temporalCoverage` `2000/2025`, `variableMeasured` two `PropertyValue`s (electricity generation by source with the payload's unit `TWh`, and share of electricity generation by source with unit `%`, derived), `isBasedOn` the OWID dataset (name and version from the payload) and the Ember origin as a `Dataset` published by Ember at the origin URL, and the description SHALL state that the data covers electricity only and that bioenergy and other renewables are summed.

#### Scenario: One Dataset block

- **WHEN** the raw HTML of `/energy-sources/` is read
- **THEN** it contains exactly one `application/ld+json` block, of `@type` `Dataset`, whose `url` ends in `/energy-sources/`

#### Scenario: Built from the payload

- **GIVEN** a payload with `startYear` 2000, `endYear` 2025 and unit `TWh`
- **WHEN** the Dataset is built
- **THEN** `name` is `Electricity generation mix by country, 2000–2025`, `temporalCoverage` is `2000/2025`, `variableMeasured` has two entries for TWh and %, and `isBasedOn` lists the OWID dataset and the Ember dataset

#### Scenario: License and creator

- **WHEN** the Dataset is built
- **THEN** `license` is `https://creativecommons.org/licenses/by/4.0/` and `creator` is the OWID organization

### Requirement: Accessible, mobile-ready presentation using tokens only

The page SHALL follow `docs/design-system.md`: UI colours only from semantic tokens (no Tailwind palette or arbitrary colour utilities; `designTokens.test.ts` passes), chart colours only from the energy mix tokens through the theme adapter, `text-base` and `min-h-11` for the toggle and combobox, a usable layout at 375 px with no horizontal page scroll, a visible focus ring on every control, one `h1` (from the route), a section `h2` for the explorer and `h3` chart titles, a legend on every chart, and a table equivalent for each chart. Colour SHALL NOT carry identity alone: the legend, the tooltip, the donut table and the year table name every source. The page SHALL keep two charts (stacked area and donut), the donut deferred until visible.

#### Scenario: Token guard passes

- **WHEN** `designTokens.test.ts` runs
- **THEN** it passes with the new `--energy-*` tokens and the new components

#### Scenario: No horizontal page scroll on mobile

- **GIVEN** a 375 px viewport
- **WHEN** the page renders with the year table open
- **THEN** the document has no horizontal scrollbar; only the table's scroll region scrolls

#### Scenario: Keyboard operation

- **WHEN** a user tabs through the page
- **THEN** the combobox, the two toggle radios, the "View data table" summary and the table scroll region are reachable and show a focus ring

#### Scenario: Axe finds no critical or serious violations

- **WHEN** the axe audit runs on `/energy-sources/` in the light theme, in the dark theme, with the country list open and with the year table open
- **THEN** it reports no critical or serious violations

### Requirement: End-to-end coverage against fixture-backed OWID

`apps/web/e2e/energy-sources.spec.ts` (Playwright, `test(...)`) SHALL run against the OWID fixture server and the real API and web servers started by `run-dev-servers.ts`; E2E SHALL never reach the live provider. The OWID fixture server SHALL gain routes for `/grapher/electricity-production-by-source.csv` and `/v1/indicators/1295503.metadata.json`, backed by trimmed fixtures committed under `apps/web/e2e/fixtures/owid/` in the real provider format (World plus a few countries, including one with blank cells and one whose latest year is before the payload `endYear`, over 2000 onward). The spec SHALL cover: the heading, key-figures text, stacked chart SVG and attribution; the Ember credit links; the server-rendered key figures, latest-year table and Dataset JSON-LD; the title, description and canonical; selecting a country by typing in the combobox and seeing the chart title and donut heading change; toggling "Generation (TWh)" and seeing the year table headers change; the donut mounting after scrolling it into view; that `GET {API_BASE_URL}/energy-sources` answers `startYear` 2000 with no value before it; no console errors or uncaught page errors; and no BFF request on interaction. `a11y.spec.ts` SHALL gain the four axe scenarios above and `seo.spec.ts` SHALL include `energy-sources` in the unique-description check. The owid fixture-server unit test SHALL cover the new routes.

#### Scenario: Core render

- **WHEN** `/energy-sources/` loads in E2E
- **THEN** the status is 200, the `h1` is "Energy Sources", `energy-key-figures` matches the key-figures pattern, a chart SVG is visible and the attribution lists Our World in Data and Ember

#### Scenario: Country and measure interactions

- **WHEN** the test types "Argentina" in the combobox and presses Enter, then selects "Generation (TWh)"
- **THEN** the chart title names Argentina, the donut heading names Argentina and its latest year, and the year table headers end with `(TWh)`

#### Scenario: Donut mounts when scrolled into view

- **WHEN** the donut section is scrolled into view
- **THEN** a second chart SVG is rendered

#### Scenario: The API serves nothing before 2000

- **WHEN** the test requests `GET {API_BASE_URL}/energy-sources`
- **THEN** `data.startYear` is 2000 and every entity array has length `endYear - 2000 + 1`

#### Scenario: Zero console errors

- **WHEN** the page is loaded and the interactions above are performed
- **THEN** no console error or page error is collected

#### Scenario: Fixture server routes

- **WHEN** the fixture-server unit test requests the two new paths
- **THEN** each answers 200 with the committed fixture and the content type of its route
