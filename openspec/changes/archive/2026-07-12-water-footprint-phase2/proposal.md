# Proposal: Water Footprint — Phase 2 (Dataset + BFF)

## Goals

- Compile a static, cited dataset of ~50 consumer products with water footprint data (liters per functional unit) covering four categories: Food & Beverages, Textiles, Technology, and Manufactured.
- Define shared TypeScript types (`WaterFootprintProduct`, `WaterFootprintCategory`) in `@eco-metrics/shared`.
- Create a NestJS BFF module (`WaterFootprintModule`) exposing `GET /api/v1/water-footprint/products` with an optional `?category=` query filter.
- Serve the static JSON dataset through the NestJS service layer (no database).
- Provide Swagger/OpenAPI documentation for the new endpoint.
- Write unit, integration, and smoke tests for the new module.

## Non-Goals

- **No frontend wiring** — the existing `/water-footprint/` page remains a placeholder; UI implementation is deferred to Phase 3.
- **No macro-level data** — country-level water stress and withdrawal endpoints (OWID, World Bank, AQUASTAT) are out of scope for this phase.
- **No database** — the dataset is a static JSON file read at runtime; no persistence layer.
- **No dynamic filtering beyond category** — search, sorting, and pagination are frontend concerns and will be handled in Phase 3.
- **No POST/PUT/DELETE** — the endpoint is read-only.
- **No product image assets** — the dataset contains only text data.

## Impact

| Area | Change |
|------|--------|
| `packages/shared` | New `WaterFootprintProduct` interface, `WaterFootprintCategory` union type, exported from `index.ts` |
| `apps/api/src/data/` | New `water-footprint.json` — static dataset of ~50 products |
| `apps/api/src/modules/water-footprint/` | New NestJS module: controller, service, module files |
| `apps/api/src/app/app.module.ts` | Import `WaterFootprintModule` |
| `apps/api/src/main.ts` | Add `'Water Footprint'` tag to Swagger builder |
| `apps/api/__tests__/` | New test files for service, controller, and module |

The change is purely additive — no existing files are modified except `app.module.ts` and `main.ts` (adding an import and a Swagger tag).
