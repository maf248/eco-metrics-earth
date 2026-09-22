# Design: Water Footprint — Dataset Curation & Expansion

## Technical approach

This is a **data-layer change with type-union extension**. The UI and service code are deliberately left alone: `WaterFootprintTable` derives its filter options from `Object.values(waterFootprintCategorySlugMap)`, and `WaterFootprintService.getByCategory` validates slugs through the same map — so adding the two categories to the shared map propagates to the radio group, the filter behavior, and the service error message without touching either file. The only code edits are the shared type/map and the controller's hardcoded `@ApiQuery` enum.

### 1. Shared types — `packages/shared/src/lib/water-footprint.ts`

```ts
export type WaterFootprintCategory =
  | 'Food & Beverages'
  | 'Textiles'
  | 'Technology'
  | 'Manufactured'
  | 'Digital & Computing'
  | 'Vehicles'
  | 'Energy & Extractives';

export const waterFootprintCategorySlugMap: Record<string, WaterFootprintCategory> = {
  'food-beverages': 'Food & Beverages',
  textiles: 'Textiles',
  technology: 'Technology',
  manufactured: 'Manufactured',
  'digital-computing': 'Digital & Computing',
  vehicles: 'Vehicles',
  'energy-extractives': 'Energy & Extractives',
};
```

Union order and map order matter for presentation: the radio group renders in map insertion order, so the two new categories appear after "Digital & Computing". `WaterFootprintWaterType` is **unchanged** — all four existing members cover the new entries (`blue`, `green-blue-grey`, `lifecycle-onsite`, `lifecycle-total`). No changes to `packages/shared/src/index.ts` (same exported names).

### 2. Dataset edits — `apps/api/src/modules/water-footprint/data/water-footprint.json`

**Ordering convention (preserve it):** the file is grouped in category blocks following the slug-map order; within Food & Beverages entries are alphabetical; within the other blocks the file uses curated insertion order (raw materials / thematic pairs first). Concretely:

- Remove the Cassava block (Food & Beverages).
- Insert **Cup of coffee (125 ml)** alphabetically after "Coffee" and before "Dark Chocolate"; insert **Milk chocolate bar (100g)** alphabetically after "Milk" and before "Nuts".
- Move the **A4 sheet of paper** block from Textiles to the end of the Manufactured block (field change only: `"category": "Textiles"` → `"Manufactured"`).
- Append **Smartphone (generic)** after "Microchip (2g)" in the Technology block.
- Replace the t-shirt and jeans blocks in place (Textiles) with the corrected source/methodology (and for jeans: name, value).
- Append two new blocks after Digital & Computing: **Vehicles** (3 entries) then **Energy & Extractives** (2 entries), matching the new slug-map order.

**Corrected entries (t-shirt, jeans):**

```json
{
  "product": "Cotton t-shirt (250g)",
  "category": "Textiles",
  "waterFootprintLiters": 2720,
  "unit": "per unit",
  "waterType": "green-blue-grey",
  "source": "Chapagain, Hoekstra, Savenije & Gautam (2006), The water footprint of cotton consumption, Value of Water Research Report 18, UNESCO-IHE",
  "sourceUrl": "https://www.waterfootprint.org/Reports/Report18.pdf",
  "methodology": "Water footprint of a 250 g cotton t-shirt (Table 4.4): 1,230 L blue + 1,110 L green + 380 L grey dilution water. Peer-reviewed version: Ecological Economics 60(1):186-203."
},
{
  "product": "Pair of jeans (1 kg cotton)",
  "category": "Textiles",
  "waterFootprintLiters": 10850,
  "unit": "per pair",
  "waterType": "green-blue-grey",
  "source": "Chapagain, Hoekstra, Savenije & Gautam (2006), The water footprint of cotton consumption, Value of Water Research Report 18, UNESCO-IHE",
  "sourceUrl": "https://www.waterfootprint.org/Reports/Report18.pdf",
  "methodology": "Water footprint of one pair of jeans at the study's standard weight of 1,000 g (Table 4.4): 4,900 L blue + 4,450 L green + 1,500 L grey dilution water. Replaces an earlier 8,000 L figure that no cited source reported."
}
```

Rationale for citing the report rather than the journal version as `sourceUrl`: the per-garment figures live in Table 4.4 of the open report PDF (verified resolving — see citation verification below), while the journal version is paywalled behind the DOI. The citation rule requires `sourceUrl` to resolve to the publication carrying the figure; the DOI is named in the methodology for completeness.

