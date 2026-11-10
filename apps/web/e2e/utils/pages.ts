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

export const dataSourcesPage = {
  url: '/data-sources/',
  title: 'Data sources',
  fullTitle: 'Data sources | eco-metrics earth',
};

/** Per-category meta descriptions: a placeholder category and the live data pages. */
export const CATEGORY_DESCRIPTION_SAMPLES = {
  'air-quality':
    'Air quality data is coming soon: pollutant levels such as PM2.5 and ozone, and how clean the air is in cities around the world.',
  'co2-emissions':
    'CO2 emissions by country since 1950: a world map and ranking of emissions per person, and yearly totals for every country. Data from Our World in Data.',
  'global-temperature':
    "Global temperature by country since 1940: how far each year's surface temperature is from the 1991–2020 average. Data from Our World in Data.",
  'energy-sources':
    'Electricity mix by country since 2000: coal, gas, oil, nuclear, hydro, wind, solar and bioenergy, as a share and in TWh. Data from Our World in Data.',
} as const;

/**
 * Page `<title>` overrides of the live data categories, mirroring
 * `METADATA_TITLE_OVERRIDES` in apps/web/src/lib/categoryMetadata.ts.
 */
export const CATEGORY_METADATA_TITLES = {
  'co2-emissions': 'CO2 Emissions by Country',
  'global-temperature': 'Global Temperature Anomalies by Country',
  'energy-sources': 'Electricity Mix by Country',
  'water-footprint': waterFootprintPage.title,
} as const satisfies Partial<Record<EcoCategory, string>>;

function metadataTitle(slug: EcoCategory): string {
  const overrides: Partial<Record<EcoCategory, string>> = CATEGORY_METADATA_TITLES;
  return overrides[slug] ?? CATEGORY_TITLES[slug];
}

export function categoryPage(slug: EcoCategory) {
  const title = CATEGORY_TITLES[slug];
  return {
    url: `/${slug}/`,
    title: `${metadataTitle(slug)} | eco-metrics earth`,
    heading: title,
    // The icon wrapper div does not carry a data-testid in the current source.
    // Use a structural selector inside #main-content instead of a testid; the shadow class
    // tells the category icon apart from decorative SVGs in a page's content.
    iconSelector: `#main-content svg[aria-hidden="true"].drop-shadow-icon-lg`,
  };
}
