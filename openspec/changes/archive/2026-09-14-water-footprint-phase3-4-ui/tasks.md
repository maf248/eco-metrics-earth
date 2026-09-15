# Tasks: Water Footprint Phase 3 + 4

> All code, tests, and test descriptions in English. Jest tests use `it()`, Playwright E2E uses `test()`. Tests must produce zero errors and zero warnings. No commit/push tasks — the workflow stops at the mandatory user-approval checkpoint (AGENTS.md SDD step 5).

---

## Task Group 1 — API: dataset relocation and build config (D1 cleanup)

### [x] 1.1 Move the dataset into the module folder

- `git mv apps/api/src/data/water-footprint.json apps/api/src/modules/water-footprint/data/water-footprint.json` (the `data/` subfolder is created by the move).
- Remove the now-empty `apps/api/src/data/` directory.
- Do NOT modify the file content — pure relocation (52 products, identical bytes).

**Verification:** `git status` shows a rename; `apps/api/src/data` no longer exists; `apps/api/src/modules/water-footprint/data/water-footprint.json` does.

### [x] 1.2 Fix the webpack assets copy

In `apps/api/webpack.config.js`, replace the `assets` entry:

```js
// before
assets: ['./src/assets', './src/data'],
// after
assets: ['./src/assets', { input: './src/modules/water-footprint/data', output: 'data', glob: '**/*' }],
```

The object form is mandatory — the string form would copy to `dist/modules/water-footprint/data/` (see design.md D8). Touch nothing else in the config.

**Verification:** `npx nx build api` succeeds; `apps/api/dist/data/water-footprint.json` exists; `find apps/api/dist -name 'water-footprint.json'` yields exactly one result.

### [x] 1.3 Remove the fs mock from `apps/api/__tests__/app/app.module.test.ts`

- Delete the entire `jest.mock('fs', ...)` block.
- The test body stays as-is: `AppModule` must compile against the real dataset.

**Verification:** `npx nx test api` — the `AppModule` suite passes with no `fs` mock and no warnings.

### [x] 1.4 Remove the fs mock from `water-footprint.module.test.ts` and assert the real dataset

- Delete the `jest.mock('fs', ...)` block from `apps/api/__tests__/water-footprint/water-footprint.module.test.ts`.
- Extend the smoke test: resolve `WaterFootprintService` from the compiled module and assert `getAllProducts()` has length 52 — a future path regression must fail loudly, not silently serve `[]`.

**Verification:** `npx nx test api` — the module suite passes, loading the real 52 products from `src/modules/water-footprint/data/`.

### [x] 1.5 Confirm `water-footprint.service.test.ts` is untouched

- The `fs` mock in `apps/api/__tests__/water-footprint/water-footprint.service.test.ts` STAYS — it covers the ENOENT/EACCES/malformed-JSON construction branches that cannot be exercised with the real file.

**Verification:** `git diff` shows no changes to that file; its tests still pass.

### [x] 1.6 Runtime validation of the relocated dataset

- `npx nx serve api` (webpack context — validates the bundle finds `dist/data/water-footprint.json`).
- `curl http://localhost:3001/api/v1/water-footprint/products` → 200 with 52 products.
- `curl "http://localhost:3001/api/v1/water-footprint/products?category=textiles"` → 200 with 6 products.
- Stop the server afterwards.

**Verification:** Both responses return the expected counts; the service logs no "data file not found" warning.

---

## Task Group 2 — Web: data layer (env helper, fetch helper, equivalents)

### [x] 2.1 Create `apps/web/src/lib/apiBaseUrl.ts` + test

- `apiBaseUrl(): string` — reads `process.env.API_BASE_URL`, falls back to `'http://localhost:3001/api/v1'` when absent/empty, strips any trailing slash (mirror the `siteUrl.ts` pattern). Comment: server-side only (not `NEXT_PUBLIC_`).
- `apps/web/__tests__/lib/apiBaseUrl.test.ts` — mirror `siteUrl.test.ts`: set / unset / empty / trailing-slash, restoring `process.env` in `afterEach`.

**Verification:** `npx nx test web` — new suite green, zero warnings; `npx nx build web` compiles.

### [x] 2.2 Create `apps/web/src/lib/water-footprint.ts` + test

