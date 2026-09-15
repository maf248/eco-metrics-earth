# Proposal: Water Footprint — Phase 3 + 4 (UI of the First Category with Real Data)

> Roadmap item **D1** (`ROADMAP.md`) · Plan: `docs/planning/water-footprint.md` (Phases 3 + 4, single user-approved change)
> Predecessor: `openspec/changes/archive/2026-07-12-water-footprint-phase2/` (dataset + BFF endpoint, complete)

## Goals

- **First category page with real data.** Replace the `/water-footprint/` placeholder with a data-driven page: a Server Component fetches `GET /api/v1/water-footprint/products` (52 products) from the NestJS BFF and passes the dataset down to a client component for filtering and sorting.
- **Phase 3 deliverables** (per `docs/planning/water-footprint.md`): `WaterFootprintTable` client component, category filters (Food & Beverages, Textiles, Technology, Manufactured), sort by product name / water footprint, first-class accessibility (keyboard navigation, `scope` attributes, `aria-sort`, `aria-live` announcements for filter/sort changes, focus preservation), snapshot + unit + E2E tests.
- **Phase 4 deliverables:** contextual equivalents ("≈ X showers · ≈ Y bathtubs"), mobile-responsive layout (data table ≥ `lg`, card list < `lg` — Tailwind only), and static generation with ISR on top of the existing `generateStaticParams` (`revalidate: 86400` — the dataset is static and versioned in the repo).
- **Per-product source attribution visible** — every row/card surfaces the dataset's `source` (as an external link to `sourceUrl`) and `methodology` (native `<details>` disclosure) in both layouts.
- **New server-side env var `API_BASE_URL`** (default `http://localhost:3001/api/v1` in dev) — typed helper, documented in `apps/web/.env.example` and the Environment Variables section of `apps/web/README.md` (AGENTS.md doc-sync rule).
- **D1 technical cleanup** (ROADMAP note, 14 Sep 2026): move `apps/api/src/data/water-footprint.json` → `apps/api/src/modules/water-footprint/data/water-footprint.json`, adjust the `assets` copy config in `apps/api/webpack.config.js` so the bundled `__dirname` resolution still finds it, validate with `nx build api` + `nx serve api` + `nx test api` (the service must load the 52 products in both runtime and tests), and **remove the `fs` mocks from `app.module.test.ts` and `water-footprint.module.test.ts`**. The `fs` mock in `water-footprint.service.test.ts` is **kept** — it covers the ENOENT/EACCES/malformed-JSON error branches that cannot be exercised with the real file.

## Non-Goals

