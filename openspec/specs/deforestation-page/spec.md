# deforestation-page Specification

## Purpose

The `/deforestation/` page: key figures, the forest area explorer, the forest change map with its ranking, tree cover loss by cause and the methodology note, in two independently degrading sections, with attribution, SEO and structured data.

## Requirements

### Requirement: The deforestation page is a live, sectioned category

`/deforestation/` SHALL be registered in `CATEGORY_PAGES` through `defineSectionedProviderCategoryPage` with two sections, `forestArea` (loads `GET /api/v1/deforestation/forest-area`) and `treeCoverLoss` (loads `GET /api/v1/deforestation/tree-cover-loss`), each with `provider.name` "Our World in Data" and its own state. It SHALL have an entry in `CATEGORY_SKELETONS` that repeats the page layout (so the category becomes live: home card, sitemap entry, no `noindex`), a home card summary of at most 120 characters in `LIVE_CATEGORY_SUMMARIES`, and no `loading.tsx` or `<Suspense>` around its data. The page SHALL render, in this order: the intro line, the key figures panel, the forest area card (`<h2>` "Forest area"), the change card (`<h2>` "Forest change since 1990"), the cause card (`<h2>` "Tree cover loss by cause") and the methodology note. The first three are fed by the `forestArea` state and the cause card by the `treeCoverLoss` state; the methodology note is static and always rendered.

#### Scenario: Page renders every block in order

- **GIVEN** both endpoints answer with fresh data
- **WHEN** `/deforestation/` is requested
- **THEN** the HTML contains, in order, the intro line, the key figures, the headings "Forest area", "Forest change since 1990" and "Tree cover loss by cause", and the methodology note

#### Scenario: Page is live

- **WHEN** the home page and `/sitemap.xml` are requested
- **THEN** the home lists a Deforestation card with its summary and the sitemap lists `/deforestation/`
- **AND** `/deforestation/` has no `noindex` robots tag

#### Scenario: Skeleton matches the page

- **WHEN** the test that compares `CATEGORY_SKELETONS` with `CATEGORY_PAGES` runs
- **THEN** `deforestation` is present in both

#### Scenario: Static rendering is kept

- **WHEN** the production build runs
- **THEN** the page is served from the ISR cache and `deforestation` no longer appears in the placeholder `generateStaticParams`

### Requirement: The page opens with an intro line

The page SHALL show, directly under the `<h1>`, the line "How much forest is the world losing, where, and why?".

#### Scenario: Intro line is server-rendered

- **WHEN** `/deforestation/` is requested without JavaScript
- **THEN** the HTML contains "How much forest is the world losing, where, and why?"

### Requirement: Key figures are derived server-rendered prose

The key figures panel SHALL be one server-rendered paragraph derived from the World entity of the `forest-area` payload, never hardcoded: "Since {startYear} the world has lost a net **{N} million hectares** of forest, an area the size of Mexico. Forests now cover **{S}%** of the world's land." `{startYear}` is the payload's `startYear`; `{N}` is the absolute World net change in million hectares rounded to an integer and formatted `en-US`; `{S}` is the World `share` of `endYear` with one decimal. The numbers SHALL be wrapped in `<strong>`. The clause ", an area the size of Mexico" SHALL be shown only for a net loss whose rounded value is within the inclusive range 180 to 215 million hectares (Mexico: 196.4 million hectares of total area); outside the range it SHALL be omitted and the sentence SHALL end after "of forest." A net gain SHALL read "Since {startYear} the world has gained a net **{N} million hectares** of forest." with no Mexico clause. A rounded change of 0 SHALL read "Since {startYear} the world's forest area has hardly changed." The panel SHALL be omitted when the `forestArea` section has no payload or the World entity lacks the first value, the last value or the last share.

#### Scenario: Net loss inside the Mexico range

