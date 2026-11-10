import type { EcoCategory } from '@eco-metrics/shared';

import { getCategoryTitle } from './categoryTitle';

/**
 * Meta descriptions per category. Typed as a full record so adding a value to
 * `ECO_CATEGORIES` without its copy fails type-checking.
 *
 * Placeholder categories must say the data is coming and must not promise data
 * that is not there. When a category ships real data, its change replaces the
 * placeholder with copy describing the live content.
 */
export const CATEGORY_DESCRIPTIONS: Record<EcoCategory, string> = {
  'co2-emissions':
    'CO2 emissions by country since 1950: a world map and ranking of emissions per person, and yearly totals for every country. Data from Our World in Data.',
  'global-temperature':
    "Global temperature by country since 1940: how far each year's surface temperature is from the 1991–2020 average. Data from Our World in Data.",
  'air-quality':
    'Air quality data is coming soon: pollutant levels such as PM2.5 and ozone, and how clean the air is in cities around the world.',
  'waste-recycling':
    'Waste and recycling data is coming to eco-metrics earth: how much waste countries produce and how much is recycled or composted.',
  'endangered-species':
    'Endangered species data is coming soon: how many species are threatened with extinction and how that risk is changing over time.',
  deforestation:
    'Deforestation data is coming to eco-metrics earth: how much forest is lost each year and where, from open sources.',
  'ocean-health':
    "Ocean health data is coming soon: sea surface temperature, acidification and other signals of how the world's oceans are changing.",
  reforestation:
    'Reforestation data is coming to eco-metrics earth: how much forest is being restored or planted, and where it is happening.',
  'glacier-melting':
    'Glacier melting data is coming soon: how fast glaciers and ice sheets are losing mass, and what it means for sea level.',
  'plastic-pollution':
    'Plastic pollution data is coming to eco-metrics earth: how much plastic is produced, wasted and ends up in the ocean.',
  'energy-sources':
    'Electricity mix by country since 2000: coal, gas, oil, nuclear, hydro, wind, solar and bioenergy, as a share and in TWh. Data from Our World in Data.',
  'water-footprint':
    'Water footprint of food and products: how many liters of green, blue and grey water it takes to produce what we eat and use. Source-cited data.',
};

/**
 * Keyword-bearing page `<title>` overrides for the categories with live data.
 * Kept apart from `getCategoryTitle`, which also drives the `<h1>` and nav
 * labels and must stay short (e.g. `Water Footprint`).
 */
const METADATA_TITLE_OVERRIDES: Partial<Record<EcoCategory, string>> = {
  'co2-emissions': 'CO2 Emissions by Country',
  'global-temperature': 'Global Temperature Anomalies by Country',
  'energy-sources': 'Electricity Mix by Country',
  'water-footprint': 'Water Footprint of Food & Products',
};

export function getCategoryMetadataTitle(category: EcoCategory): string {
  return METADATA_TITLE_OVERRIDES[category] ?? getCategoryTitle(category);
}
