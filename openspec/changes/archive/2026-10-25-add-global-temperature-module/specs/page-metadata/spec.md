## MODIFIED Requirements

### Requirement: Category descriptions are unique and honest

`apps/web/src/lib/categoryMetadata.ts` SHALL export a `Record<EcoCategory, string>` of meta descriptions, so a missing `EcoCategory` fails type-checking. Every description SHALL be 110-160 characters, SHALL be unique across categories, and SHALL differ from the site description. The 9 placeholder categories SHALL state that the data is coming ("is coming soon" or "is coming to eco-metrics earth") and SHALL NOT promise data that is not yet available. The placeholder descriptions are:

| Category             | Description                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `air-quality`        | Air quality data is coming soon: pollutant levels such as PM2.5 and ozone, and how clean the air is in cities around the world.    |
| `waste-recycling`    | Waste and recycling data is coming to eco-metrics earth: how much waste countries produce and how much is recycled or composted.   |
| `endangered-species` | Endangered species data is coming soon: how many species are threatened with extinction and how that risk is changing over time.   |
| `deforestation`      | Deforestation data is coming to eco-metrics earth: how much forest is lost each year and where, from open sources.                 |
| `ocean-health`       | Ocean health data is coming soon: sea surface temperature, acidification and other signals of how the world's oceans are changing. |
| `reforestation`      | Reforestation data is coming to eco-metrics earth: how much forest is being restored or planted, and where it is happening.        |
| `glacier-melting`    | Glacier melting data is coming soon: how fast glaciers and ice sheets are losing mass, and what it means for sea level.            |
| `plastic-pollution`  | Plastic pollution data is coming to eco-metrics earth: how much plastic is produced, wasted and ends up in the ocean.              |
| `energy-sources`     | Energy sources data is coming soon: how much of the world's electricity comes from fossil fuels, nuclear and renewables.           |

The water-footprint description is defined by the `water-footprint-page` capability, the co2-emissions description by the `co2-emissions-page` capability and the global-temperature description by the `global-temperature-page` capability. When a category ships real data, its change SHALL replace the placeholder description with one that describes the live content.

#### Scenario: Length bounds

- **WHEN** the unit test iterates over every `EcoCategory`
- **THEN** each description is between 110 and 160 characters inclusive

#### Scenario: Uniqueness

- **WHEN** the unit test collects all category descriptions
- **THEN** the set has 12 distinct values
- **AND** none equals the shared site description

#### Scenario: Placeholder descriptions are honest

- **WHEN** the unit test reads the description of each of the 9 categories without live data
- **THEN** each contains "coming soon" or "coming to eco-metrics earth"

#### Scenario: Missing category fails type-checking

- **GIVEN** a new value is added to `ECO_CATEGORIES`
- **WHEN** `npx nx build web` runs without adding its description
- **THEN** type-checking fails