- **GIVEN** the World area is 4,343,532,500 ha in 1990 and 4,140,214,500 ha in 2025, and the World share in 2025 is 31.905802
- **WHEN** the key figures are rendered
- **THEN** the text reads "Since 1990 the world has lost a net 203 million hectares of forest, an area the size of Mexico. Forests now cover 31.9% of the world's land."
- **AND** "203 million hectares" and "31.9%" are inside `<strong>` elements

#### Scenario: Net loss outside the Mexico range

- **GIVEN** the World net loss rounds to 150 million hectares
- **WHEN** the key figures are rendered
- **THEN** the text reads "Since 1990 the world has lost a net 150 million hectares of forest. Forests now cover" followed by the share sentence
- **AND** the text does not contain "Mexico"

#### Scenario: Range boundaries

- **GIVEN** a World net loss that rounds to 180, 215, 179 or 216 million hectares
- **WHEN** the key figures are rendered
- **THEN** 180 and 215 include the Mexico clause and 179 and 216 do not

#### Scenario: Net gain

- **GIVEN** the World net change is +12.4 million hectares
- **WHEN** the key figures are rendered
- **THEN** the text reads "Since 1990 the world has gained a net 12 million hectares of forest." with no Mexico clause

#### Scenario: No change

- **GIVEN** the World net change rounds to 0
- **WHEN** the key figures are rendered
- **THEN** the text reads "Since 1990 the world's forest area has hardly changed."

#### Scenario: Start year comes from the data

- **GIVEN** a payload whose `startYear` is 1992
- **WHEN** the key figures are rendered
- **THEN** the text starts with "Since 1992"

#### Scenario: Section without data

- **GIVEN** the `forestArea` section is unavailable
- **WHEN** the page renders
- **THEN** no key figures panel is rendered and the intro line and the other sections are unaffected

### Requirement: Net change is derived by one pure function

`lib/forestChange.ts` SHALL provide the net change of an entity from its `area` array and the payload's years: hectares `last - first` when both are non-null, and percent `(last - first) / first * 100` when both are non-null and `first > 0`, where `first` is the value of `startYear` and `last` the value of `endYear`. The key figures, the map and the ranking SHALL all use it. An entity without a first or a last value SHALL have no change; an entity with `first = 0` SHALL have a hectares change and no percentage. Map classes SHALL be assigned from the percentage rounded to one decimal.

#### Scenario: Normal entity

- **GIVEN** an entity with 618,443,260 ha in 1990 and 486,000,000 ha in 2025
- **WHEN** its change is computed
- **THEN** the hectares change is -132,443,260 and the percentage is about -21.4

#### Scenario: Zero first value

- **GIVEN** an entity with 0 ha in 1990 and 0 ha in 2025
- **WHEN** its change is computed
- **THEN** the hectares change is 0 and the percentage is undefined, never `NaN` or `Infinity`

#### Scenario: Missing endpoint

- **GIVEN** an entity with a `null` value in the latest year
- **WHEN** its change is computed
- **THEN** it has neither a hectares change nor a percentage

#### Scenario: Class boundary uses the displayed value

- **GIVEN** a percentage of -4.96 that displays as -5.0
- **WHEN** it is assigned a map class
- **THEN** it is assigned from -5.0, in the class the legend shows for -5.0

### Requirement: Forest area explorer

The forest area card SHALL contain a `CountryExplorer` with World selected by default and a `MeasureToggle` with the options "Hectares" (default) and "% of land". It SHALL show a line chart of the selected entity from the payload's `startYear` to `endYear`, a collapsed `YearDataTable` that follows the toggle (hectares in thousand hectares with the unit in the header, or the percentage), a hidden live region that announces the selection, and `DataAttribution` with the FAO `OriginCredit`. The hectares axis SHALL be labelled in million hectares when the entity's maximum value is at least 1 million hectares, otherwise in thousand hectares, and the chart SHALL remount when that unit changes; the percent axis SHALL be labelled "% of land area". The value axis SHALL follow the data (not start at zero) and the subtitle SHALL say so. Its tick labels SHALL be unique, in the axis unit, with thousands separators and no compact suffix (never "K" or "M"), with enough decimals that adjacent ticks never print the same text, and the percent axis SHALL use one decimal and "%". The subtitle SHALL say that FAO reports at intervals of 5 to 10 years, that years in between are interpolated, and that forest includes plantations. Missing values SHALL be a gap in the chart and an em dash in the table. Selecting an entity or a measure SHALL NOT fetch or change the URL.

