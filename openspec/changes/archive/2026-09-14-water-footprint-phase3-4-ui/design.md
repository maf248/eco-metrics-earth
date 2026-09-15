# Design: Water Footprint Phase 3 + 4

## Technical Approach

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ apps/web — /water-footprint/ (route segment [category])        │
│                                                                │
│ [category]/page.tsx (Server Component)                         │
│   ├─ generateStaticParams → all 12 slugs (unchanged)           │
│   ├─ dynamicParams = false (unchanged)                         │
│   ├─ revalidate = 86400 (NEW — ISR for the segment)            │
│   ├─ generateMetadata (unchanged — title/canonical/OG)         │
│   │                                                            │
│   ├─ category === 'water-footprint' (NEW branch):              │
│   │    await getWaterFootprintProducts()  ← lib/water-footprint│
│   │    └─ <WaterFootprintContent products fetchFailed />       │
│   │         ├─ intro / error notice / empty state / footnote   │
│   │         └─ <WaterFootprintTable products />  ('use client')│
│   │              ├─ filter state (radio group)                 │
│   │              ├─ sort state (name | footprint, asc | desc)  │
│   │              ├─ aria-live status region                    │
│   │              ├─ <table> (hidden lg:block)                  │
│   │              └─ <ul> card list (lg:hidden)                 │
│   │                                                            │
│   └─ other 11 categories: placeholder (unchanged)              │
└──────────────────────┬─────────────────────────────────────────┘
                       │ fetch (server-side, ISR-cached, 5 s timeout)
                       ▼
┌────────────────────────────────────────────────────────────────┐
│ apps/api — BFF                                                 │
│ GET /api/v1/water-footprint/products → ApiResponse<            │
│   WaterFootprintProduct[]>  (52 products — contract unchanged) │
│ WaterFootprintService                                          │
│   join(__dirname, 'data/water-footprint.json')                 │
│   → src/modules/water-footprint/data/water-footprint.json      │
│     (MOVED from src/data/ — same file, new location)           │
└────────────────────────────────────────────────────────────────┘
```

### D1 — Integration into the `[category]` dynamic template

**Decision: conditional render inside `[category]/page.tsx`.**

The page already owns everything the route needs: `generateStaticParams` (all 12 slugs), `dynamicParams = false`, `generateMetadata`, and the shared header (icon + `<h1>`). The change adds one branch: when `category === ECO_CATEGORIES.WATER_FOOTPRINT`, the page awaits the fetch helper and renders `<WaterFootprintContent>` instead of the "coming soon" paragraph. The route remains **`/water-footprint/`** (trailing slash enforced by `trailingSlash: true` in `next.config.ts`).

**Rejected alternatives:**

- **Dedicated static route `app/water-footprint/page.tsx`** — Next.js resolves static segments before dynamic ones, but `[category]`'s `generateStaticParams` also generates `/water-footprint/`, producing a duplicate-path conflict at build time. Removing the slug from the dynamic params would fragment the category system: sitemap, nav, E2E (`CATEGORY_SLUGS` loops in `a11y.spec.ts`, `navigation.spec.ts`, `seo.spec.ts`) and unit tests all iterate `ECO_CATEGORIES` through the single template. Rejected — the conditional branch keeps one source of truth for all 12 categories.
- **Route groups / parallel routes** — massively over-engineered for a single category.

**Accepted trade-off:** `export const revalidate = 86400` applies to the whole `[category]` segment, so all 12 category pages become ISR pages. The 11 placeholder pages re-render byte-identically at most once per day on demand — harmless. Isolating ISR to water-footprint alone would require the dedicated-route approach rejected above.

### D2 — Server/client component boundary and state

| Component | Type | Responsibility |
|---|---|---|
| `[category]/page.tsx` | Server | Route config, metadata, conditional branch, **owns the data fetch** (awaits `getWaterFootprintProducts()` only for water-footprint) |
| `WaterFootprintContent` | Server (presentational) | Intro paragraph, `role="alert"` error notice, empty state, equivalents footnote; renders the client table. Pure props in → JSX out (trivially unit-testable) |
| `WaterFootprintTable` | `'use client'` | **All interactive state**: `useState` for the category filter (`'all' \| WaterFootprintCategory`) and the sort (`{ key: 'name' \| 'footprint'; direction: 'asc' \| 'desc' }`). Derived rows = filter → sort, computed purely on every render. No context, no effects, no URL state, no refetching |

**Why the fetch lives in the page, not in `WaterFootprintContent`:** data fetching belongs at the route level, next to the `revalidate` segment config that governs it; `WaterFootprintContent` stays a pure function of props (its unit tests need no mocks). This also mirrors the pattern P1.1+ will replicate for OWID-backed categories.

**ISR + client interactivity composition:** build/ISR renders complete HTML containing the full dataset (indexable, SEO-friendly — no client JS required to see the data). Hydration attaches the interactive controls; every subsequent filter/sort change is a pure client-side re-render with zero network traffic. The full 52-product array crosses the server→client boundary exactly once, as a prop.

**Sort semantics (deterministic, testable):**

- Initial state: **water footprint, descending** — the page's purpose is impact comparison; leading with the most water-intensive products is the most informative default.
- Activating an inactive column sorts **ascending**; activating the already-active column **flips** its direction.
- Products with `waterFootprintLiters === null` (Cassava) **always sort last**, regardless of direction.

### D3 — Data fetching and ISR

`apps/web/src/lib/water-footprint.ts`:

```ts
export interface WaterFootprintDataResult {
  products: WaterFootprintProduct[];
  fetchFailed: boolean;
}

