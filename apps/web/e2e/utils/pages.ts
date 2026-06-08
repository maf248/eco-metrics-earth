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
  title: 'eco-metrics earth',
  description: 'Track and visualize environmental metrics for a sustainable planet.',
};

export function categoryPage(slug: EcoCategory) {
  const title = CATEGORY_TITLES[slug];
  return {
    url: `/${slug}/`,
    title: `${title} — eco-metrics earth`,
    heading: title,
    // The icon wrapper div does not carry a data-testid in the current source.
    // Use a structural selector inside #main-content instead of a testid.
    iconSelector: `#main-content svg[aria-hidden="true"]`,
  };
}