#### Scenario: Default view

- **WHEN** `/deforestation/` loads
- **THEN** the explorer shows World in hectares

#### Scenario: Toggle to percentage

- **WHEN** the user selects "% of land"
- **THEN** the chart and the table show the World share series in "% of land area"
- **AND** the live region announces the new measure and no network request is made

#### Scenario: Small country uses thousand hectares

- **GIVEN** the user selects a country whose forest area is always below 1 million hectares
- **WHEN** the hectares measure is shown
- **THEN** the axis is labelled in thousand hectares

#### Scenario: Subtitle states the caveats

- **WHEN** the explorer is rendered
- **THEN** its subtitle contains the interpolation statement, the plantations statement and the statement that the axis does not start at zero

#### Scenario: Table follows the toggle

- **WHEN** the table disclosure is opened under each measure
- **THEN** its column header names the unit shown (thousand hectares or % of land area) and its rows are newest first

### Requirement: World map of the change in forest area

The change card SHALL show a `ChoroplethMap` of each country's percentage change in forest area between the payload's `startYear` and `endYear`, with the ramp `divergent`: seven fixed classes centred on 0 (below -50, -50 to -25, -25 to -5, -5 to +5, +5 to +25, +25 to +50 and +50 or more, in percent). The map SHALL show countries only (no World, regions or income groups), colour only through design-system tokens, have no year slider, and keep the interactions of the other maps (zoom, drag, reset, selection shared with the ranking). A country without a percentage SHALL be no-data and inert. The legend SHALL be the HTML `MapLegend` naming every class with its signed range and "No data". The tooltip SHALL show the country, the signed percentage and the signed net change in hectares. The map title SHALL be "Change in forest area since {startYear}", never a "deforestation" label. Signed values SHALL use the real minus sign (U+2212) and an explicit plus.

#### Scenario: Loss and gain colours

- **GIVEN** Brazil has -21.4% and China has +45%
- **WHEN** the map is rendered
- **THEN** Brazil is drawn in the loss class "-25 to -5" and China in the gain class "+25 to +50", from different arms of the palette

#### Scenario: No-data country

- **GIVEN** a country with 0 ha in the first year
- **WHEN** the map is rendered
- **THEN** it is drawn with the no-data fill, has no hover, tooltip or selection, and the legend lists "No data"

#### Scenario: Aggregates are absent

- **WHEN** the map data is built
- **THEN** it has no item for World or for any OWID region code

#### Scenario: Tooltip

- **WHEN** the pointer rests on Brazil
- **THEN** the tooltip shows its name, a signed percentage and a signed net change in hectares

#### Scenario: Legend is accessible

- **WHEN** the legend is rendered
- **THEN** every class is named in text with its signed range and the legend is not conveyed by colour alone

#### Scenario: Map frame

- **WHEN** the map box is measured at 360 px and at desktop width
- **THEN** it has the map's own aspect ratio and no horizontal overflow

### Requirement: Ranking table of net change

