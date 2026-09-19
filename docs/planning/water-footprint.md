# Water Footprint by Product — Research & Implementation Plan 💧

> **Status:** Phase 5 complete — water-type discriminator, citation audit, and the Digital & Computing category shipped (18 Sep 2026).
> **Category slug:** `water-footprint`
> **URL:** `/water-footprint/`
> **Provider docs:** `docs/data-sources/water-footprint.md` (country-level sources: OWID, World Bank, FAO AQUASTAT — licenses and validated endpoints)
> **API endpoint:** `GET /api/v1/water-footprint/products?category=` (optional filter: `food-beverages`, `textiles`, `technology`, `manufactured`, `digital-computing`)

---

## Problem Statement

No current dashboard category displays the water consumption associated with everyday consumer products. Documented sources (World Bank, OWID, NOAA) only cover macro-level data: water extraction by country, water stress, and ocean temperature. Users cannot visualize or compare the water footprint of their consumption decisions (food, textiles, electronics).

---

## Data Sources

The following sources will be used to compile a **static dataset** of ~30–50 products. There is no single public API with per-manufactured-product data — the approach is an embedded static dataset (JSON/CSV) with explicit attribution per item.

### 1. Our World in Data — Poore & Nemecek (2018)

- **Focus:** Food products
- **Access:** CSV Grapher API — `/grapher/water-withdrawals-per-kg-poore.csv`
- **Data points:** Water withdrawals per kg of food product (liters/kg)
- **Examples:** Beef, chicken, almonds, beer, wine, rice, wheat

### 2. Water Footprint Network (WaterPub)

- **Focus:** Crops, animal products, some textiles
- **Access:** PDF/Excel reports scattered across waterfootprint.org
- **Data points:** Green, blue, and grey water footprint per unit
- **Examples:** Cotton (fabric, jeans, t-shirts), paper, leather

### 3. LCA (Life Cycle Assessment) Papers

- **Focus:** Electronics and manufactured products
- **Access:** Published studies (Apple Environmental Reports, Samsung Sustainability Reports, academic papers on steel, cement, glass)
- **Data points:** Total water consumption across the product lifecycle
- **Examples:** Smartphones, laptops, cars, construction materials

---

## Dataset Example

Each entry must include the original citation/source (paper, report, or dataset).

| Product                   | Water Footprint (approx.) | Category         | Typical Source              |
| ------------------------- | ------------------------- | ---------------- | --------------------------- |
| Smartphone (1 unit)       | ~12,000 L                 | Technology       | LCA papers (Apple, Samsung) |
| Pair of jeans (cotton)    | ~7,000 – 10,000 L         | Textiles         | WFN / Textile LCA           |
| Cotton t-shirt            | ~2,700 L                  | Textiles         | WFN / Textile LCA           |
| A4 sheet of paper         | ~10 L                     | Manufactured     | WFN / Paper LCA             |
| 1 liter of beer           | ~300 L                    | Food & Beverages | OWID / Poore & Nemecek      |
| 1 liter of wine           | ~800 – 1,000 L            | Food & Beverages | OWID / Poore & Nemecek      |
| Compact car               | ~400,000 L                | Manufactured     | Steel & paint LCA           |
| 1 kg of beef              | ~15,400 L                 | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of chicken           | ~4,300 L                  | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of almonds           | ~16,000 L                 | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of rice              | ~2,500 L                  | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of wheat             | ~1,800 L                  | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of chocolate         | ~17,000 L                 | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of cheese            | ~5,000 L                  | Food & Beverages | WFN / Hoekstra              |
| 1 kg of leather           | ~17,000 L                 | Textiles         | WFN / Leather LCA           |
| 1 pair of leather shoes   | ~8,000 L                  | Textiles         | WFN                         |
| 1 microchip (2g)          | ~32 L                     | Technology       | LCA papers                  |
| 1 laptop                  | ~30,000 – 50,000 L        | Technology       | LCA papers (Apple, Dell)    |
| 1 kg of steel             | ~250 L                    | Manufactured     | WFN / Steel LCA             |
| 1 kg of cement            | ~5 L                      | Manufactured     | WFN / Cement LCA            |
| 1 kg of glass             | ~25 L                     | Manufactured     | WFN / Glass LCA             |
| 1 kg of plastic (PET)     | ~180 L                    | Manufactured     | WFN / Plastic LCA           |
| 1 egg                     | ~200 L                    | Food & Beverages | OWID / Poore & Nemecek      |
| 1 liter of milk           | ~1,000 L                  | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of potatoes          | ~290 L                    | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of tomatoes          | ~180 L                    | Food & Beverages | OWID / Poore & Nemecek      |
| 1 kg of coffee (roasted)  | ~18,900 L                 | Food & Beverages | WFN / Coffee LCA            |
| 1 kg of tea (processed)   | ~8,900 L                  | Food & Beverages | WFN / Tea LCA               |
| 1 kg of sugar (from cane) | ~1,500 L                  | Food & Beverages | OWID / Poore & Nemecek      |
| 1 toilet roll (2-ply)     | ~140 L                    | Manufactured     | WFN / Paper LCA             |

---

## UX Decisions (Resolved)

| Decision             | Options                                                                     | Status   |
| -------------------- | --------------------------------------------------------------------------- | -------- |
| Display format       | Data table on desktop, card list on mobile (Tailwind)                       | Accepted |
| Category filters     | Food & Beverages, Textiles, Manufactured, Technology                        | Accepted |
| Search / sort        | Sort by name/footprint accepted; free-text search and category sort dropped | Accepted |
| Data freshness       | Static dataset — versioned in repo, updated periodically                    | Accepted |
| Water footprint unit | Liters (L) — with contextual equivalents (shower 65 L / bathtub 150 L)      | Accepted |