**New entries (8):**

```json
{
  "product": "Passenger car (ICE, lifetime)",
  "category": "Vehicles",
  "waterFootprintLiters": 59600,
  "unit": "per vehicle (lifetime)",
  "waterType": "lifecycle-total",
  "source": "Bras, Tejada, Yen & Zullo (2012), Quantifying the Life Cycle Water Consumption of a Passenger Vehicle, SAE Technical Paper 2012-01-0646",
  "sourceUrl": "https://doi.org/10.4271/2012-01-0646",
  "methodology": "Cradle-to-grave water consumption of a typical US light-duty gasoline vehicle: 5,600 L material production + 900 L parts + 800 L assembly + 52,000 L use phase (mostly fuel production) + 300 L end-of-life. The stage breakdown is reproduced in Ford Motor Company, Sustainability Report 2011/12."
},
{
  "product": "Passenger car (manufacturing only)",
  "category": "Vehicles",
  "waterFootprintLiters": 5200,
  "unit": "per vehicle",
  "waterType": "lifecycle-onsite",
  "source": "Semmens, Bras & Guldberg (2014), The International Journal of Life Cycle Assessment 19(1):246-256",
  "sourceUrl": "https://doi.org/10.1007/s11367-013-0612-2",
  "methodology": "Average direct water withdrawal per vehicle assembled (5.20 m3), derived from 12 automotive OEM sustainability reports (2006-2010). Direct consumption is lower (1.25 m3/vehicle); electricity-related indirect consumption adds ~2.21 m3/vehicle."
},
{
  "product": "Battery electric vehicle (lifetime, China grid)",
  "category": "Vehicles",
  "waterFootprintLiters": 262000,
  "unit": "per vehicle (lifetime)",
  "waterType": "lifecycle-total",
  "source": "Wang, Shen, Kim, Wallington, Zhang & Han (2020), Resources, Conservation and Recycling 155:104628",
  "sourceUrl": "https://doi.org/10.1016/j.resconrec.2019.104628",
  "methodology": "Life-cycle water consumption of a battery-electric Ford Focus produced and operated in China on the national average grid: 262 m3, vs 137 m3 for the gasoline equivalent. Electrification shifts water use from fuel production to electricity generation; the figure is highly grid-dependent (47 m3 on solar, 43 m3 on wind)."
},
{
  "product": "Hydraulic fracturing (frack job)",
  "category": "Energy & Extractives",
  "waterFootprintLiters": 5700000,
  "unit": "per well",
  "waterType": "blue",
  "source": "U.S. EPA (2016), Hydraulic Fracturing for Oil and Gas: Impacts from the Hydraulic Fracturing Water Cycle on Drinking Water Resources in the United States (Final Report)",
  "sourceUrl": "https://www.epa.gov/hfstudy",
  "methodology": "Median fresh water used per hydraulically fractured well (FracFocus 1.0 disclosures, Jan 2011-Feb 2013): 1.5 million gallons, about 5.7 ML; 10th-90th percentiles 280,000-23,000,000 L. This is withdrawal, not consumption - most injected fluid remains in the subsurface."
},
{
  "product": "Lithium carbonate (Salar de Atacama, brine evaporation)",
  "category": "Energy & Extractives",
  "waterFootprintLiters": 500000,
  "unit": "per tonne of Li₂CO₃",
  "waterType": "lifecycle-onsite",
  "source": "Flexer, Baspineiro & Galli (2018), Science of the Total Environment 639:1188-1204",
  "sourceUrl": "https://doi.org/10.1016/j.scitotenv.2018.05.223",
  "methodology": "Average brine water lost to evaporation per tonne of lithium carbonate from continental brines. Freshwater consumption is far lower (22.5 m3/t at Salar de Atacama per Vera et al. 2023, Nature Reviews Earth & Environment 4:149-165, which reports 100-800 m3 brine water/t depending on deposit). Whether brine counts as water is methodologically contested (Link et al. 2025, Water 17:1670)."
},
{
  "product": "Smartphone (generic)",
  "category": "Technology",
  "waterFootprintLiters": 12760,
  "unit": "per unit",
  "waterType": "green-blue-grey",
  "source": "Friends of the Earth / Trucost (2015), Mind Your Step: The land and water footprints of everyday products",
  "sourceUrl": "https://www.twosides.info/wp-content/uploads/2018/05/mind-your-step-report-76803.pdf",
  "methodology": "Supply-chain water footprint of a generic smartphone: ~29% blue, ~11% green, ~60% grey (grey dominated by chemicals in glues and lubricants). Report by Helen Burley, footprint modelling by Trucost."
},
{
  "product": "Milk chocolate bar (100g)",
  "category": "Food & Beverages",
  "waterFootprintLiters": 1430,
  "unit": "per bar",
  "waterType": "green-blue-grey",
  "source": "Friends of the Earth / Trucost (2015), Mind Your Step: The land and water footprints of everyday products",
  "sourceUrl": "https://www.twosides.info/wp-content/uploads/2018/05/mind-your-step-report-76803.pdf",
  "methodology": "Supply-chain water footprint of a 100 g bar of milk chocolate: 50 L blue + 1,350 L green + 30 L grey. Cocoa is the largest contributor, followed by sugar and milk powder. Coexists with the Dark Chocolate entry (540.6 L/kg, blue water, Poore & Nemecek) - different product, different scope."
},
{
  "product": "Cup of coffee (125 ml)",
  "category": "Food & Beverages",
  "waterFootprintLiters": 140,
  "unit": "per cup",
  "waterType": "green-blue-grey",
  "source": "Chapagain & Hoekstra (2007), Ecological Economics 64(1):109-118",
  "sourceUrl": "https://doi.org/10.1016/j.ecolecon.2007.02.022",
  "methodology": "Standard 125 ml cup from 7 g of roasted coffee at an average virtual-water content of 20.4 m3/kg roasted coffee; almost entirely green water at the farm. Coexists with the Coffee entry (25.9 L/kg, blue water, Poore & Nemecek) - the pair illustrates why the waterType discriminator exists."
}
```

