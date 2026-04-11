# @eco-metrics/shared

Shared TypeScript types for the eco-metrics earth monorepo. Used by both `apps/web` and `apps/api`.

## Exports

### `ApiResponse<T>`

Generic wrapper for all BFF responses.

```typescript
interface ApiResponse<T> {
  data: T;
  timestamp: string;
  error?: string;
}
```

### `EcoCategory` / `ECO_CATEGORIES`

String union type and const map for the six MVP ecological categories.

```typescript
const ECO_CATEGORIES = {
  AIR_QUALITY:          'air-quality',
  ENDANGERED_SPECIES:   'endangered-species',
  GLOBAL_TEMPERATURE:   'global-temperature',
  DEFORESTATION:        'deforestation',
  OCEAN_HEALTH:         'ocean-health',
  CO2_EMISSIONS:        'co2-emissions',
} as const;

type EcoCategory = (typeof ECO_CATEGORIES)[keyof typeof ECO_CATEGORIES];
```

## Usage

```typescript
import { ApiResponse, EcoCategory, ECO_CATEGORIES } from '@eco-metrics/shared';
```

## Commands

```bash
npx nx build shared   # compile to dist/
npx nx test shared    # run unit tests
```
