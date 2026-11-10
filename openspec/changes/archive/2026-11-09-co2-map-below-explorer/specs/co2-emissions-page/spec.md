## MODIFIED Requirements

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