Notes on the entry drafts:

- **`unit: "per tonne of Li₂CO₃"`** uses Unicode subscript characters (U+2082, U+2083). Valid JSON (UTF-8) and renders in the table. If review prefers ASCII, `"per tonne of lithium carbonate"` is the drop-in alternative — flag at review, don't decide silently at implementation.
- Methodology texts follow the existing dataset style: state the basis, name the arithmetic the source reports, and disclose comparability caveats (see the steel/cement/glass entries for precedent).
- The JSON file uses no Unicode elsewhere; keep `m3` (no superscript ³) in methodology text to match the existing entries' plain-ASCII style — the only Unicode characters introduced are the Li₂CO₃ subscripts in the unit string above.

### 3. Citation verification (pre-verified during this proposal)

The four citations flagged as "to be verified" were checked during research. Results:

| Citation | Status |
| --- | --- |
| Semmens, Bras & Guldberg (2014) | ✅ **Verified**: *Int J Life Cycle Assess* 19(1):246–256, DOI `10.1007/s11367-013-0612-2` (confirmed via multiple citing sources incl. ACS and Taylor & Francis reference lists). |
| Wang et al. (2020) | ✅ **Verified**: DOI `10.1016/j.resconrec.2019.104628`, *Resources, Conservation and Recycling* 155:104628 (March 2020). Abstract confirms the exact figures: life-cycle consumption 262 m³ BEV vs 137 m³ gasoline (China national average grid); 47 m³ solar / 43 m³ wind. Confirm the volume number (155) on the DOI landing page during implementation — the DOI itself is the load-bearing identifier. |
| Flexer et al. (2018) | ✅ **Verified with correction**: *Sci. Total Environ.* 639:1188–1204, but the DOI is **`10.1016/j.scitotenv.2018.05.223`** — not `…2018.08.177` as initially guessed (confirmed via CONICET, OpenAlex, and the Nature Reviews Earth & Environment reference list). The abstract confirms "evaporates on average half a million litres of brine per ton of lithium carbonate". The corrected DOI is baked into the entry draft above. |
| Chapagain et al. (2006) report PDF | ✅ **Verified resolving**: `https://www.waterfootprint.org/Reports/Report18.pdf` serves the UNESCO-IHE report PDF (~900 KB, 42 pages). Used as `sourceUrl` for the t-shirt and jeans. |

Still to confirm at implementation (given as verified in the approved scope, cheap to re-check while transcribing): the EPA `https://www.epa.gov/hfstudy` landing URL, the FoE/Trucost mirror PDF URL, and the Chapagain & Hoekstra (2007) DOI / open PDF. The citation rule stands: `source` names a retrievable publication, `sourceUrl` resolves.

### 4. API layer