Under the map, collapsed under "View data table", the card SHALL contain a ranking table of every country (World, regions and aggregates excluded) with columns `#`, Country (flag, name, a toggle button with `aria-pressed` sharing the map selection), "Net change (thousand ha)" and "Change (% of {startYear})". Each of the two value columns SHALL be a sort button (the active one reverses the order, another sorts by itself; `aria-sort` on the active header). The default order SHALL be net change in hectares, most loss first. The hectares column SHALL rank every country with a hectares change; the percentage column SHALL show the percentage for every country that has one but SHALL rank by percentage only countries whose first-year forest area is at least 1,000,000 hectares. When sorted by percentage, ranked rows SHALL come first in the chosen direction and every other row SHALL follow, in name order, whatever the direction, with an em dash in the `#` column. Ranks SHALL be competition ranks by the sort measure and SHALL NOT change with the direction. A country without a percentage SHALL show an em dash in that cell. A note under the table SHALL state the threshold and the number of countries listed after the ranked ones, derived from the data. Values SHALL be signed with U+2212 and an explicit plus.

#### Scenario: Default sort

- **WHEN** the table is opened
- **THEN** the first row is the country with the largest net loss in hectares and its `#` is 1
- **AND** the net change column header has `aria-sort="ascending"`

#### Scenario: Sorting by percentage ranks only eligible countries

- **GIVEN** Nauru has 0 ha in the first year, Ireland has 0.4 million ha and Burkina Faso has more than 1 million ha with -61%
- **WHEN** the user sorts by "Change (% of 1990)"
- **THEN** Burkina Faso is ranked before every country with a smaller loss that is also eligible
- **AND** Ireland and Nauru appear after all ranked rows, in name order, with an em dash in `#`
- **AND** Nauru's percentage cell shows an em dash and Ireland's shows its percentage

#### Scenario: Reversing the percentage sort

- **WHEN** the user activates the percentage header again
- **THEN** the largest gains come first and the unranked rows still follow the ranked ones

#### Scenario: Threshold note

- **WHEN** the table is rendered
- **THEN** a note says percentage change is ranked only for countries with at least 1 million hectares of forest in the first year and names how many countries follow the ranked ones

#### Scenario: Selection is shared with the map

- **WHEN** the user activates the country button of a row
- **THEN** the same country is selected on the map and the row is highlighted and scrolled into view inside the scroll region

#### Scenario: Keyboard and semantics

- **WHEN** the table is operated with the keyboard
- **THEN** the scroll region is focusable, every sort and country control is reachable and has a name, and the table has a caption or accessible name

#### Scenario: Aggregates are excluded

- **WHEN** the ranking rows are built
- **THEN** no row has the code `OWID_WRL` or another OWID aggregate code

### Requirement: Tree cover loss by cause

The cause card SHALL be titled "Tree cover loss by cause" and contain a `CountryExplorer` of its own (World by default; independent of the forest explorer) with a stacked bar chart of tree cover loss per year from the payload's `startYear` (2001) to `endYear`, one series per driver in the payload's order, all seven drivers as published, the semantic `treeCoverLoss` palette (existing tokens only, in that fixed order, no cause green and Wildfire red), a wrapped legend naming every driver, a tooltip that lists the year, each driver with a value and the total, and an axis in million hectares starting at zero. The chart SHALL be below the fold (`RenderWhenVisible`). The subtitle SHALL read "Tree cover loss detected by satellite each year, by dominant cause, in million hectares. It is not the same as deforestation: loss from fires and logging is often followed by regrowth." A note under the chart SHALL say that each cause is the dominant one for a patch of about 1 km, so the split is approximate, and that detection methods improved between 2011 and 2015, which may make recent years look higher than earlier ones. A `YearDataTable` SHALL list the selected entity's years newest first with one column per driver and a "Total" column in thousand hectares. A driver without a value SHALL be `null`: no bar segment, "No value" in the tooltip and an em dash in the table, never 0, and the total SHALL be the sum of the drivers that have a value and be absent only when none has. The table SHALL carry the note "A dash means the source lists no loss for that cause.". The text SHALL never call tree cover loss "deforestation" except to say it is not the same.

#### Scenario: Stacked bars for the default entity

