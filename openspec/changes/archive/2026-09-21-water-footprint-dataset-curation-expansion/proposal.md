# Proposal: Water Footprint — Dataset Curation & Expansion (Cassava Removal, Citation Corrections, Vehicles & Energy Categories)

## Context

The `/water-footprint/` dataset currently carries 53 products across 5 categories. Three things are wrong or missing:

**1. Cassava is a null fixture living in production data.** The entry stores `waterFootprintLiters: null` and renders "No data" — zero informational value for the user. OWID's `water-withdrawals-per-kg-poore` CSV actually reports cassava as `0` L/kg (a rain-fed crop with ~zero blue withdrawals), so the stored `null` was a transcription interpretation, not a reported gap. The row exists today only as a live fixture for the null-handling spec scenario and tests. The defensive null-handling capability itself (type allows `null`, "No data" rendering, nulls-sort-last, `—` equivalent) is correct and stays — but it should be exercised by test fixtures, not by a production dataset row.

**2. Two Textiles citations do not support their figures** (a direct violation of the dataset's own citation-integrity requirement):

- **Cotton t-shirt (250g) — 2,720 L** is exactly Chapagain, Hoekstra, Savenije & Gautam (2006), *The water footprint of cotton consumption*, Value of Water Research Report 18, Table 4.4 (250 g t-shirt: 1,230 blue + 1,110 green + 380 dilution = 2,720 L) — but it is wrongly cited to "Mekonnen & Hoekstra (2011) … Estimated from cotton lint water footprint per kg", a method that produces ≈1,008 L (0.25 kg × 4,030 L/kg), not 2,720.
- **Pair of jeans — 8,000 L "800g cotton"**: the cited methodology (M&H 2011 cotton lint) produces ≈3,224 L (0.8 × 4,030), and no other source reports 8,000 L for 800 g. The citable primary figure is Chapagain et al. (2006) Table 4.4: **1 pair of jeans = 10,850 L** (standard weight 1,000 g: 4,900 blue + 4,450 green + 1,500 dilution).

**3. The dataset has no vehicles or energy-extraction coverage**, and the previously retired Smartphone entry can now return: Friends of the Earth / Trucost (2015), *Mind Your Step*, publishes a citable per-unit smartphone figure (12,760 L).

## ⚠️ Flagged decisions for review

These are the reviewable judgment calls in this change — veto any of them at this checkpoint:

1. **Jeans value change: 8,000 → 10,850 L** (and rename "Pair of jeans (800g cotton)" → "Pair of jeans (1 kg cotton)"). This is a *visible value change* in the table: the row users see today says 8,000 L; after this change it says 10,850 L with a different source. The 8,000 L figure is unverifiable; 10,850 L is the primary-source figure. Keeping an unverifiable number is not an option under the citation rule — the choice is correct it or remove the entry.
2. **Two new category names: "Vehicles" and "Energy & Extractives"** (slugs `vehicles`, `energy-extractives`, following the existing slug convention). These names appear in the filter radio group, the API contract, and the shared type union. Alternative namings (e.g. "Transport & Mobility", "Mining & Energy") were considered; the chosen names match the provider-doc vocabulary already used in `docs/data-sources/water-footprint.md`.
3. **Cassava removal** — approved, restated here because it deletes a visible row from the table (the only null row).
4. **Lithium entry naming tension** (minor): the approved name "Lithium carbonate (Salar de Atacama, brine evaporation)" is kept in the specs, but the 500,000 L/t figure from Flexer et al. (2018) is an *average across continental brines*, not Atacama-specific (Vera et al. 2023 reports 100–800 m³ brine/t depending on deposit). If you prefer the name to match the figure's actual basis, "(brine evaporation)" or "(continental brines)" is the more accurate suffix — say so at review and the spec will be adjusted before implementation.

## Goals

- **Remove Cassava** from the dataset; re-anchor the null-handling spec scenario and unit tests to a mock/fixture product. Keep the null-handling capability in code and UI entirely.
- **Correct the t-shirt citation**: keep 2,720 L, re-source to Chapagain et al. (2006) with an accurate methodology text.
- **Correct the jeans entry**: 8,000 → 10,850 L, renamed to "Pair of jeans (1 kg cotton)", sourced to Chapagain et al. (2006).
- **Re-categorize A4 sheet of paper** from Textiles to Manufactured (paper is not a textile; value and source unchanged).
- **Add 8 new entries, all values verified against primary sources:**
  - New **Vehicles** category (3): passenger car ICE lifetime 59,600 L (Bras et al. 2012, SAE 2012-01-0646); passenger car manufacturing-only 5,200 L (Semmens et al. 2014, Int J LCA 19(1):246–256); battery electric vehicle lifetime China grid 262,000 L (Wang et al. 2020, Resour. Conserv. Recycl. 155:104628).
  - New **Energy & Extractives** category (2): hydraulic fracturing 5,700,000 L per well (U.S. EPA 2016 final report); lithium carbonate brine evaporation 500,000 L per tonne Li₂CO₃ (Flexer et al. 2018, Sci. Total Environ. 639:1188–1204).
  - **Technology** +1: Smartphone (generic) 12,760 L (Friends of the Earth / Trucost 2015, *Mind Your Step*) — fulfills the "may return when a citable per-unit value is found" note about the retired Smartphone entry.
  - **Food & Beverages** +2: Milk chocolate bar (100g) 1,430 L (FoE/Trucost 2015); Cup of coffee (125 ml) 140 L (Chapagain & Hoekstra 2007, *Ecological Economics* 64(1):109–118). Both coexist with — not replace — the existing blue-water Coffee and Dark Chocolate entries; the coffee pair is a deliberate, pedagogical illustration of why the `waterType` discriminator exists.
- **Update documentation**: provider catalog, dataset-strategy counts, retired-citations note, §9 candidates, planning doc, and the stale product counts in `README.md` / `docs/deploy/cloud-run.md` / `packages/shared/README.md`.

### Resulting dataset shape (state after the change)

| Category               | Before | Delta                                             | After |
| ---------------------- | ------ | ------------------------------------------------- | ----- |
| Food & Beverages      | 38     | −1 (Cassava) +2 (chocolate bar, coffee cup)       | 39    |
| Textiles              | 6      | −1 (A4 → Manufactured); t-shirt/jeans re-sourced  | 5     |
| Technology            | 1      | +1 (Smartphone)                                   | 2     |
| Manufactured          | 3      | +1 (A4 sheet of paper moved in)                   | 4     |
| Digital & Computing   | 5      | unchanged                                         | 5     |
| Vehicles              | 0      | +3 (new category)                                 | 3     |
| Energy & Extractives  | 0      | +2 (new category)                                 | 2     |
| **Total**             | **53** |                                                   | **60** |

## Non-Goals

- **No avocado, almonds, TSMC wafer, or laptop entries** — explicitly declined per user decision. Future candidates stay catalogued in `docs/data-sources/water-footprint.md` §9 / the provider docs, not in this change.
- **No NREL per-MWh, WRI Aqueduct 4.0, or AWARE scarcity-weighting integration** — researched and deferred; they remain §9 candidates. (Lithium *is* integrated here and moves out of §9.)
- **No use of Marinova et al. (2024)'s 442 m³ world-eq/t figure as the lithium value** — it is AWARE scarcity-weighted, not liters. The stored value is Flexer et al. (2018)'s brine-evaporation liters.
- **No removal or weakening of null handling.** `waterFootprintLiters: number | null` stays; "No data" rendering, nulls-sort-last, and the `—` equivalent stay. Only the dataset's live null row goes away.
- **No new UI components, patterns, or presentation decisions.** The table already renders categories, units, and water types generically from shared maps; the two new categories flow through without component changes. `docs/design-system.md` is untouched (verified — see design.md).
- **No new API endpoints, no response-shape changes, no persistence** — the dataset stays a static, versioned JSON file.
- **No re-derivation of values.** Every number is transcribed verbatim from its cited source; no averaging or unit-conversion arithmetic of our own (the one unit conversion, 1.5 million gallons ≈ 5.7 ML for fracking, is stated in the source's own terms and disclosed in the methodology text).
- **No re-sourcing of entries not named above** (e.g. Cotton (lint), Leather, Pair of leather shoes keep their current Mekonnen & Hoekstra citations).
- **No touching of historical archives** under `openspec/changes/archive/` — they keep mentioning Cassava and the old figures intentionally (repo rule: never rewrite history).
- **No ROADMAP.md changes** — no roadmap item is completed or removed by this change; the §9 pointer lives in the provider doc.

## Impact

| Area                                                                       | Change                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/src/modules/water-footprint/data/water-footprint.json`           | 53 → 60 entries: 1 removed (Cassava), 1 re-categorized (A4), 2 re-sourced (t-shirt, jeans — jeans value 8,000 → 10,850), 8 added, 2 new category blocks                  |
| `packages/shared/src/lib/water-footprint.ts`                               | `'Vehicles'` and `'Energy & Extractives'` added to `WaterFootprintCategory`; `'vehicles'` and `'energy-extractives'` added to `waterFootprintCategorySlugMap`             |
| `apps/api/src/modules/water-footprint/water-footprint.controller.ts`       | Both new slugs added to the hardcoded `@ApiQuery` enum (the service error message derives from the slug map automatically)                                               |
| `apps/web/src/components/water-footprint/WaterFootprintTable.tsx`          | **No code change** — filter options derive from `waterFootprintCategorySlugMap`                                                                                          |
| `apps/api/__tests__/water-footprint/*`                                     | Module smoke test 53 → 60; controller invalid-slug message fixture lists all seven slugs                                                                                |
| `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx` | Null fixture renamed off "Cassava"; `FILTER_OPTIONS` gains the two new categories; snapshot intentionally updated                                                        |
| `apps/web/e2e/water-footprint.spec.ts`                                     | Row counts 53 → 60, Textiles 6 → 5, live-region strings updated; new-category radio visibility assertion                                                                 |
| `docs/data-sources/water-footprint.md`                                     | New providers (FoE/Trucost 2015; Chapagain et al. 2006; Chapagain & Hoekstra 2007; Bras et al. 2012/Ford report; Semmens et al. 2014; Wang et al. 2020; EPA 2016; Flexer et al. 2018 + Vera et al. 2023 as context); strategy counts 60/7; §6 retired-citations note updated (Smartphone returns; t-shirt/jeans corrected); §9 lithium annotated as integrated |
| `docs/planning/water-footprint.md`                                         | New phase section; current-state counts updated (historical phase text untouched)                                                                                        |
| `README.md`, `docs/deploy/cloud-run.md`, `packages/shared/README.md`       | Stale product counts (52) and slug lists updated to 60 / seven slugs                                                                                                     |
| `openspec/specs/` (at archive time)                                        | Deltas merge into `water-footprint-api-data`, `water-footprint-table`, `water-footprint-page`, and `api-cloud-run-deploy` canonical specs                                 |

**Not a breaking change:** `WaterFootprintCategory` widens (new union members); the API response shape, endpoint paths, and existing slugs are unchanged. The visible breaking *data* changes are the deleted Cassava row, the moved A4 row, and the jeans value/name change — all flagged above.