export async function getWaterFootprintProducts(): Promise<WaterFootprintDataResult> {
  try {
    const response = await fetch(`${apiBaseUrl()}/water-footprint/products`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { products: [], fetchFailed: true };
    const payload: unknown = await response.json();
    if (!isWaterFootprintResponse(payload)) return { products: [], fetchFailed: true };
    return { products: payload.data, fetchFailed: false };
  } catch {
    return { products: [], fetchFailed: true };
  }
}
```

- **No category query** — the page fetches the full dataset once; filtering is a client concern.
- **`next: { revalidate: 86400 }`** on the fetch, aligned with the segment-level `export const revalidate = 86400` — page and data revalidate together, once a day (the dataset is static and versioned in the repo; daily revalidation only picks up BFF redeployments).
- **`AbortSignal.timeout(5000)`** — a hanging BFF must not hang a page render (build or revalidation).
- **Runtime shape guard** (`isWaterFootprintResponse`) — the JSON is parsed as `unknown` and narrowed (checks `success === true` and `Array.isArray(data)`) per the AGENTS.md "no `any`, prefer `unknown` + type guards" rule. A malformed or unexpected payload degrades to `fetchFailed` instead of crashing the render.
- **The helper never throws** — every failure mode resolves to `{ products: [], fetchFailed: true }`.

**Build-time resilience (CI):** `npm run build` in CI runs with no API listening on `:3001` — the fetch fails immediately (ECONNREFUSED), is caught, and the static page is generated with the fallback state. **The build stays green.** ISR revalidation re-executes the fetch after the TTL, so the page self-heals once the BFF is reachable. In production (Vercel), `API_BASE_URL` must be set to the Railway API URL in the project's environment variables — documented in `.env.example` and the README.

**Dev/E2E:** `next dev` re-executes the fetch per request; the deterministic Playwright webServer wrapper (`e2e/run-dev-servers.ts`) boots the API first (readiness-gated on `/api/v1/health`) and then the web server, so E2E always exercises real data.

### D4 — Error and empty states

| State | Condition | Rendering |
|---|---|---|
| Fetch failure | `fetchFailed === true` (network error, timeout, non-2xx, `success: false`, malformed JSON, wrong shape) | `<p role="alert">` "Water footprint data is temporarily unavailable. Please try again later." — the page keeps the `<h1>`, icon, and metadata and returns **200**. A thrown error would route to `error.tsx` and damage SEO — this is why the helper never throws |
| Empty dataset | `products.length === 0 && !fetchFailed` | "No water footprint data is currently available." |
| Empty filter result | client-side, filtered rows length 0 | "No products match the selected filter." (replaces both layouts; cannot happen with the current dataset but is future-proof) |
| Navigation | route transition | the existing `[category]/loading.tsx` skeleton applies — unchanged; no new Suspense boundary (I09 is out of scope) |

### D5 — Contextual equivalents

**Constants live in `apps/web/src/lib/waterFootprintEquivalents.ts` (web-local, NOT `@eco-metrics/shared`).** Rationale: they are presentation-only illustrative references for this UI, not a cross-app data contract; `shared` is reserved for API↔web contracts.

| Constant | Value | Basis |
|---|---|---|
| `SHOWER_LITERS` | `65` | typical 8-minute shower |
| `BATHTUB_LITERS` | `150` | standard full bathtub |

**`formatWaterFootprintEquivalents(liters: number | null): string`** — deterministic rules:

- `null` → `'—'`
- `liters < 65` → `'under 1 shower'`
- `65 ≤ liters < 150` → `≈ {n} shower(s)` where `n = liters / 65`
- `liters ≥ 150` → `≈ {n} showers · ≈ {m} bathtubs` where `n = liters / 65`, `m = liters / 150`
- Rounding: quotient ≥ 100 → integer; < 100 → one decimal. Singular noun when the value is exactly 1.

Examples (unit-tested): `65` → "≈ 1 shower" · `100` → "≈ 1.5 showers" · `150` → "≈ 2.3 showers · ≈ 1 bathtub" · `12,760` (smartphone) → "≈ 196 showers · ≈ 85.1 bathtubs" · `400,000` (compact car) → "≈ 6,154 showers · ≈ 2,667 bathtubs".

**`formatLiters(liters: number): string`** — `Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })`: `180.1` → "180.1", `1451.2` → "1,451.2", `400000` → "400,000".

**Data integrity:** a visible footnote under the table states the reference values and explicitly labels them as illustrative ("Equivalents are illustrative references: one average shower ≈ 65 L, one full bathtub ≈ 150 L. They are not part of the cited dataset.") — the constants must never be mistaken for sourced dataset values.

### D6 — Responsive layout: table on desktop, cards on mobile

Both structures render in the DOM; Tailwind toggles visibility — table wrapper `hidden lg:block`, card list `lg:hidden`:

- **≥ `lg`:** semantic `<table>` — `<caption className="sr-only">` ("Water footprint by product"), `<thead>` with `<th scope="col">`, product names as `<th scope="row">`. Columns: Product · Category · Water footprint (value + functional unit) · Contextual equivalent · Source.
- **< `lg`:** `<ul>` card list — each `<li>` card shows the product name (`<strong>`), category, footprint + unit, equivalent, and source link + methodology `<details>`. No headings inside cards (avoids 52 heading-outline entries and skipped-level issues).

**Why two structures instead of one restyled table:** applying `display: block` to table elements strips table semantics from the accessibility tree at mobile widths — the same semantic loss — while being fragile to style. A JS `matchMedia` switch adds hydration complexity and a layout flash. Two semantic structures double the DOM (~52 rows + 52 cards ≈ a few hundred nodes) — acceptable at this scale, and each breakpoint gets **correct** semantics. The shared controls (filter fieldset, live region) render once, above both structures.

### D7 — Accessibility design (first-class)

- **Filter — native radios:** `<fieldset>` + `<legend>` "Filter by category" containing five visually-styled `<input type="radio">` options (All — default checked, Food & Beverages, Textiles, Technology, Manufactured). Native radios give arrow-key navigation and screen-reader semantics for free — no custom widget code, no custom ARIA to get wrong. Tailwind `peer`/`peer-checked` styling on the labels indicates selection.
- **Sort — buttons in headers:** each sortable `<th scope="col">` contains a `<button type="button">` whose accessible name is the column label; the `<th>` carries `aria-sort` (`"ascending" | "descending" | "none"`). Non-sortable columns never set `aria-sort`.
- **Announcements:** a `role="status"` + `aria-live="polite"` region above the layouts. Its text updates on every filter/sort change, e.g. "Showing 6 of 52 products — Textiles, sorted by water footprint (high to low)".
- **Keyboard:** every control is a natively focusable element (radio, button, details, link) reachable by Tab; focus is preserved across re-renders (React keeps the DOM nodes stable — no focus trapping, no autofocus jumps). The table is a plain data table, not a grid widget, so no roving tabindex is needed.
- **Attribution:** source name as an external link (`target="_blank"` + `rel="noopener noreferrer"`); methodology in a native `<details><summary>` — a visible, keyboard-accessible disclosure in both layouts.
- **axe gate:** the existing `e2e/a11y.spec.ts` loop already audits `/water-footprint/` — the new UI must keep **zero critical and serious violations** with no code changes to that spec.

### D8 — Dataset relocation: exact mechanics

**Current state (the bug being fixed):** the service resolves `join(__dirname, 'data/water-footprint.json')`.

- **ts-jest:** `__dirname` = `apps/api/src/modules/water-footprint` → looks for `src/modules/water-footprint/data/water-footprint.json` (does not exist today → ENOENT → empty dataset + warn → `app.module.test.ts` and `water-footprint.module.test.ts` work around it with `fs` mocks).
- **webpack bundle:** all modules collapse into `dist/main.js`, so `__dirname` = `apps/api/dist` → finds `dist/data/water-footprint.json` (copied there by `assets: ['./src/assets', './src/data']`).

**The move:** `git mv apps/api/src/data/water-footprint.json apps/api/src/modules/water-footprint/data/water-footprint.json`, then delete the now-empty `src/data/` directory. **The service source needs no change** — the relative path becomes correct in the ts-jest context and stays correct in the webpack context (as long as the file is copied to `dist/data/`).

**The webpack `assets` fix — the critical detail:** `normalizeAssets` in `@nx/webpack` maps a *string* asset to `{ input, output: relative(sourceRoot, input) }`. For `'./src/data'` (a directory) that computes `output: 'data'` → `dist/data/` ✓. But the naive string replacement `'./src/modules/water-footprint/data'` would compute `output: 'modules/water-footprint/data'` → `dist/modules/water-footprint/data/` ✗ — the bundle would not find it at `join(dist, 'data/water-footprint.json')`. The replacement must use the **explicit object form** (verified against `@nx/webpack`'s `AssetGlobPattern` type — object assets resolve `input` relative to the project root and honor `output` verbatim):

```js
assets: [
  './src/assets',
  { input: './src/modules/water-footprint/data', output: 'data', glob: '**/*' },
],
```

**Validation in both contexts:**

- **ts-jest:** `nx test api` — `app.module.test.ts` and `water-footprint.module.test.ts` compile the module with the real file system and must load the 52 products with **no `fs` mocks**. The module smoke test asserts `getAllProducts()` length 52, proving the real path resolves.
- **webpack:** `nx build api` → `apps/api/dist/data/water-footprint.json` exists and `find apps/api/dist -name 'water-footprint.json'` yields exactly one hit; `nx serve api` → `GET /api/v1/water-footprint/products` returns 52 products.

**Test hygiene:** remove the `jest.mock('fs', ...)` blocks from `app.module.test.ts` and `water-footprint.module.test.ts`. **Keep** the `fs` mock in `water-footprint.service.test.ts` — it is the only coverage for the ENOENT (warn + empty dataset), EACCES (throw), and malformed-JSON (throw) branches, which cannot be exercised with the real file.

### D9 — Test strategy

| Layer | File | Approach |
|---|---|---|
| web unit — lib | `__tests__/lib/apiBaseUrl.test.ts` | env set / unset / trailing slash (mirrors `siteUrl.test.ts`) |
| web unit — lib | `__tests__/lib/water-footprint.test.ts` | mocked `global.fetch` (no network): success → products; `success: false` / non-2xx / throw / malformed JSON / wrong shape → `fetchFailed` |
| web unit — lib | `__tests__/lib/waterFootprintEquivalents.test.ts` | every formatting branch + boundaries (null, 64, 65, 100, 150, 12,760, 400,000) + `formatLiters` |
| web unit — component | `__tests__/components/water-footprint/WaterFootprintContent.test.tsx` | prop-driven: `fetchFailed` notice (`role="alert"`), empty state, data render + footnote — no mocks needed |
| web unit — component | `__tests__/components/water-footprint/WaterFootprintTable.test.tsx` | fixtures (no network): default sort (footprint desc), null-last, filter radios (each category + All), sort activation/flip, `aria-sort` values, live-region text, empty-filter message, table semantics (`scope`, caption), card list presence, snapshot. jsdom cannot evaluate CSS media queries → both structures are asserted present in the DOM; **breakpoint visibility is E2E's job** |
| web unit — page | `__tests__/app/[category]/page.test.tsx` (modified) | mock `@/lib/water-footprint`; water-footprint renders product data; other categories keep the placeholder (existing tests must stay green unchanged); `revalidate === 86400` |
| api unit | `app.module.test.ts`, `water-footprint.module.test.ts` (modified) | `fs` mocks removed; module test asserts the real 52-product dataset loads |
| E2E | `e2e/water-footprint.spec.ts` (new) | via the deterministic webServer wrapper (boots API + web): server-rendered HTML contains product data (raw `request.get`, no JS — proves indexability), 52 body rows, Textiles filter → 6 rows, sort interaction + `aria-sort` flip, live-region announcement, attribution link + methodology disclosure, mobile viewport → card list / desktop → table, canonical + title metadata. Core render test tagged `@smoke` (runs on all 5 browser projects); interaction tests untagged (chromium-desktop only, deterministic) |
| E2E a11y | existing `a11y.spec.ts` | already loops `/water-footprint/` — the axe gate covers the new UI automatically, no changes |

**Where a11y assertions live:** (1) unit — semantic structure via Testing Library roles/attributes (`table`, `columnheader`, `rowheader`, `scope`, `aria-sort`, `radio`, `status`); (2) E2E — keyboard interaction (radio `check()`, button click) and live-region content; (3) E2E axe — the automated zero-critical/serious audit over the fully rendered page.

**Coverage:** web thresholds (80 % statements/functions/lines, 75 % branches) must stay green — the table component's branch matrix (filter × sort × null × empty × two layouts) is the main coverage surface. Test output must show zero errors and zero warnings (AGENTS.md rule).

### File structure

```
apps/api/src/modules/water-footprint/
  └── data/
      └── water-footprint.json          (MOVED from apps/api/src/data/)

