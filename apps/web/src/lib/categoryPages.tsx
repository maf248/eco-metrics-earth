import type { ComponentType } from 'react';

import { Co2EmissionsContent } from '@/components/co2-emissions/Co2EmissionsContent';
import { GlobalTemperatureContent } from '@/components/global-temperature/GlobalTemperatureContent';
import { WaterFootprintContent } from '@/components/water-footprint/WaterFootprintContent';
import { getCo2Emissions } from '@/lib/co2Emissions';
import { getGlobalTemperature } from '@/lib/globalTemperature';
import { getWaterFootprintProducts } from '@/lib/waterFootprint';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { EcoCategory } from '@eco-metrics/shared';

/** How a category with live data loads and renders its page content. */
export interface CategoryPageDefinition<T = unknown> {
  /** Server-side data fetch. Errors propagate: nothing is rendered or cached from a failure. */
  load: () => Promise<T>;
  /** Server component rendering the fetched data below the common header. */
  Content: ComponentType<{ data: T }>;
}

/**
 * Keeps each entry type-safe (`load` and `Content` must agree on `T`) while the
 * registry stores them uniformly. The single cast is sound because the page only
 * ever passes a definition's own `load()` result to its own `Content`.
 */
export function defineCategoryPage<T>(
  definition: CategoryPageDefinition<T>,
): CategoryPageDefinition {
  return definition as unknown as CategoryPageDefinition;
}

/**
 * Categories with live data. A category absent here renders the "coming soon"
 * placeholder and is pre-rendered at build time; adding an entry is all it takes
 * to move it to on-demand ISR.
 */
export const CATEGORY_PAGES: Partial<Record<EcoCategory, CategoryPageDefinition>> = {
  [ECO_CATEGORIES.WATER_FOOTPRINT]: defineCategoryPage({
    load: getWaterFootprintProducts,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <WaterFootprintContent products={data} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.CO2_EMISSIONS]: defineCategoryPage({
    load: getCo2Emissions,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <Co2EmissionsContent data={data} />
      </div>
    ),
  }),
  [ECO_CATEGORIES.GLOBAL_TEMPERATURE]: defineCategoryPage({
    load: getGlobalTemperature,
    Content: ({ data }) => (
      <div className="mt-8 w-full flex justify-center">
        <GlobalTemperatureContent data={data} />
      </div>
    ),
  }),
};