---

## Technical Approach

1. **Dataset as static JSON** — embedded in the repo under `apps/api/src/modules/water-footprint/data/water-footprint.json` (52 products, served through the BFF)
2. **Component rendering** — new client component `WaterFootprintTable` with filtering and sorting
3. **Page integration** — rendered in the existing `/water-footprint/` category page via `[category]/page.tsx` template
4. **Source attribution** — each data entry includes a `source`, `sourceUrl`, and `methodology` field
5. **Accessibility** — table must be keyboard-navigable, with proper `scope` attributes and screen-reader announcements for sort/filter changes

---

## Implementation Phases

### Phase 1 — Category scaffolding (✅ Complete)

- [x] Add `water-footprint` to `ECO_CATEGORIES`
- [x] Create `WaterFootprintIcon` component
- [x] Wire up route, sitemap, nav, metadata

### Phase 2 — Dataset compilation (✅ Complete — 12 Jul 2026)

- [x] Curate and validate 52 product entries (38 Food & Beverages, 6 Textiles, 3 Technology, 5 Manufactured)
- [x] Create `apps/api/src/modules/water-footprint/data/water-footprint.json` with citations — all commercial-safe (CC BY / citable)
- [x] Add type definitions (`WaterFootprintProduct`, `WaterFootprintCategory`) in `@eco-metrics/shared`
- [x] Build NestJS module (`WaterFootprintModule`) exposing `GET /api/v1/water-footprint/products?category=`
- [x] Unit tests (49 tests, 100% coverage — service + controller + module)

### Phase 3 — UI implementation (✅ Complete — 14 Sep 2026)

- [x] Build `WaterFootprintTable` component
- [x] Implement category filters (Food & Beverages, Textiles, Manufactured, Technology)
- [x] Add sort by name / water footprint
- [x] Accessibility audit (axe-core, keyboard navigation, screen reader)
- [x] Snapshot + unit tests + E2E tests

### Phase 4 — Polish (✅ Complete — 14 Sep 2026)

- [x] Contextual equivalents (e.g., "≈ X showers", "≈ Y bathtubs")
- [x] Mobile-responsive table/cards layout
- [x] Performance: static generation with `generateStaticParams`

### Phase 5 — Methodology, citations, and computing (✅ Complete — 18 Sep 2026)

Two defects shipped with Phases 2–4 and are corrected here, plus one new category.

**Water-type discriminator.** `WaterFootprintProduct` had no field declaring what its liter value measured, so the default footprint-descending sort compared blue-water-only values (Poore & Nemecek) against green + blue + grey totals (Mekonnen & Hoekstra). Cotton lint (4,030 L/kg) outranked beef (1,451 L/kg), implying cotton needs ~3× the water of beef — an artifact of scope, not a fact (beef is ~15,400 L/kg on the M&H basis).

- [x] `WaterFootprintWaterType` = `blue` | `green-blue-grey` | `lifecycle-onsite` | `lifecycle-total`, plus `waterFootprintWaterTypeLabels`, in `@eco-metrics/shared`
- [x] `waterType` added as a **required** field on `WaterFootprintProduct`; all 53 entries tagged
- [x] "Water type" column on the desktop table and a line on each mobile card (not sortable)
- [x] Persistent comparability note explaining the bases

**Citation audit.** Seven entries rendered clickable links that did not support their value.

- [x] Steel, cement and glass re-sourced from `"Water Footprint Network (various)"` to Gerbens-Leenes, Hoekstra & Bosman (2018), _Water Resources and Industry_ 19:1–12, and corrected to that paper's blue-water values: steel 250 → 11 L/kg, cement 5 → 2.6 L/kg, flat glass 25 → 5.8 L/kg (renamed to the material grades the study actually measures)
- [x] Removed `PET plastic (virgin)`, `Compact car`, `Smartphone (1 unit)` and `Laptop (1 unit)` — no primary source supports a per-unit figure; the Apple Product Environmental Reports cited by the last two report water at corporate level, not per device

**Digital & Computing.** New category, five entries, each on-site figure paired with its total-scope counterpart so the discriminator has a worked example:

| Product                         | Value                     | Water type | Source                                       |
| ------------------------------- | ------------------------- | ---------- | -------------------------------------------- |
| AI text prompt (Gemini, median) | 0.00026 L                 | on-site    | Google 2025, arXiv:2508.15734                |
| AI text responses (GPT-3)       | 0.5 L per 10–50 responses | total      | Li et al. 2025, CACM 68:54–63                |
| GPT-3 training run (on-site)    | 700,000 L                 | on-site    | Li et al. 2025                               |
| GPT-3 training run (total)      | 5,400,000 L               | total      | Li et al. 2025                               |
| Bitcoin transaction             | 16,000 L                  | total      | de Vries 2023, _Cell Reports Sustainability_ |

- [x] `'digital-computing'` slug added to `waterFootprintCategorySlugMap` and the Swagger `@ApiQuery` enum
- [x] `formatLiters` handles sub-litre values — `0.00026` rendered as `"0"` before, so the AI inference row would have shipped as "0 L per prompt"
- [x] Unit, snapshot and E2E tests updated; dataset 52 → 53 entries

**Deferred to follow-up changes** (researched, catalogued in `docs/data-sources/water-footprint.md` § 9): NREL life-cycle water per MWh by generation source; WRI Aqueduct 4.0 (CC BY 4.0, catchment resolution); lithium extraction in the Atacama and Argentine salt flats; AWARE scarcity weighting.

---

## Difficulty: 4/10

- **Data compilation:** Manual research and validation — the most time-consuming part
- **Frontend implementation:** Standard React table with filters — low complexity
- **Testing:** Snapshot + unit + E2E — well-understood patterns

---

_Last updated: 18 Sep 2026_