apps/web/src/lib/
  ├── apiBaseUrl.ts                     (NEW)
  ├── water-footprint.ts                (NEW)
  └── waterFootprintEquivalents.ts      (NEW)

apps/web/src/components/water-footprint/
  ├── WaterFootprintContent.tsx         (NEW — server)
  └── WaterFootprintTable.tsx           (NEW — client)

apps/web/src/app/[category]/
  └── page.tsx                          (MODIFIED — branch + revalidate)

apps/web/__tests__/…                    (mirrors src/ — 5 new files + 1 modified)
apps/web/e2e/water-footprint.spec.ts    (NEW)
```

## State Management

- **Server:** no state — data is fetched once per ISR cycle (build or background revalidation) and passed down as immutable props. `WaterFootprintDataResult` is a plain interface co-located with its fetch helper.
- **Client:** two `useState` hooks in `WaterFootprintTable` (filter, sort). Derived rows are recomputed purely on each render (filter → sort). No global state, no context, no effects, no URL sync — the repo has no state library and this component does not need one (AGENTS.md: React built-ins until complexity demands more).

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| BFF unreachable during `next build` (CI has no API service) | Fetch wrapped in try/catch → fallback state baked into the static page; build stays green; ISR self-heals after the TTL |
| `API_BASE_URL` unset in Vercel → production defaults to localhost | Documented in `apps/web/.env.example` + README env table with an explicit "set to the Railway URL in production" note |
| String-form webpack asset silently copies to the wrong nested path (`dist/modules/water-footprint/data/`) | Explicit object form with `output: 'data'` + build validation: `dist/data/water-footprint.json` exists and is the only copy in `dist/` |
| Doubled DOM (table + cards) hurts performance | 52 rows ≈ a few hundred nodes — negligible; pagination/virtualization is a non-goal, revisit if the dataset grows |
| Custom ARIA widgets introduce axe violations | Native elements only (radio, button, details, link) — no custom widget roles |
| E2E brittleness against future dataset edits | Assert total 52 + spot-check Textiles = 6 — the dataset is versioned in-repo, so counts are part of the contract; a dataset change is a deliberate commit that updates the tests |
| Removing `fs` masks hides a path regression in api tests | The module smoke test asserts `getAllProducts()` length 52 against the real file system — a wrong path fails loudly instead of silently returning `[]` |