- `water-footprint.controller.ts`: add `'vehicles'`, `'energy-extractives'` to the `@ApiQuery` enum array. Nothing else — the service's `BadRequestException` message is derived from `Object.keys(waterFootprintCategorySlugMap)`, so it picks up the new slugs automatically.
- `water-footprint.service.ts`: **no change**.
- `apps/api/webpack.config.js`: **no change** (asset copy is glob-based).

### 5. Web layer

- `WaterFootprintTable.tsx`: **no change**. `CATEGORIES = Object.values(waterFootprintCategorySlugMap)` picks up the new radios; the table/card rendering of category, unit, and water type is generic.
- `waterFootprintEquivalents.ts`: **no change**. The null → `—` path stays and remains covered by `apps/web/__tests__/lib/waterFootprintEquivalents.test.ts` (`it('should return em-dash for null')`), which is untouched.
- `apps/web/src/lib/water-footprint.ts` (fetch helper): **no change**.

### 6. Test impact (scoped precisely)

**API (`apps/api/__tests__/water-footprint/`):**

- `water-footprint.module.test.ts`: `toHaveLength(53)` → `toHaveLength(60)` (and the test name "should load the real 53-product dataset" → 60).
- `water-footprint.controller.test.ts`: the mocked `BadRequestException` message string lists only four slugs (already stale — it omits `digital-computing`); update the fixture message to list all seven so the mock stays realistic. No behavioral assertions change (the controller test mocks the service).
- `water-footprint.service.test.ts`: **no change needed** (fs-mocked; no dataset-count assertions). Optionally extend the valid-slug coverage with `vehicles` — not required.
- `app.module.test.ts`: **no change** (asserts compilation only).

**Web (`apps/web/__tests__/components/water-footprint/`):**

- `WaterFootprintTable.test.tsx`: the fixtures array contains a local `Cassava` fixture with `waterFootprintLiters: null` — rename it to a clearly-fixture product name (e.g. `Unmeasured crop (fixture)`) so no test references a real dataset product. Update the three assertions naming Cassava (default-sort last row, null-last row, flip-sort last row). Add `'Vehicles'` and `'Energy & Extractives'` to `FILTER_OPTIONS` (the wrapper-isolation test asserts `labels` length against it, and the exactly-one-checked test iterates it — both then cover the new radios automatically).
- `__snapshots__/WaterFootprintTable.test.tsx.snap`: **intentional update** via `npx nx test web -- --updateSnapshot`. Expected diffs: the renamed null fixture product name (table row + card), and two new filter radio wrappers in the fieldset. Nothing else should change — visually diff the `.snap` before committing (repo rule).
- `waterFootprintEquivalents.test.ts`: **no change**.

**E2E (`apps/web/e2e/water-footprint.spec.ts`):** no Cassava references exist. Updates needed: `bodyRows` count 53 → 60; Textiles filter 6 → 5 and live region "Showing 6 of 53" → "Showing 5 of 60"; D&C live region "Showing 5 of 53" → "Showing 5 of 60"; add a `Vehicles` radio visibility assertion to the core-render smoke test. The server-rendered-HTML assertions ("Beef (beef herd)", "Cotton (lint)") remain valid.

### 7. Documentation