- **WHEN** the card renders with World selected
- **THEN** the chart has seven bar series named as the payload's drivers, all stacked, with the year axis from 2001 to the latest year

#### Scenario: Colour follows the driver

- **WHEN** the user selects a country in which some drivers have no value
- **THEN** every driver keeps its palette slot and the legend still lists all seven

#### Scenario: Null is not zero

- **GIVEN** a country-year with `null` shifting cultivation
- **WHEN** the tooltip and the table are rendered for that year
- **THEN** the tooltip says "No value" for that driver and the table cell is an em dash
- **AND** the total equals the sum of the other drivers

#### Scenario: All drivers null

- **GIVEN** a year in which all seven drivers are `null`
- **WHEN** the table row is rendered
- **THEN** the total cell is an em dash

#### Scenario: Subtitle and note

- **WHEN** the card is rendered
- **THEN** it contains the subtitle and the approximation and detection-change note above, and the word "deforestation" appears only in the sentence "It is not the same as deforestation"

#### Scenario: Selecting a country

- **WHEN** the user selects another country
- **THEN** the chart and table follow it, a live region announces it, no request is made, and the forest area explorer is unchanged

#### Scenario: Chart is deferred

- **WHEN** the page loads
- **THEN** the cause chart's skeleton is served in the HTML at the chart's height and the chart mounts when it scrolls into view

### Requirement: Methodology note and attribution

The page SHALL end with a methodology note stating that forest area comes from the FAO Global Forest Resources Assessment 2025 as national reports of the net change in forest land use, with years between reports interpolated and plantations included; that tree cover loss comes from Global Forest Watch as loss of tree cover detected by satellite since 2001, including loss that later regrows; that the two measure different things and cannot be compared or added; and that some national changes partly reflect better inventories or revised definitions. Each provider-backed card SHALL end with `DataAttribution` (provider, license, last updated) and `OriginCredit`: the forest area card with FAO FRA 2025 (CC BY 4.0), the cause card with WRI and Google DeepMind and the credit "Tree cover loss by dominant driver" (CC BY 4.0). Our World in Data SHALL be credited as the republisher through `SourceAttribution`, with names, licenses and dates taken from the API.

#### Scenario: Methodology is present and static

- **GIVEN** the `treeCoverLoss` section is unavailable
- **WHEN** the page renders
- **THEN** the methodology note is still rendered

#### Scenario: Credits next to the data

- **WHEN** the page renders with both sections fresh
- **THEN** the forest area card shows the FAO origin credit and the cause card shows the GFW credit text "Tree cover loss by dominant driver" with the license link
- **AND** both show Our World in Data and its license

#### Scenario: No claim that the sources add up

- **WHEN** the page text is searched
- **THEN** no sentence adds, compares or combines the forest area change with tree cover loss

### Requirement: Each section degrades independently

Each section SHALL be rendered through `ProviderBackedContent` from its own `ProviderPageState` using the default freshness thresholds (silent up to 7 days, stale notice from 7 to 30 days, unavailable after 30 days or on a provider `502`). The stale notice for the `forestArea` state SHALL show once above the explorer; its unavailable state SHALL replace the explorer and the change card with one `DataUnavailable` under the "Forest area" heading. The stale notice and unavailable state of the `treeCoverLoss` state SHALL appear only in the cause card. The methodology note SHALL be unaffected by either state. A failure of our own BFF (not a provider `502`) SHALL still throw for the whole page.

#### Scenario: Tree cover loss unavailable

- **GIVEN** the `tree-cover-loss` endpoint answers `502` and `forest-area` answers `200`
- **WHEN** `/deforestation/` renders
- **THEN** the key figures, explorer, map and ranking render normally
- **AND** the cause card shows the unavailable state under its heading with no chart

#### Scenario: Forest area unavailable

- **GIVEN** the `forest-area` endpoint answers `502` and `tree-cover-loss` answers `200`
- **WHEN** `/deforestation/` renders
- **THEN** no key figures, explorer, map or ranking render, one unavailable state appears under "Forest area", and the cause card renders normally