- Export `WaterFootprintDataResult` (`{ products: WaterFootprintProduct[]; fetchFailed: boolean }`).
- Export `getWaterFootprintProducts(): Promise<WaterFootprintDataResult>`:
  - `fetch(`${apiBaseUrl()}/water-footprint/products`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) })` — no category query.
  - `!response.ok` → `{ products: [], fetchFailed: true }`.
  - Parse as `unknown`, narrow with a runtime type guard (`success === true` + `Array.isArray(data)`) — no `any`.
  - Guard failure or any thrown error → `{ products: [], fetchFailed: true }`. The helper never throws.
- `apps/web/__tests__/lib/water-footprint.test.ts` — mock `global.fetch` (no network). Cases: healthy 200 + `success: true` → products; `success: false` → `fetchFailed`; non-2xx → `fetchFailed`; fetch rejects → `fetchFailed`; malformed JSON → `fetchFailed`; wrong shape (data not an array) → `fetchFailed`. Assert the request URL carries no query string.

**Verification:** `npx nx test web` — all fetch-helper cases green.

### [x] 2.3 Create `apps/web/src/lib/waterFootprintEquivalents.ts` + test

- Constants `SHOWER_LITERS = 65`, `BATHTUB_LITERS = 150` (exported, documented as illustrative references).
- `formatLiters(liters: number): string` — `Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })`.
- `formatWaterFootprintEquivalents(liters: number | null): string` — per the `water-footprint-table` spec: `null` → `'—'`; `< 65` → `'under 1 shower'`; `65 ≤ v < 150` → showers only; `≥ 150` → showers · bathtubs; quotient ≥ 100 → integer, < 100 → one decimal; singular noun at exactly 1.
- `apps/web/__tests__/lib/waterFootprintEquivalents.test.ts` — every branch + boundaries: null, 64, 65, 100, 150, 12760 → "≈ 196 showers · ≈ 85.1 bathtubs", 400000 → "≈ 6,154 showers · ≈ 2,667 bathtubs"; `formatLiters`: 180.1, 1451.2, 400000.

**Verification:** `npx nx test web` — equivalents suite green with exact-string assertions.

### [x] 2.4 Document `API_BASE_URL`

- `apps/web/.env.example`: add `API_BASE_URL=` with a comment explaining purpose, default (`http://localhost:3001/api/v1`), and the production instruction (point at the deployed API URL, e.g. the Railway service).
- `apps/web/README.md`: add the `API_BASE_URL` row to the Environment Variables table (the section where `NEXT_PUBLIC_SITE_URL` is listed).

**Verification:** Both files list the variable with default and production note; `npx prettier --check` passes on both.

---

## Task Group 3 — Web: components

### [x] 3.1 Create `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` (`'use client'`)

- Props: `products: WaterFootprintProduct[]`. State: filter (`'all' | WaterFootprintCategory`, default `'all'`) + sort (`{ key: 'name' | 'footprint'; direction: 'asc' | 'desc' }`, default footprint/desc). Derived rows = filter → sort (nulls always last), pure computation.
- Filter: `<fieldset>` + `<legend>` "Filter by category" + five native radios (All + the four categories from `waterFootprintCategorySlugMap`), sr-only inputs with Tailwind `peer`/`peer-checked` styled labels.
- Sort: `<button>` inside the Product and Water-footprint `<th scope="col">`; `aria-sort` on the active `<th>` only; inactive column → asc, active column → flip.
- Live region: `role="status"` + `aria-live="polite"` above the layouts — "Showing {n} of {total} products — {filter}, sorted by {sort description}".
- Layouts: `<table>` (sr-only caption "Water footprint by product", `scope="col"`/`scope="row"`, columns Product · Category · Water footprint · Contextual equivalent · Source) in a `hidden lg:block` wrapper; `<ul>` card list (`lg:hidden`) with `<strong>` product names.
- Footprint cell: `formatLiters` + "L" + functional unit; null → "No data". Equivalent cell: `formatWaterFootprintEquivalents`. Source cell: `source` as external link (`target="_blank"` + `rel="noopener noreferrer"`) + methodology in `<details><summary>Methodology</summary>`.
- Empty filter result → "No products match the selected filter." replacing both layouts.

