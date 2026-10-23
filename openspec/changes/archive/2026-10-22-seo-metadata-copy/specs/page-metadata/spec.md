## ADDED Requirements

### Requirement: Titles use a pipe separator

Every page title that is composed with the site name SHALL use `|` (space, vertical bar, space) as the separator. The root layout `title.template` SHALL be `%s | eco-metrics earth`. The em dash separator (`—`) SHALL NOT be used in any `<title>`.

#### Scenario: Layout template uses the pipe

- **WHEN** the root layout `metadata.title.template` is read
- **THEN** it is `%s | eco-metrics earth`

#### Scenario: Category page title uses the pipe

- **WHEN** `/air-quality/` is requested
- **THEN** `<title>` is `Air Quality | eco-metrics earth`

### Requirement: Single shared site description

The site description SHALL be defined once, as the string `Explore environmental data on CO2 emissions, global temperature, energy sources and water footprint. Open sources, free to use, built in the open.` (146 characters), exported from `apps/web/src/lib/socialMetadata.ts`. The root layout default `description`, the home page `description` and the social image tagline SHALL all use that constant.

#### Scenario: Layout default description

- **WHEN** the root layout `metadata.description` is read
- **THEN** it equals the shared site description

#### Scenario: Social image tagline is aligned

- **WHEN** the social image route renders
- **THEN** its tagline text equals the shared site description

### Requirement: Category descriptions are unique and honest

`apps/web/src/lib/categoryMetadata.ts` SHALL export a `Record<EcoCategory, string>` of meta descriptions, so a missing `EcoCategory` fails type-checking. Every description SHALL be 110-160 characters, SHALL be unique across categories, and SHALL differ from the site description. The 11 placeholder categories SHALL state that the data is coming ("is coming soon" or "is coming to eco-metrics earth") and SHALL NOT promise data that is not yet available. The placeholder descriptions are:

| Category             | Description                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `co2-emissions`      | CO2 emissions data is coming to eco-metrics earth: annual, per-capita and cumulative emissions by country, from open sources.      |
| `global-temperature` | Global temperature data is coming soon: how much the planet has warmed compared with the pre-industrial baseline.                  |
| `air-quality`        | Air quality data is coming soon: pollutant levels such as PM2.5 and ozone, and how clean the air is in cities around the world.    |
| `waste-recycling`    | Waste and recycling data is coming to eco-metrics earth: how much waste countries produce and how much is recycled or composted.   |
| `endangered-species` | Endangered species data is coming soon: how many species are threatened with extinction and how that risk is changing over time.   |
| `deforestation`      | Deforestation data is coming to eco-metrics earth: how much forest is lost each year and where, from open sources.                 |
| `ocean-health`       | Ocean health data is coming soon: sea surface temperature, acidification and other signals of how the world's oceans are changing. |
| `reforestation`      | Reforestation data is coming to eco-metrics earth: how much forest is being restored or planted, and where it is happening.        |
| `glacier-melting`    | Glacier melting data is coming soon: how fast glaciers and ice sheets are losing mass, and what it means for sea level.            |
| `plastic-pollution`  | Plastic pollution data is coming to eco-metrics earth: how much plastic is produced, wasted and ends up in the ocean.              |
| `energy-sources`     | Energy sources data is coming soon: how much of the world's electricity comes from fossil fuels, nuclear and renewables.           |

The water-footprint description is defined by the `water-footprint-page` capability. When a category ships real data, its change SHALL replace the placeholder description with one that describes the live content.

#### Scenario: Length bounds

- **WHEN** the unit test iterates over every `EcoCategory`
- **THEN** each description is between 110 and 160 characters inclusive

#### Scenario: Uniqueness

- **WHEN** the unit test collects all category descriptions
- **THEN** the set has 12 distinct values
- **AND** none equals the shared site description

#### Scenario: Placeholder descriptions are honest

- **WHEN** the unit test reads the description of each of the 11 non-water-footprint categories
- **THEN** each contains "coming soon" or "coming to eco-metrics earth"

#### Scenario: Missing category fails type-checking

- **GIVEN** a new value is added to `ECO_CATEGORIES`
- **WHEN** `npx nx build web` runs without adding its description
- **THEN** type-checking fails

## MODIFIED Requirements

### Requirement: Home page metadata

`apps/web/src/app/page.tsx` SHALL export a `metadata` object of type `Metadata` that includes:

- `title` set to `"eco-metrics earth | CO2, Climate, Energy & Water Data"` (53 characters, within 50-60), rendered as-is with no template suffix
- `description` set to the shared site description (110-160 characters)
- `alternates.canonical` set to `siteUrl() + "/"`
- `openGraph.title` matching the page `title`
- `openGraph.description` matching the page `description`
- `openGraph.url` set to `siteUrl() + "/"`
- `twitter.title` matching the page `title`
- `twitter.description` matching the page `description`

The Open Graph and Twitter objects SHALL be built with `buildOpenGraph` and `buildTwitter`.

#### Scenario: Home page has canonical URL

- **WHEN** Next.js renders the home page
- **THEN** `<link rel="canonical">` points to the site base URL with a trailing slash

#### Scenario: Home page has Open Graph title

- **WHEN** Next.js renders the home page
- **THEN** `<meta property="og:title">` is present and not empty

#### Scenario: Home title and description

- **WHEN** `/` is requested
- **THEN** `<title>` is `eco-metrics earth | CO2, Climate, Energy & Water Data`
- **AND** its length is between 50 and 60 characters
- **AND** `<meta name="description">` is the shared site description, 110-160 characters

#### Scenario: Home social metadata matches

- **WHEN** `/` is requested
- **THEN** `og:title` and `twitter:title` equal the `<title>`
- **AND** `og:description` and `twitter:description` equal the meta description

### Requirement: Category page metadata

`apps/web/src/app/[category]/page.tsx` SHALL extend its existing `generateMetadata` function to include:

- `title` set to the category name (via `getCategoryTitle`), except water-footprint (see `water-footprint-page`); the root layout template appends ` | eco-metrics earth`
- `description` set to the category's entry in the per-category description map (see "Category descriptions are unique and honest")
- `alternates.canonical` set to `siteUrl() + "/" + category + "/"`
- `openGraph.title` matching the resolved page title
- `openGraph.description` matching the resolved page description
- `openGraph.url` matching `alternates.canonical`
- `twitter.title` matching the resolved page title
- `twitter.description` matching the resolved page description

#### Scenario: Category page has canonical URL with trailing slash

- **WHEN** Next.js renders the `/air-quality/` category page
- **THEN** `<link rel="canonical">` points to `{siteUrl}/air-quality/`

#### Scenario: Category page Open Graph title matches page title

- **WHEN** Next.js renders any valid category page
- **THEN** `<meta property="og:title">` matches the page title passed to `generateMetadata` (the category name, or the water-footprint title)

#### Scenario: Unknown category has no metadata

- **WHEN** `generateMetadata` is called with a slug not in `ECO_CATEGORIES`
- **THEN** no `alternates.canonical`, `openGraph`, or `twitter` fields are returned (same behaviour as before this change for the invalid-slug case)

#### Scenario: Category description comes from the map

- **WHEN** `generateMetadata` is called for `air-quality`
- **THEN** `description` equals the `air-quality` entry of the description map
- **AND** `openGraph.description` and `twitter.description` equal it