- `docs/data-sources/water-footprint.md`: add the new providers following the existing per-provider format (URL / License / Model / Data / table). Suggested grouping: a "Vehicles" group in the style of §8 (Bras et al. 2012 + Ford report reproduction; Semmens et al. 2014; Wang et al. 2020), an "Energy & Extractives" group (EPA 2016; Flexer et al. 2018 with Vera et al. 2023 and Link et al. 2025 as context), and entries for FoE/Trucost 2015 and the two Chapagain studies (the 2006 report can sit alongside provider 5 WFN or standalone — implementer's judgment, keep the format consistent). Update the "Product dataset strategy" integration note to 60 products / 7 categories with the per-category counts. Update §6's retired-citations note: Smartphone returned via FoE/Trucost 2015; the t-shirt and jeans citations were corrected to Chapagain et al. (2006). Update §9: annotate/remove the lithium bullet (integrated via Flexer et al. 2018 — keep the AWARE caveat and the NREL/WRI bullets deferred). Add the new product-footprint rows to the Available Metrics table.
- `docs/planning/water-footprint.md`: add a new phase section (dated, in the existing phase-block style) describing this curation + expansion; update the header endpoint line to the seven slugs; update the current-state count in "Technical approach" (52 → 60). Historical phase text (Phase 2's "52 product entries", Phase 5's "52 → 53") is a dated record — leave it untouched.
- `README.md`: "52 products" → 60 in the structure tree comment; the endpoint table's category list gains the two new slugs (it currently lists only four — stale since Phase 5).
- `docs/deploy/cloud-run.md`: verification comment "should return success:true with 52 products" → 60.
- `packages/shared/README.md`: the `WaterFootprintCategory` type example gains the two new members.

## State management

No state changes. The dataset is a static, versioned JSON file loaded once at service construction; the web component's filter/sort state is local and unchanged. The only "state" delta is the data itself: 53 → 60 entries, 5 → 7 categories, and the shared type union widening. ISR (`revalidate = 86400`) picks up the new data on the next revalidation; no cache invalidation work is needed.

## Alternatives considered

- **Keep a null dataset entry as a live fixture (rejected):** a production dataset row whose only purpose is exercising a code path is a fixture living in the wrong layer. The type still allows `null`, so the capability remains testable with fixtures — and future sources genuinely reporting gaps can still store `null`.
- **Store cassava as `0` instead of `null` (rejected):** OWID reports 0 L/kg blue withdrawals for cassava, but a 0 in the table would render "0 L per kg" and sort first ascending — visually asserting "cassava uses no water", which is false as a total-footprint statement (it is a rain-fed crop; its green water is not zero, it is simply not what this blue-water source measures). Removing the row is the honest option; the blue-water-only basis is already disclosed per-entry via `waterType`.
- **Keep jeans at 8,000 L with a corrected weight (rejected):** no source reports 8,000 L for any weight; the figure is unsalvageable. Correct to the primary-source 10,850 L (1,000 g standard) or remove the entry — correction was approved.
- **Cite the journal version (Ecological Economics DOI) for the cotton garments (rejected as primary):** the per-garment Table 4.4 figures live in the open report PDF; the journal article is paywalled. `sourceUrl` must resolve to the publication carrying the figure — the verified PDF does; the DOI is named in the methodology.
- **Shoehorn vehicles/energy into "Manufactured" (rejected):** the dataset's category axis is the user-facing filter; cars and wells are not manufactured goods in any user's mental model, and the API contract gains two honest slugs instead of an overloaded one.
- **Use Marinova et al. (2024) 442 m³/t for lithium (rejected):** AWARE scarcity-weighted world-eq liters, not physical liters — mixing it into a liters column would be exactly the cross-basis comparison the `waterType` discipline exists to prevent.

## Risk assessment

- **Visible value change (jeans 8,000 → 10,850):** the highest-visibility risk; flagged in the proposal for explicit approval. Mitigation: the methodology text discloses the replacement.
- **Snapshot churn:** the web snapshot changes (renamed fixture + two radios). Mitigation: intentional update, visually diffed before commit per the repo rule; the expected diff is enumerated in §6.
- **Hardcoded counts in tests/E2E/docs:** every 52/53/6 anchor is enumerated in §6 and §7; a missed one fails loudly (a wrong count fails the assertion — it cannot pass silently).
- **Unicode in the unit string (Li₂CO₃):** valid JSON and renders in browsers; jsdom snapshot handles UTF-8. Residual risk is font coverage for subscript glyphs — negligible for the target fonts; ASCII fallback named in §2 if review prefers.
- **Coverage thresholds:** no production code paths are added or removed (component/service unchanged), so coverage impact is neutral; thresholds must not be lowered (AGENTS.md).
- **Lithium naming accuracy:** the entry name says "Salar de Atacama" while the figure is a continental-brine average — flagged in the proposal for the user to settle at review.

## Presentation docs (docs/design-system.md) — conclusion

**No changes needed, verified.** `docs/design-system.md` governs presentation decisions; it contains no water-footprint-specific or category-specific presentation rules (its table-related content is the generic "browse/filter of many records → table" heuristic and the pending library choice, which this change does not touch). The table renders category names, units, and water-type labels generically from shared maps — the two new categories introduce no new visual pattern, component, or styling decision. Per AGENTS.md, a change that establishes a new presentation decision must update `docs/design-system.md` in the same change; this change establishes none.

## ROADMAP.md — conclusion

No roadmap item is completed or removed by this change (the water-footprint roadmap entries describe the category as complete, which remains true; dataset curation is not a tracked P/D/I item). ROADMAP.md is untouched, so no Pxx/Dxx/Ixx renumbering is triggered.