**Verification:** Code review against the `water-footprint-table` spec; `npx nx build web` compiles.

### [x] 3.2 Create `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx`

- Fixtures (no network): 4–6 products covering multiple categories, a null-footprint product, and per-unit functional units.
- Tests: default render sorted by footprint desc; null sorts last + shows "No data"; each filter radio (incl. All restore); sort activation (Product → asc) and flip (footprint desc → asc); `aria-sort` values; live-region text after filter and sort changes; table semantics (`table`/`columnheader`/`rowheader` roles, `scope` attributes, caption); card list present in DOM with one `<li>` per product; empty-filter message; snapshot of the default render.
- Note: jsdom cannot evaluate CSS media queries — both structures are asserted present in the DOM; breakpoint visibility is E2E's job (Group 5).

**Verification:** `npx nx test web` — suite green, zero warnings, snapshot written; coverage for the new component contributes to keeping thresholds green.

### [x] 3.3 Create `apps/web/src/components/water-footprint/WaterFootprintContent.tsx` (server) + test

- Props: `products: WaterFootprintProduct[]`, `fetchFailed: boolean`. Renders: intro paragraph (replaces "coming soon" for this category), `role="alert"` notice when `fetchFailed`, "No water footprint data is currently available." when empty, otherwise `WaterFootprintTable` + the equivalents footnote ("Equivalents are illustrative references: one average shower ≈ 65 L, one full bathtub ≈ 150 L. They are not part of the cited dataset.").
- `apps/web/__tests__/components/water-footprint/WaterFootprintContent.test.tsx` — prop-driven, no mocks: fetchFailed → alert notice + no table; empty → empty message; data → product content + footnote.

**Verification:** `npx nx test web` — suite green.

---

## Task Group 4 — Page integration

### [x] 4.1 Modify `apps/web/src/app/[category]/page.tsx`

- Add `export const revalidate = 86400;` next to `export const dynamicParams = false;`.
- Add the conditional branch: when `category === ECO_CATEGORIES.WATER_FOOTPRINT`, `await getWaterFootprintProducts()` and render `<WaterFootprintContent products={...} fetchFailed={...} />` below the shared header (icon + `<h1>`); all other categories render the unchanged placeholder paragraph.
- `generateStaticParams`, `dynamicParams`, `generateMetadata`, and the header markup stay untouched.

**Verification:** `npx nx build web` compiles; the other 11 category pages render identically (their existing snapshots pass unchanged).

### [x] 4.2 Update `apps/web/__tests__/app/[category]/page.test.tsx`

- Add `jest.mock('@/lib/water-footprint')` returning fixture data (no network).
- New tests: water-footprint renders product content from the mocked helper; `revalidate` export equals `86400`; a non-water-footprint category still renders the "coming soon" placeholder.
- Do NOT modify existing tests/snapshots for the other categories — they must keep passing as-is (regression proof).

**Verification:** `npx nx test web` — full page suite green; existing snapshots untouched (`git status` shows no `.snap` changes for ocean-health/endangered-species).

---

## Task Group 5 — E2E

### [x] 5.1 Create `apps/web/e2e/water-footprint.spec.ts` — rendering, SSR content, SEO

Runs via the deterministic webServer wrapper (boots API on :3001 readiness-gated, then web on :3000). Tests (Playwright `test()`):

- `@smoke`-tagged core render (runs on all 5 browser projects): `/water-footprint/` returns 200, shows the "Water Footprint" `<h1>`, a known product (e.g. "Beef (beef herd)"), and the filter radios — viewport-agnostic so it passes on mobile projects too.
- Server-rendered content: `request.get('/water-footprint/')` HTML contains product names (no JavaScript — proves indexability).
- Metadata: `<title>` "Water Footprint — eco-metrics earth"; canonical link points to `/water-footprint/` with trailing slash.

**Verification:** `npx nx test web-e2e -- --grep "Water Footprint"` (or run the full suite in 5.4) — new tests green.

### [x] 5.2 Add interaction tests — filter, sort, live region, attribution

Untagged (chromium-desktop only, deterministic):

