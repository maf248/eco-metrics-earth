import { DataSourceOrigin, ECO_CATEGORIES, EcoCategory } from '@eco-metrics/shared';

export const CO2_EMISSIONS_CATEGORY: EcoCategory = ECO_CATEGORIES.CO2_EMISSIONS;

/** Annual territorial CO2 emissions (fossil fuels and industry), in tonnes. */
export const CO2_TOTAL_CHART = {
  slug: 'annual-co2-emissions-per-country',
  column: 'emissions_total',
  indicatorId: 1119906,
} as const;

/** The same measure per person, in tonnes per person. */
export const CO2_PER_CAPITA_CHART = {
  slug: 'co-emissions-per-capita',
  column: 'emissions_total_per_capita',
  indicatorId: 1119914,
} as const;

/** First year served; OWID has data back to 1750, which the page does not need. */
export const CO2_START_YEAR = 1950;

/** Totals are served in million tonnes, rounded to kilotonne precision. */
export const CO2_TOTAL_DECIMALS = 3;
export const TONNES_PER_MEGATONNE = 1_000_000;

/** Per-capita values are served in tonnes per person. */
export const CO2_PER_CAPITA_DECIMALS = 2;

export const CO2_UNITS = {
  total: 'Mt CO2',
  perCapita: 't CO2 per person',
} as const;

/**
 * The producer of the data OWID republishes. The single definition: the catalog
 * (`registerCategory`) and the payload (`data.origin`) both use it.
 */
export const CO2_ORIGIN: DataSourceOrigin = {
  producer: 'Global Carbon Project',
  title: 'Global Carbon Budget',
  url: 'https://globalcarbonbudget.org/',
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
};
