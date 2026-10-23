import { type EcoCategory, ECO_CATEGORIES } from '@eco-metrics/shared';

/**
 * Category title mapping that mirrors the logic in
 * apps/web/src/lib/categoryTitle.ts.
 */
export const CATEGORY_TITLES: Record<EcoCategory, string> = {
  'air-quality': 'Air Quality',
  'co2-emissions': 'CO2 Emissions',
  deforestation: 'Deforestation',
  'endangered-species': 'Endangered Species',
  'glacier-melting': 'Glacier Melting',
  'global-temperature': 'Global Temperature',
  'ocean-health': 'Ocean Health',
  'plastic-pollution': 'Plastic Pollution',
  reforestation: 'Reforestation',
  'energy-sources': 'Energy Sources',
  'waste-recycling': 'Waste & Recycling',
  'water-footprint': 'Water Footprint',
};

export const CATEGORY_SLUGS: EcoCategory[] = Object.values(ECO_CATEGORIES);

export const homePage = {
  url: '/',
  title: 'eco-metrics earth | CO2, Climate, Energy & Water Data',
  description:
    'Explore environmental data on CO2 emissions, global temperature, energy sources and water footprint. Open sources, free to use, built in the open.',
};

export const waterFootprintPage = {
  title: 'Water Footprint of Food & Products',
  fullTitle: 'Water Footprint of Food & Products | eco-metrics earth',
  description:
    'Water footprint of food and products: how many liters of green, blue and grey water it takes to produce what we eat and use. Source-cited data.',
};

/** Per-category meta descriptions for a sample of placeholder categories. */
export const CATEGORY_DESCRIPTION_SAMPLES = {
  'air-quality':
    'Air quality data is coming soon: pollutant levels such as PM2.5 and ozone, and how clean the air is in cities around the world.',
  'co2-emissions':
    'CO2 emissions data is coming to eco-metrics earth: annual, per-capita and cumulative emissions by country, from open sources.',
} as const;

export function categoryPage(slug: EcoCategory) {
  const title = CATEGORY_TITLES[slug];
  return {
    url: `/${slug}/`,
    title:
      slug === 'water-footprint' ? waterFootprintPage.fullTitle : `${title} | eco-metrics earth`,
    heading: title,
    // The icon wrapper div does not carry a data-testid in the current source.
    // Use a structural selector inside #main-content instead of a testid.
    iconSelector: `#main-content svg[aria-hidden="true"]`,
  };
}
