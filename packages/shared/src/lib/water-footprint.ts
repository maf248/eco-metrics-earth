import type { DataSourcePublisher } from './data-sources';

/**
 * Supported water-footprint product categories.
 */
export type WaterFootprintCategory =
  | 'Food & Beverages'
  | 'Textiles'
  | 'Technology'
  | 'Manufactured'
  | 'Digital & Computing'
  | 'Vehicles'
  | 'Energy & Extractives';

/**
 * Measurement scope of a water-footprint value.
 *
 * A water footprint is meaningless without its scope: the same product can
 * differ by orders of magnitude between these bases. Values of different
 * water types are NOT directly comparable.
 *
 * - `blue` — surface and groundwater consumed (freshwater withdrawals only).
 * - `green-blue-grey` — total water footprint: rainwater (green) plus blue
 *   plus the water needed to dilute pollution to ambient standards (grey).
 * - `lifecycle-onsite` — life-cycle assessment counting direct water at the
 *   facility only (scope 1).
 * - `lifecycle-total` — life-cycle assessment counting on-site water plus the
 *   water embodied in inputs and in the electricity consumed (scope 1 + 2).
 */
export type WaterFootprintWaterType =
  'blue' | 'green-blue-grey' | 'lifecycle-onsite' | 'lifecycle-total';

/**
 * Human-readable labels for each water type, for display in the UI.
 */
export const waterFootprintWaterTypeLabels: Record<WaterFootprintWaterType, string> = {
  blue: 'Blue water',
  'green-blue-grey': 'Green + blue + grey',
  'lifecycle-onsite': 'Life cycle (on-site)',
  'lifecycle-total': 'Life cycle (total)',
};

/**
 * Maps URL-safe category slugs to their display labels.
 */
export const waterFootprintCategorySlugMap: Record<string, WaterFootprintCategory> = {
  'food-beverages': 'Food & Beverages',
  textiles: 'Textiles',
  technology: 'Technology',
  manufactured: 'Manufactured',
  'digital-computing': 'Digital & Computing',
  vehicles: 'Vehicles',
  'energy-extractives': 'Energy & Extractives',
};

/**
 * A single product water-footprint entry.
 */
export interface WaterFootprintProduct {
  /** Human-readable product name. */
  product: string;

  /** Product category. */
  category: WaterFootprintCategory;

  /**
   * Water footprint in liters for the declared functional unit.
   * `null` when the source reports zero or missing data.
   */
  waterFootprintLiters: number | null;

  /** Functional unit for the water footprint value (e.g. "per kg", "per unit"). */
  unit: string;

  /**
   * Measurement scope of `waterFootprintLiters`. Required: entries measured on
   * different bases must not be compared without declaring which basis applies.
   */
  waterType: WaterFootprintWaterType;

  /** Citation for the data source. */
  source: string;

  /** URL of the data source. */
  sourceUrl: string;

  /** Optional description of the methodology used to obtain the value. */
  methodology?: string;

  /** Licensor that republishes the data at `sourceUrl`, when there is one. */
  publisher?: DataSourcePublisher;
}
