# Tasks: Water Footprint Phase 2

## Task Group 1 — Shared Types

### [x] 1.1 Create `packages/shared/src/lib/water-footprint.ts`

- Define `WaterFootprintCategory` union type (`'Food & Beverages' | 'Textiles' | 'Technology' | 'Manufactured'`).
- Define `waterFootprintCategorySlugMap` constant mapping URL-safe slugs to category labels.
- Define `WaterFootprintProduct` interface with fields: `product`, `category`, `waterFootprintLiters`, `unit`, `source`, `sourceUrl`, `methodology?`.
- Add JSDoc comments for the interface fields.

**Verification:** `npx nx build shared` compiles without errors.

### [x] 1.2 Update `packages/shared/src/index.ts`

- Add `export type { WaterFootprintProduct, WaterFootprintCategory } from './lib/water-footprint';`
- Add `export { waterFootprintCategorySlugMap } from './lib/water-footprint';`

**Verification:** `npx nx build shared` succeeds. Run `npx nx test shared` — all existing tests pass.

---

## Task Group 2 — Static Dataset

### [x] 2.1 Create `apps/api/src/data/water-footprint.json`

- Create the directory `apps/api/src/data/` if it doesn't exist.
- Write a JSON array of ~50 `WaterFootprintProduct` entries with the following category breakdown:
  - **Food & Beverages (~38):** Beef (beef herd), beef (dairy herd), lamb & mutton, pig meat, poultry meat, farmed fish, farmed prawns, eggs, milk, cheese, butter, wheat & rye, rice, maize, barley, oats, potatoes, cassava, peas, nuts, groundnuts, soybeans, soy milk, tofu, bananas, apples, citrus fruit, grapes, sugar (cane), sugar (beet), chocolate, coffee, tea, beer, wine, tomatoes, onions & leeks, root vegetables.
  - **Textiles (~6):** Cotton (lint), cotton t-shirt, pair of jeans, leather (bovine), pair of leather shoes, A4 sheet of paper.
  - **Technology (~3):** Microchip (2g), smartphone, laptop.
  - **Manufactured (~5):** Steel, cement, flat glass, PET plastic (virgin), compact car.
- Each entry must include: `product`, `category`, `waterFootprintLiters`, `unit`, `source`, `sourceUrl`, `methodology` (optional).
- All `sourceUrl` values must be valid, commercial-safe URLs from:
  - OWID grapher for food products
  - Water Footprint Network for textiles
  - Journal DOIs / Apple Environmental Reports for technology
  - Journal DOIs for manufactured materials
- The file must be valid JSON (parseable by `JSON.parse`).

**Verification:** Read and validate the file manually — check that `JSON.parse` succeeds, the array length is 48–52, and every entry has all required fields.

---

## Task Group 3 — NestJS API Module

### [x] 3.1 Create `apps/api/src/modules/water-footprint/water-footprint.service.ts`

- Inject using `@Injectable()`.
- In constructor: use `fs.readFileSync` and `JSON.parse` to load the JSON file.
  - File path: resolve relative to the compiled output (`path.join(__dirname, '../../data/water-footprint.json')` — this works because NestJS copies `src/data/` to the dist output).
  - Handle missing file: throw a descriptive error.
  - Handle invalid JSON: throw a descriptive error.
- Store the parsed array in a private readonly field.
- `getAllProducts()`: returns the full array (defensive copy with spread `[...this.products]` to prevent mutation).
- `getByCategory(slug: string)`: looks up slug in `waterFootprintCategorySlugMap`; if valid, filters products by category label; if invalid, throws `BadRequestException` with a message listing the valid slugs.

**Verification:** Unit test — see Task 4.1.

### [x] 3.2 Create `apps/api/src/modules/water-footprint/water-footprint.controller.ts`