#### Scenario: Stale forest area

- **GIVEN** the `forest-area` payload is stale and 10 days old
- **WHEN** the page renders
- **THEN** one stale notice appears above the explorer and the data is shown

#### Scenario: Both unavailable leaves no JSON-LD

- **GIVEN** both sections are unavailable
- **WHEN** the page renders
- **THEN** no `Dataset` JSON-LD is rendered

#### Scenario: Own BFF failure

- **GIVEN** the BFF is unreachable
- **WHEN** the page renders
- **THEN** the render throws as for other categories

### Requirement: Structured data

The page SHALL declare one schema.org `Dataset` in JSON-LD named "Forest area and tree cover loss by country", built from the sections present: temporal coverage from the earliest start year to the latest end year, one `variableMeasured` per present section (forest area, forest area share of land, tree cover loss by driver), and `isBasedOn` through `buildSourceWork` for each present origin. A section that is unavailable SHALL contribute nothing.

#### Scenario: Both sections present

- **WHEN** the page renders with both sections
- **THEN** one `Dataset` block lists coverage 1990 to the latest year, three measured variables and the FAO and WRI sources

#### Scenario: One section present

- **GIVEN** only the forest area section is present
- **WHEN** the page renders
- **THEN** the JSON-LD has no tree cover loss variable or source

### Requirement: Accessibility

The page SHALL pass the axe audit in light and dark themes with the tables closed and open and a country selected. Every chart SHALL be paired with its collapsed data table, charts that can hold `null` SHALL set their own ARIA description, controls SHALL be at least 44 px, the map SHALL have an HTML legend and an accessible text equivalent (the ranking), focus indicators SHALL be visible, and colour SHALL NOT be the only carrier of loss versus gain (signed legend text, signed tooltip, signed table).

#### Scenario: Axe audit

- **WHEN** the axe E2E test runs on `/deforestation/` in each theme, including with the ranking table open
- **THEN** it reports no violations

#### Scenario: ARIA description handles nulls

- **WHEN** a chart option whose series contain `null` is built
- **THEN** its `aria.label.description` is set explicitly and never prints "NaN"

#### Scenario: Keyboard

- **WHEN** a user tabs through the page
- **THEN** the country comboboxes, measure toggle, map controls, sort buttons and table disclosures are reachable in a logical order

### Requirement: E2E coverage against the OWID fixtures

`apps/web/e2e/deforestation.spec.ts` SHALL run against the local OWID fixture server (three charts, three indicator metadata files, no network). It SHALL cover: the key figures sentence from the fixture World values; the explorer default and the measure toggle; the map and its legend; the ranking default order, sorting by percentage with the threshold behaviour and the note; the cause chart, the country selector and the null-versus-zero behaviour; the methodology note and attribution; the SEO and meta description; and no console errors. Tests whose result can differ by browser engine or viewport (rendering, layout and overflow at 360 px, keyboard and pointer interaction of the toggle, the map and the sort controls) SHALL be tagged `@smoke`; headers, SEO, metadata, provider-state and API checks SHALL NOT. `a11y.spec.ts` SHALL gain a deforestation audit like the ocean health one, and the tests that used `/deforestation/` as the placeholder category SHALL move to another placeholder.

#### Scenario: Smoke tagging

- **WHEN** the E2E suite lists its tests
- **THEN** the render, overflow, toggle, sort and map interaction tests of the page carry `@smoke` and the SEO, metadata and key figure text tests do not

#### Scenario: Placeholder tests moved

- **WHEN** the navigation and category page tests run
- **THEN** none relies on `/deforestation/` being a "coming soon" placeholder

#### Scenario: Fixtures are real captures

- **WHEN** the fixtures README is read
- **THEN** it lists the three CSVs and three indicator metadata files, the exact request URLs they were captured from and the capture date