- **No chart library and no comparative bar charts** — the display format is a data table (desktop) + card list (mobile), built with Tailwind CSS only. The chart library decision (Recharts vs alternatives, roadmap I15) belongs to P1.1.
- **No `/data-sources/` page** (roadmap I13, P1 scope) — attribution is surfaced per product inside the table/cards; a centralized sources page is deferred.
- **No `ApiResponse<T>.meta` extension** (roadmap I14, P1.0) — the existing response contract is consumed exactly as defined.
- **No free-text search** — Phase 3 scope is category filters + sort (name / water footprint). Search was only "Proposed" in the planning doc's UX decisions table and is not part of the approved scope.
- **No sort by category column** — the category filter already groups products; a category sort adds no information (explicitly dropped from the planning doc's "Proposed" sort options).
- **No pagination or virtualization** — 52 rows render completely in both layouts.
- **No Suspense/streaming refactor** (roadmap I09) — the existing `[category]/loading.tsx` skeleton covers route navigation; the fetch is awaited in the page and embedded by ISR.
- **No API contract changes** — `GET /api/v1/water-footprint/products` behavior, response shape, validation, and Swagger docs are untouched. The only API-side changes are the dataset file location, the webpack assets config, and test hygiene.
- **No new dependencies** — native `fetch` (Node 24 / Next.js), existing Tailwind, existing Jest/Testing Library/Playwright/axe tooling.
- **No visual design pass** — the structural, semantic, a11y, and SEO core must be right; visual styling may be retouched later (user decision).
- **No CI workflow changes** — the web build degrades gracefully when the BFF is unreachable at build time (see design.md), so CI needs no API service for `npm run build`.
- **No OWID / external provider integration** — that is P1; this change consumes only the embedded dataset through the existing BFF endpoint.
- **No changes to the other 11 category pages** — they keep the placeholder rendering, metadata, sitemap entries, and passing tests/snapshots they have today.
- **No commits or pushes** — implementation stops at the mandatory user-approval checkpoint (AGENTS.md SDD workflow step 5).

## Impact

| Area | Change |
|------|--------|
| `apps/api/src/data/water-footprint.json` | **REMOVED** — moved into the module folder |
| `apps/api/src/modules/water-footprint/data/water-footprint.json` | **ADDED** — same 52-product content, new module-local location |
| `apps/api/webpack.config.js` | **MODIFIED** — `assets` entry `'./src/data'` replaced with an explicit object-form entry copying the module-local `data/` folder to `dist/data/` (string form would copy to the wrong nested path — see design.md D8) |
| `apps/api/src/modules/water-footprint/water-footprint.service.ts` | **UNCHANGED** — `join(__dirname, 'data/water-footprint.json')` becomes correct in both ts-jest and webpack contexts after the move |
| `apps/api/__tests__/app/app.module.test.ts` | **MODIFIED** — `fs` mock removed; module compiles against the real dataset |
| `apps/api/__tests__/water-footprint/water-footprint.module.test.ts` | **MODIFIED** — `fs` mock removed; asserts the real 52-product dataset loads through the module |
| `apps/api/__tests__/water-footprint/water-footprint.service.test.ts` | **UNCHANGED** — keeps its `fs` mock (ENOENT/EACCES/malformed-JSON branches) |
| `apps/web/src/lib/apiBaseUrl.ts` | **ADDED** — typed `API_BASE_URL` helper (mirrors `siteUrl.ts` pattern) |
| `apps/web/src/lib/water-footprint.ts` | **ADDED** — `getWaterFootprintProducts()` server-side fetch helper (ISR-cached, 5 s timeout, runtime shape guard) |
| `apps/web/src/lib/waterFootprintEquivalents.ts` | **ADDED** — reference constants (`SHOWER_LITERS`, `BATHTUB_LITERS`) + `formatLiters()` + `formatWaterFootprintEquivalents()` |
| `apps/web/src/components/water-footprint/WaterFootprintContent.tsx` | **ADDED** — server component: intro, error/empty states, client table, equivalents footnote |
| `apps/web/src/components/water-footprint/WaterFootprintTable.tsx` | **ADDED** — client component: category filter, sorting, `aria-live` region, responsive table/card list |
| `apps/web/src/app/[category]/page.tsx` | **MODIFIED** — conditional water-footprint branch (route stays `/water-footprint/`) + `export const revalidate = 86400` |
| `apps/web/.env.example` | **MODIFIED** — `API_BASE_URL` entry with comment |
| `apps/web/README.md` | **MODIFIED** — `API_BASE_URL` row in the Environment Variables table |
| `apps/web/__tests__/` | **ADDED** — `lib/apiBaseUrl.test.ts`, `lib/water-footprint.test.ts`, `lib/waterFootprintEquivalents.test.ts`, `components/water-footprint/WaterFootprintContent.test.tsx`, `components/water-footprint/WaterFootprintTable.test.tsx` (+ snapshot) · **MODIFIED** — `app/[category]/page.test.tsx` (water-footprint branch, `revalidate` export) |
| `apps/web/e2e/water-footprint.spec.ts` | **ADDED** — E2E spec (render, SSR content, filters, sort, live region, attribution, responsive, metadata) |
| `docs/planning/water-footprint.md` | **MODIFIED** — Phases 3 + 4 marked complete; UX decisions table resolved; status header updated |
| `docs/data-sources/water-footprint.md` | **MODIFIED** — dataset path reference updated to the new location |
| `ROADMAP.md` | **At archive time** — D1 block removed and D-series renumbered per the AGENTS.md continuous-sequence rule (close-out task in tasks.md) |

**Explicitly unchanged:** `packages/shared` (all types already exist from Phase 2), the API controller/module source and endpoint contract, `generateMetadata` for all categories, sitemap/nav/`ECO_CATEGORIES`, the other 11 category placeholders and their snapshots, `.github/workflows/ci.yml`.
