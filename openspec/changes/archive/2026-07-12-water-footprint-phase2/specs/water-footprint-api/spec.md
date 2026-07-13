# Spec: Water Footprint API Module

## ADDED

### NestJS Module

**`WaterFootprintModule`** — feature module registering the controller and service.

### Controller — `WaterFootprintController`

- **Route:** `GET /water-footprint/products`
- **Global prefix in effect:** `/api/v1` → full URL: `GET /api/v1/water-footprint/products`
- **Swagger tag:** `'Water Footprint'`
- **Query parameter:** `category` (optional, string)
  - Valid values: `"food-beverages"`, `"textiles"`, `"technology"`, `"manufactured"`
  - Maps to `WaterFootprintCategory` via `waterFootprintCategorySlugMap`
  - If omitted, returns all products unfiltered. If the slug is invalid, the service throws `BadRequestException` and the global exception filter returns `400 Bad Request` with an error message listing the valid slugs.

#### Response contract

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "product": "Beef (beef herd)",
      "category": "Food & Beverages",
      "waterFootprintLiters": 1451,
      "unit": "per kg",
      "source": "Poore & Nemecek (2018), Science",
      "sourceUrl": "https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore",
      "methodology": "Freshwater withdrawals per kg of final product. Based on ~38,700 farms in 119 countries."
    }
  ],
  "status": 200
}
```

**Error — invalid category slug (400):**
```json
{
  "success": false,
  "error": "Invalid category filter. Valid values: food-beverages, textiles, technology, manufactured",
  "status": 400
}
```

### Service — `WaterFootprintService`

- Reads `apps/api/src/data/water-footprint.json` at construction time (via `fs.readFileSync`).
- Exposes:
  - `getAllProducts(): WaterFootprintProduct[]` — returns the full array
  - `getByCategory(slug: string): WaterFootprintProduct[]` — filters by category slug (validated via `waterFootprintCategorySlugMap`), returns empty array for unknown slugs
- Parses and validates the loaded JSON — throws on startup if the file is missing or malformed.

### Dataset file — `apps/api/src/data/water-footprint.json`

Static JSON array of ~50 `WaterFootprintProduct` entries:

| Category | Count | Source |
|----------|-------|--------|
| Food & Beverages | ~38 | OWID Poore & Nemecek (2018), Science |
| Textiles | ~6 | Mekonnen & Hoekstra (2011), HESS |
| Technology | ~3 | Williams et al. (2002), Apple Environmental Reports |
| Manufactured | ~5 | Various LCA papers |

All entries include `source`, `sourceUrl`, and `methodology` (optional).

## Behavior

### GET /api/v1/water-footprint/products (no filter)

**Given** the dataset contains 50 products  
**When** a `GET` request is made to `/api/v1/water-footprint/products` with no query parameters  
**Then** the response is `200` with `success: true` and `data` containing all 50 products

### GET /api/v1/water-footprint/products?category=food-beverages

**Given** the dataset contains ~38 food products and ~14 non-food products  
**When** a `GET` request is made with `?category=food-beverages`  
**Then** the response is `200` with `success: true` and `data` containing only products with `category: "Food & Beverages"`

### GET /api/v1/water-footprint/products?category=invalid-category

**Given** any dataset  
**When** a `GET` request is made with `?category=invalid-category`  
**Then** the response is `400` with `success: false` and an error message listing the valid slugs

### GET /api/v1/water-footprint/products?category=textiles (empty result set)

**Given** a dataset where the "Textiles" filter matches zero products (edge case)  
**When** a `GET` request is made with `?category=textiles`  
**Then** the response is `200` with `success: true` and `data` as an empty array `[]`

### Service: missing data file

**Given** the file `apps/api/src/data/water-footprint.json` does not exist  
**When** the application bootstraps and the `WaterFootprintService` is instantiated  
**Then** the service throws an error at construction time, preventing the module from loading

### Service: malformed data file

**Given** the JSON file exists but is not valid JSON or is not an array  
**When** the `WaterFootprintService` is instantiated  
**Then** the service throws an error at construction time

## Swagger documentation

- Endpoint documented under the `'Water Footprint'` tag.
- `@ApiOperation` with summary and description.
- `@ApiQuery` documenting the `category` parameter with description, allowed values, and example.
- `@ApiOkResponse` describing the success schema.
- `@ApiBadRequestResponse` describing the error schema.

## File Changes

### ADDED: `apps/api/src/data/water-footprint.json`
~50 product entries as a JSON array.

### ADDED: `apps/api/src/modules/water-footprint/water-footprint.module.ts`
`WaterFootprintModule` — imports/registers controller and service.

### ADDED: `apps/api/src/modules/water-footprint/water-footprint.controller.ts`
`WaterFootprintController` — `GET /water-footprint/products` with optional `@Query('category')`.

### ADDED: `apps/api/src/modules/water-footprint/water-footprint.service.ts`
`WaterFootprintService` — reads JSON, exposes `getAllProducts()` and `getByCategory()`.

### MODIFIED: `apps/api/src/app/app.module.ts`
Import `WaterFootprintModule` in the `imports` array.

### MODIFIED: `apps/api/src/main.ts`
Add `'Water Footprint'` tag to the Swagger `DocumentBuilder`.

### ADDED: `apps/api/__tests__/water-footprint/water-footprint.service.test.ts`
Unit tests for the service — mock `fs.readFileSync`, verify filtering and error handling.

### ADDED: `apps/api/__tests__/water-footprint/water-footprint.controller.test.ts`
Unit tests for the controller — mock the service, verify response shape.

### ADDED: `apps/api/__tests__/water-footprint/water-footprint.module.test.ts`
Smoke test — verify the module compiles successfully.
