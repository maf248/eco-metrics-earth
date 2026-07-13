# Design: Water Footprint Phase 2

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  apps/web (Frontend)                                │
│  /water-footprint/ → placeholder (Phase 3 will      │
│  fetch GET /api/v1/water-footprint/products)        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP request
                       ▼
┌─────────────────────────────────────────────────────┐
│  apps/api (BFF - NestJS)                            │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ WaterFootprintController                      │  │
│  │ GET /water-footprint/products?category=...    │  │
│  │ Uses @eco-metrics/shared types + slug map     │  │
│  └─────────────────┬─────────────────────────────┘  │
│                    │ calls                          │
│  ┌─────────────────▼─────────────────────────────┐  │
│  │ WaterFootprintService                         │  │
│  │ - Read water-footprint.json at startup        │  │
│  │ - getAllProducts() → WaterFootprintProduct[]  │  │
│  │ - getByCategory(slug) → WaterFootprintProduct[]│  │
│  └─────────────────┬─────────────────────────────┘  │
│                    │ reads from disk                │
│  ┌─────────────────▼─────────────────────────────┐  │
│  │ apps/api/src/data/water-footprint.json        │  │
│  │ ~50 static product entries                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Data flow

1. **Startup:** `WaterFootprintService` constructor calls `fs.readFileSync` to load `water-footprint.json` into memory as a `WaterFootprintProduct[]`.
2. **Request:** Client sends `GET /api/v1/water-footprint/products?category=food-beverages`.
3. **Controller:** Extracts `category` query param, validates it against `waterFootprintCategorySlugMap`.
4. **Service:** If category is valid, calls `getByCategory(slug)` which filters the in-memory array. If omitted/invalid, returns all or throws a 400.
5. **Response:** Controller wraps the result in `ApiResponse<WaterFootprintProduct[]>`: `{ success: true, data: [...], status: 200 }`.

### Design decisions

| Decision | Rationale |
|----------|-----------|
| **Static JSON file, no DB** | Dataset is small (~50 entries), rarely updated, and does not need concurrency or querying beyond simple filtering. A JSON file read at startup is the simplest correct solution. |
| **Read at construction, not per-request** | Avoids I/O on every request. The file is read once and held in memory. This is appropriate for a static dataset that changes only on deploy. |
| **`waterFootprintCategorySlugMap` in shared** | Keeps the slug→category mapping in one place, shared between API and eventually the frontend. |
| **400 for invalid category slugs** | Explicit client error instead of silently ignoring the filter (which would be confusing — the user would get all results and not know their filter was wrong). |
| **`@eco-metrics/shared` for types + map** | Follows the existing pattern (types in shared package) and prevents duplication between API and future frontend work. |
| **No DTO class for query param** | A single `@Query('category')` string param is simple enough. The validation logic lives in the service (slug map lookup). No need for a class-validator DTO. |
| **Separate test file per concern** | `service.test.ts` mocks `fs`, `controller.test.ts` mocks the service, `module.test.ts` does a smoke test — follows the project convention of one test file per unit. |

### Category slug mapping

| Query param value     | Maps to category label  | Matches products with     |
|-----------------------|-------------------------|---------------------------|
| `food-beverages`      | `"Food & Beverages"`    | `category: "Food & Beverages"` |
| `textiles`            | `"Textiles"`            | `category: "Textiles"`    |
| `technology`          | `"Technology"`          | `category: "Technology"`  |
| `manufactured`        | `"Manufactured"`        | `category: "Manufactured"`|

Any other value → `400 Bad Request`.

### State Management

- The service holds the full product array in a private `readonly products: WaterFootprintProduct[]` field.
- The array is populated once at construction time and never mutated.
- No shared mutable state between requests.

### Error handling

- **Missing/malformed JSON file:** Thrown at construction time (`throw new Error(...)` with a descriptive message). NestJS will fail to bootstrap, which is the desired behavior — the app must not start with corrupted data.
- **Invalid category slug:** Controller-level validation, returns `400` via `ApiResponse` error shape (not an HTTP exception), consistent with the existing BFF pattern.
- **Empty results for valid slug:** Returns `200` with `data: []` — this is not an error condition.

### File structure

```
packages/shared/src/lib/
  └── water-footprint.ts              (NEW)

apps/api/src/
  ├── data/
  │   └── water-footprint.json        (NEW)
  └── modules/
      └── water-footprint/            (NEW)
          ├── water-footprint.module.ts
          ├── water-footprint.controller.ts
          └── water-footprint.service.ts

apps/api/__tests__/
  └── water-footprint/               (NEW)
      ├── water-footprint.service.test.ts
      ├── water-footprint.controller.test.ts
      └── water-footprint.module.test.ts
```

### Dataset compilation strategy

The JSON file uses a path relative to the `apps/api/src/data/` directory. At runtime, the NestJS build copies `src/data/` to the output. The service uses `path.join(__dirname, '../../data/water-footprint.json')` to locate the file (since `__dirname` points to the compiled JS output directory under `apps/api/dist`).

**Source data attribution per category:**

| Category | Primary source | Source URL pattern |
|----------|---------------|-------------------|
| Food & Beverages | Poore & Nemecek (2018), Science | `https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore` |
| Textiles | Mekonnen & Hoekstra (2011), HESS | `https://waterfootprint.org/en/resources/waterstat/` |
| Technology | Williams et al. (2002) + Apple Environmental Reports | Journal DOI / `https://www.apple.com/environment/` |
| Manufactured | Various LCA papers | Journal DOIs |

### Frontend note (out of scope)

Phase 3 will consume `GET /api/v1/water-footprint/products` and render the data in a filterable table. By placing the types and slug map in `@eco-metrics/shared`, the frontend can import them directly without redefining constants.

### Swagger tag registration

The tag `'Water Footprint'` is added to the Swagger builder in `main.ts` alongside existing tags (`'Health'`, `'Demo'`). This ensures the endpoint appears under its own section in the Swagger UI.