- `@ApiTags('Water Footprint')`
- `@Controller('water-footprint')` (global prefix `/api/v1` is added by `main.ts`)
- `GET /products`:
  - `@ApiOperation({ summary: 'Get product water footprint data', description: '...' })`
  - `@ApiQuery({ name: 'category', required: false, description: '...', enum: ['food-beverages', 'textiles', 'technology', 'manufactured'] })`
  - `@ApiOkResponse({ description: '...' })`
  - `@ApiBadRequestResponse({ description: '...' })`
  - Method signature: `getProducts(@Query('category') category?: string): ApiResponse<WaterFootprintProduct[]>`
  - If `category` is provided:
    - Look it up in `waterFootprintCategorySlugMap` (imported from `@eco-metrics/shared`).
    - If valid: call `this.service.getByCategory(category)`.
    - If invalid: return `{ success: false, error: 'Invalid category filter. Valid values: food-beverages, textiles, technology, manufactured', status: 400 }`.
  - If `category` is omitted: call `this.service.getAllProducts()`.
  - Always wrap result: `{ success: true, data: products, status: 200 }`.

**Verification:** Unit test — see Task 4.2.

### [x] 3.3 Create `apps/api/src/modules/water-footprint/water-footprint.module.ts`

- `@Module({ controllers: [WaterFootprintController], providers: [WaterFootprintService] })`

**Verification:** Smoke test — see Task 4.3. `npx nx build api` compiles.

### [x] 3.4 Register module and Swagger tag

- **`apps/api/src/app/app.module.ts`:** Import `WaterFootprintModule` and add to `imports` array.
- **`apps/api/src/main.ts`:** Add `.addTag('Water Footprint', 'Product water footprint data')` to the Swagger `DocumentBuilder` chain.

**Verification:** `npx nx build api` compiles. Start the API and visit `/api/docs` — the "Water Footprint" section appears with the `/api/v1/water-footprint/products` endpoint.

---

## Task Group 4 — Tests

### [x] 4.1 Service unit test — `apps/api/__tests__/water-footprint/water-footprint.service.test.ts`

- Mock `fs.readFileSync` using `jest.mock('fs')`.
- Mock `path.join` to return a known path.
- **`getAllProducts()`:** Returns the full product array (defensive copy).
- **`getByCategory('food-beverages')`:** Returns only food products.
- **`getByCategory('textiles')`:** Returns only textile products.
- **`getByCategory('unknown-slug')`:** Returns empty array `[]`.
- **Missing file:** Mock `readFileSync` to throw `ENOENT` — verify service throws on construction.
- **Malformed JSON:** Mock `readFileSync` to return invalid JSON — verify service throws on construction.

**Verification:** `npx nx test api` passes with all new tests green.

### [x] 4.2 Controller unit test — `apps/api/__tests__/water-footprint/water-footprint.controller.test.ts`

- Use `Test.createTestingModule` with mocked `WaterFootprintService`.
- **No filter:** Mock `getAllProducts` returns 3 products — verify response `{ success: true, data: [...], status: 200 }`.
- **Valid filter `?category=food-beverages`:** Mock `getByCategory` returns 1 product — verify correct response.
- **Invalid filter `?category=invalid`:** Verify response `{ success: false, error: '...', status: 400 }`.
- **Empty results for valid filter:** Mock `getByCategory` returns `[]` — verify `{ success: true, data: [], status: 200 }`.

**Verification:** `npx nx test api` passes with all new tests green.

### [x] 4.3 Module smoke test — `apps/api/__tests__/water-footprint/water-footprint.module.test.ts`

- `Test.createTestingModule({ imports: [WaterFootprintModule] })` — verify `module` is defined.
- Ensure the module compiles successfully.

**Verification:** `npx nx test api` passes.

---

## Task Group 5 — Final Verification

### [x] 5.1 Full build

```bash
npx nx run-many --target=build --all
```

All three projects (`shared`, `api`, `web`) must build without errors.

### [x] 5.2 Full test suite

```bash
npx nx run-many --target=test --all
```

All existing tests pass. New tests pass. Coverage thresholds met.

### [x] 5.3 Lint

```bash
npm run lint
```

No lint errors.

### [x] 5.4 Manual API check

Start the API (`npx nx serve api`), hit `http://localhost:3001/api/v1/water-footprint/products` with curl or browser — verify 200 response with product data. Test `?category=food-beverages` — verify filtered results. Test `?category=invalid` — verify 400 error.