- Desktop table shows 52 body rows (`tbody tr`).
- Check the "Textiles" radio → 6 rows; live region (`role="status"`) announces "Showing 6 of 52".
- Click the "Water footprint" sort button → `aria-sort` flips to "ascending" and the first body row becomes the smallest non-null product (Cement).
- Source attribution: a "Poore & Nemecek" link is visible; activating a "Methodology" `<details>` reveals methodology text.

**Verification:** Interaction tests green on chromium-desktop.

### [x] 5.3 Add responsive layout tests

Untagged, explicit viewports:

- `page.setViewportSize({ width: 1280, height: 720 })` → table visible, card list hidden.
- `page.setViewportSize({ width: 375, height: 812 })` → card list visible, table hidden.

**Verification:** Both viewport tests green.

### [x] 5.4 Confirm the existing a11y axe gate covers the new UI

- No changes to `e2e/a11y.spec.ts` — its category loop already audits `/water-footprint/`.
- Run the full E2E suite and confirm zero critical/serious axe violations on the water-footprint page with the real 52-product table.

**Verification:** `npm run e2e` — full suite green (existing 49 specs + new water-footprint specs), zero axe violations.

---

## Task Group 6 — Documentation

### [x] 6.1 Update `docs/planning/water-footprint.md`

- Mark Phase 3 and Phase 4 as ✅ Complete (with date), checking off their checkboxes.
- Resolve the UX decisions table: Display format → "Data table on desktop, card list on mobile (Tailwind)"; Category filters → Accepted (radio group); Search / sort → "Sort by name/footprint accepted; free-text search and category sort dropped"; Water footprint unit → Accepted (liters + contextual equivalents, shower 65 L / bathtub 150 L).
- Update the status header line and "Last updated" date.

**Verification:** Read-through — no remaining "Pending" phase entries; table reflects the implemented decisions.

### [x] 6.2 Update `docs/data-sources/water-footprint.md`

- Update the dataset path reference (`apps/api/src/data/water-footprint.json` → `apps/api/src/modules/water-footprint/data/water-footprint.json`) and the Phase 3 pending note (line ~174).

**Verification:** `grep -r "src/data/water-footprint" docs/` returns no stale references.

### [x] 6.3 README env vars (if not already done in 2.4)

- Confirm `API_BASE_URL` is present in `apps/web/.env.example` and the Environment Variables table of `apps/web/README.md` (root README's env section is API-scoped — no change needed there).

**Verification:** Both entries present with default + production note.

---

## Task Group 7 — Final verification gates

### [x] 7.1 Lint

```bash
npm run lint
```

Zero errors, zero warnings.

### [x] 7.2 Build (all three projects)

```bash
npm run build
```

- All projects compile. Note: the web build stays green even with no API running (the fallback state is baked by design — see design.md D3). Optionally run `npx nx serve api` beforehand to bake real data into the static page.
- Confirm `apps/api/dist/data/water-footprint.json` exists after the api build.

### [x] 7.3 Unit tests (all three projects)

```bash
npm run test
```

- All suites green; coverage thresholds intact (web 80/80/80/75, shared 80, api 80 statements/functions/lines); zero console errors/warnings in test output.
- Confirm no `.snap` changes for pre-existing snapshots (only the new `WaterFootprintTable` snapshot is added).

### [x] 7.4 E2E

```bash
npm run e2e
```

- Full suite green via the deterministic webServer wrapper (boots both servers): existing 49 specs + the new water-footprint specs, 5 browser projects, zero axe violations.

### [x] 7.5 Close-out notes (completed at archive time — 14 Sep 2026)

- `ROADMAP.md`: when this change is archived via `/opsx:archive`, delete the D1 block and renumber the D-series (D2 → D1, D3 → D2) per the AGENTS.md continuous-sequence rule, updating every cross-reference (status table "Datos reales" row, Plan de Acción item 1, I04 note) and the "Última actualización" date.
- Update the project status table row "Datos reales" to reflect the first category with UI + data.

### [ ] 7.6 STOP — mandatory user-approval checkpoint

- Present the full summary to the user: green gates (lint + build + unit + E2E), reviewer verdict, and a `git status`/diff overview.
- **No commit and no push until the user explicitly approves** (AGENTS.md SDD step 5 — non-negotiable).
