## ADDED Requirements

### Requirement: World map of CO2 emissions per capita for a selected year

The CO2 page SHALL open its data region (after the introduction, before the key figures) with a card titled "CO2 emissions per capita, {year} (tonnes per person)" holding a year slider, a world choropleth map and a legend. Each country SHALL be filled by its per-capita value for the selected year in five classes (< 1, 1–3, 3–6, 6–10, ≥ 10 tonnes per person) of the sequential palette; World is not drawn. Regions without a value for that year (no entity, no per-capita value, or a region without an entity code) SHALL use the no-data fill and be inert: no hover emphasis, no tooltip, no selection. The tooltip of a country SHALL read "{name} · {year}", its per-capita value with the per-capita formatter and "t per person", and its total with the total formatter and "Mt total" ("Total: no data" when missing). The map SHALL support zoom and drag; on viewports 640 px and wider a vertical control group SHALL offer "Zoom in", "Zoom out" and "Reset view"; below 640 px only a "Reset view" button SHALL appear, once the view has moved, and disappear after resetting. The map SHALL show the whole world at zoom 1 in a box that keeps the map's aspect ratio. The legend SHALL be HTML, listing the five classes and "No data", each label under its swatch.

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

The map SHALL render in the browser only, through the lazy map entry, with a `map` skeleton of the same box in the server HTML and while the geometry loads; the skeleton draws the land outline of the map in the map's own frame (generated with the geometry). The line chart of the explorer, now below the first chart of the page, SHALL render when it scrolls into view. The CO2 entry in `CATEGORY_SKELETONS` SHALL be the introduction followed by a map block (title, slider, map box and legend), so a pending navigation shows the same shape.

#### Scenario: Server HTML

- **WHEN** the page HTML is requested
- **THEN** it contains the map card with its title, the slider, the map skeleton and the ranking table rows, and no map SVG

#### Scenario: Pending navigation

- **WHEN** a client navigation to the CO2 page is pending
- **THEN** the skeleton shows the introduction bars and the map block

## MODIFIED Requirements

### Requirement: SEO and metadata for the CO2 page

`generateMetadata` for `co2-emissions` SHALL use the keyword-bearing title "CO2 Emissions by Country" (rendered as "CO2 Emissions by Country | eco-metrics earth", 44 characters), the description "CO2 emissions by country since 1950: a world map and ranking of emissions per person, and yearly totals for every country. Data from Our World in Data." (151 characters, naming the map and ranking that open the page), the canonical URL `{siteUrl}/co2-emissions/` and matching Open Graph/Twitter tags. The `<h1>` SHALL remain "CO2 Emissions" (`co2-title-override`). The page SHALL carry the schema.org `Dataset` JSON-LD defined in "schema.org Dataset structured data for the CO2 page". The key figures, the page text, the world map card (title, slider, map skeleton, legend) with its collapsed ranking table for the default year, and the collapsed table of the default selection SHALL be in the server-rendered HTML.

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
