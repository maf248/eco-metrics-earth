import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { EcoCategory } from '@eco-metrics/shared';

import { CATEGORY_SKELETONS } from './categorySkeletons';

/**
 * Whether a category has live data. Derived from `CATEGORY_SKELETONS`, which is client-safe
 * and kept equal to the server-only `CATEGORY_PAGES` registry by a test, so there is no
 * separate flag to maintain. A category that is not live is a "coming soon" placeholder.
 */
export function isLiveCategory(category: EcoCategory): boolean {
  return category in CATEGORY_SKELETONS;
}

/** The categories with live data, in navigation order. */
export const LIVE_CATEGORIES: readonly EcoCategory[] =
  Object.values(ECO_CATEGORIES).filter(isLiveCategory);

/** Longest summary a home card holds without growing past its neighbours. */
export const SUMMARY_MAX_LENGTH = 120;

/**
 * One short sentence per live category, shown on its home card. A test keeps the keys equal
 * to `LIVE_CATEGORIES`: shipping data for a category means adding its summary here.
 */
export const LIVE_CATEGORY_SUMMARIES: Partial<Record<EcoCategory, string>> = {
  [ECO_CATEGORIES.GLOBAL_TEMPERATURE]:
    'How far each year’s temperature is from the recent average, for every country since 1940.',
  [ECO_CATEGORIES.CO2_EMISSIONS]:
    'How much CO2 each country emits, in total and per person, on a world map and a ranking.',
  [ECO_CATEGORIES.ENERGY_SOURCES]:
    'Where each country’s electricity comes from: coal, gas, nuclear, hydro, wind, solar and more.',
  [ECO_CATEGORIES.WATER_FOOTPRINT]:
    'How much water it takes to make everyday products, from food and textiles to technology.',
};
