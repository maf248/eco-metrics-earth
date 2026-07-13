# Spec: Water Footprint Shared Types

## ADDED

### `WaterFootprintCategory` type

```typescript
export type WaterFootprintCategory =
  | 'Food & Beverages'
  | 'Textiles'
  | 'Technology'
  | 'Manufactured';
```

A union of four literal strings representing the product categories.

### `waterFootprintCategorySlugMap` constant

```typescript
export const waterFootprintCategorySlugMap: Record<string, WaterFootprintCategory> = {
  'food-beverages': 'Food & Beverages',
  'textiles': 'Textiles',
  'technology': 'Technology',
  'manufactured': 'Manufactured',
};
```

Maps URL-safe query-param slugs to the human-readable category labels. Used by the API controller to translate `?category=food-beverages` into the `"Food & Beverages"` filter value.

### `WaterFootprintProduct` interface

```typescript
export interface WaterFootprintProduct {
  /** Product name in English (e.g. "Beef (beef herd)", "Cotton t-shirt") */
  product: string;
  /** Category the product belongs to */
  category: WaterFootprintCategory;
  /**
   * Liters of water consumed per functional unit.
   * `null` when the source reports zero or missing data.
   */
  waterFootprintLiters: number | null;
  /** Functional unit (e.g. "per kg", "per L", "per unit", "per pair") */
  unit: string;
  /** Citation for the data point */
  source: string;
  /** URL to the source (DOI, report page, or dataset) */
  sourceUrl: string;
  /** Brief note on how the number was derived (optional) */
  methodology?: string;
}
```

### Exports from `packages/shared/src/index.ts`

```typescript
export type { WaterFootprintProduct, WaterFootprintCategory } from './lib/water-footprint';
export { waterFootprintCategorySlugMap } from './lib/water-footprint';
```

## Behavior

**Given** a developer imports from `@eco-metrics/shared`  
**When** they reference `WaterFootprintProduct`, `WaterFootprintCategory`, or `waterFootprintCategorySlugMap`  
**Then** the types and constant are available with full type safety

**Given** the API controller receives a query parameter `category`  
**When** it looks up the value in `waterFootprintCategorySlugMap`  
**Then** a valid slug (e.g. `"food-beverages"`) returns its category label (`"Food & Beverages"`), and an invalid slug returns `undefined`

## File Changes

### ADDED: `packages/shared/src/lib/water-footprint.ts`
New file containing the `WaterFootprintCategory` type, `waterFootprintCategorySlugMap` constant, and `WaterFootprintProduct` interface.

### MODIFIED: `packages/shared/src/index.ts`
Add export lines for `WaterFootprintProduct`, `WaterFootprintCategory`, and `waterFootprintCategorySlugMap`.
