# @eco-metrics/shared

Shared TypeScript types for the eco-metrics earth monorepo. Used by both `apps/web` and `apps/api`.

## Exports

### `ApiResponse<T>`

Generic wrapper for all BFF responses — a discriminated union on `success`.

```typescript
export type ApiResponse<T> =
  { success: true; data: T; status: number } | { success: false; error: string; status: number };
```

### `EcoCategory` / `ECO_CATEGORIES`

String union type and const map for the twelve ecological categories.

```typescript
const ECO_CATEGORIES = {
  WASTE_RECYCLING: 'waste-recycling',
  AIR_QUALITY: 'air-quality',
  ENDANGERED_SPECIES: 'endangered-species',
  GLOBAL_TEMPERATURE: 'global-temperature',
  DEFORESTATION: 'deforestation',
  OCEAN_HEALTH: 'ocean-health',
  CO2_EMISSIONS: 'co2-emissions',
  REFORESTATION: 'reforestation',
  GLACIER_MELTING: 'glacier-melting',
  PLASTIC_POLLUTION: 'plastic-pollution',
  ENERGY_SOURCES: 'energy-sources',
  WATER_FOOTPRINT: 'water-footprint',
} as const;

type EcoCategory = (typeof ECO_CATEGORIES)[keyof typeof ECO_CATEGORIES];
```

### `WaterFootprintCategory` / `WaterFootprintProduct` / `waterFootprintCategorySlugMap`

Types and slug map for the static water-footprint product dataset served by the API
(`GET /api/v1/water-footprint/products`). Dataset plan: `docs/planning/water-footprint.md`.

```typescript
type WaterFootprintCategory = 'Food & Beverages' | 'Textiles' | 'Technology' | 'Manufactured';

interface WaterFootprintProduct {
  product: string;
  category: WaterFootprintCategory;
  waterFootprintLiters: number | null; // null when the source reports zero or missing data
  unit: string; // functional unit (e.g. per kg, per unit)
  source: string;
  sourceUrl: string;
  methodology?: string;
}
```

## Usage

```typescript
import {
  ApiResponse,
  EcoCategory,
  ECO_CATEGORIES,
  WaterFootprintProduct,
} from '@eco-metrics/shared';
```

## Commands

```bash
npx nx build shared   # compile to dist/
npx nx test shared    # run unit tests
```

## TypeScript Config Notes

`tsconfig.lib.json` sets `emitDeclarationOnly: false` intentionally — this overrides the root `tsconfig.base.json` (`emitDeclarationOnly: true`) because the shared package emits full JS output to `dist/` when built as a standalone library. When consumed via the `@eco-metrics/shared` path alias (dev workflow), no compilation is needed.
