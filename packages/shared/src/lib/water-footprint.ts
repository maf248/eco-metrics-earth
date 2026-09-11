/**
 * Supported water-footprint product categories.
 */
export type WaterFootprintCategory =
  'Food & Beverages' | 'Textiles' | 'Technology' | 'Manufactured';

/**
 * Maps URL-safe category slugs to their display labels.
 */
export const waterFootprintCategorySlugMap: Record<string, WaterFootprintCategory> = {
  'food-beverages': 'Food & Beverages',
  textiles: 'Textiles',
  technology: 'Technology',
  manufactured: 'Manufactured',
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

  /** Citation for the data source. */
  source: string;

  /** URL of the data source. */
  sourceUrl: string;

  /** Optional description of the methodology used to obtain the value. */
  methodology?: string;
}
