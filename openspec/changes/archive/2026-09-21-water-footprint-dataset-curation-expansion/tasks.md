# Tasks: Water Footprint — Dataset Curation & Expansion

Ordered for sequential implementation. Every task is verifiable against a spec scenario in `specs/water-footprint-api-data/`, `specs/water-footprint-table/`, `specs/water-footprint-page/`, or `specs/api-cloud-run-deploy/` (this change's delta specs). Entry-level field values for the dataset edits are specified verbatim in `design.md` §2 — transcribe from there, do not re-derive.

## 1. Shared types — category union and slug map

- [x] 1.1 In `packages/shared/src/lib/water-footprint.ts`, add `'Vehicles'` and `'Energy & Extractives'` to the `WaterFootprintCategory` union (after `'Digital & Computing'`) and add `vehicles: 'Vehicles'` and `'energy-extractives': 'Energy & Extractives'` to `waterFootprintCategorySlugMap` (same order). Do not touch `WaterFootprintWaterType`, `waterFootprintWaterTypeLabels`, or `WaterFootprintProduct`.
- [x] 1.2 Update the `WaterFootprintCategory` example in `packages/shared/README.md` to include the two new members.
- [x] 1.3 Verify: `npx nx build shared` compiles with zero errors; `npx nx test shared` passes (existing tests are unaffected — no shared test enumerates the water-footprint categories).

## 2. Dataset JSON — removal, corrections, additions

Work in `apps/api/src/modules/water-footprint/data/water-footprint.json`. Preserve the ordering convention (category blocks in slug-map order; Food & Beverages alphabetical within its block; other blocks keep their existing order with new entries appended per design.md §2).

- [x] 2.1 **Remove Cassava** — delete the entire entry block (the only `waterFootprintLiters: null` entry).
- [x] 2.2 **Move A4 sheet of paper** — change `"category": "Textiles"` to `"Manufactured"` and relocate the block to the end of the Manufactured block. Value (10), unit, waterType, source, sourceUrl, methodology unchanged.
- [x] 2.3 **Fix the t-shirt citation** — replace the `Cotton t-shirt (250g)` block's `source`, `sourceUrl`, and `methodology` with the Chapagain et al. (2006) values from design.md §2. Keep product name, category, value (2720), unit, waterType.
- [x] 2.4 **Fix the jeans entry** — replace the `Pair of jeans` block with the corrected block from design.md §2: name `Pair of jeans (1 kg cotton)`, value 10850, Chapagain et al. (2006) source. (Visible value change 8,000 → 10,850 — approved in the proposal.)
- [x] 2.5 **Add the 8 new entries** from design.md §2, verbatim: `Cup of coffee (125 ml)` and `Milk chocolate bar (100g)` inserted alphabetically in Food & Beverages; `Smartphone (generic)` appended to Technology; `Passenger car (ICE, lifetime)`, `Passenger car (manufacturing only)`, `Battery electric vehicle (lifetime, China grid)` as a new Vehicles block after Digital & Computing; `Hydraulic fracturing (frack job)` and `Lithium carbonate (Salar de Atacama, brine evaporation)` as a new Energy & Extractives block after Vehicles.
- [x] 2.6 Verify: the file is valid JSON with exactly 60 entries — 39 Food & Beverages, 5 Textiles, 2 Technology, 4 Manufactured, 5 Digital & Computing, 3 Vehicles, 2 Energy & Extractives; no entry has `waterFootprintLiters: null`; every entry has all required fields including `waterType`. A quick `node -e` one-liner or jq count per category is enough.

## 3. Citation verification (citation rule: source names a retrievable publication; sourceUrl resolves)

Four citations were pre-verified during proposal research (design.md §3). Re-confirm the load-bearing ones while transcribing, and verify the remaining given-as-verified URLs:

- [x] 3.1 Confirm `https://doi.org/10.1007/s11367-013-0612-2` (Semmens et al. 2014, Int J LCA 19(1):246–256) resolves. ✅ resolves (CrossRef / DOI landing page).
- [x] 3.2 Confirm `https://doi.org/10.1016/j.resconrec.2019.104628` (Wang et al. 2020) resolves, and confirm the volume/article number (155:104628) on the landing page. ✅ resolves; **correction: landing page / CrossRef show volume 154** (not 155). Source text updated to `154:104628`.
- [x] 3.3 Confirm `https://doi.org/10.1016/j.scitotenv.2018.05.223` (Flexer et al. 2018, STOTEN 639:1188–1204) resolves. ✅ resolves.
- [x] 3.4 Confirm `https://www.waterfootprint.org/Reports/Report18.pdf` (Chapagain et al. 2006) resolves. ✅ resolves (PDF).
- [x] 3.5 Verify `https://www.epa.gov/hfstudy` (EPA 2016 final report landing page) resolves. ⚠️ **returns 404**; substituted with resolvable EPA report landing page `https://cfpub.epa.gov/ncea/hfstudy/recordisplay.cfm?deid=332990`.
- [x] 3.6 Verify `https://www.twosides.info/wp-content/uploads/2018/05/mind-your-step-report-76803.pdf` (FoE/Trucost 2015 mirror) resolves. ✅ resolves (PDF).
- [x] 3.7 Verify `https://doi.org/10.1016/j.ecolecon.2007.02.022` (Chapagain & Hoekstra 2007) resolves. ✅ resolves.
- [x] 3.8 Verify: if any URL fails to resolve, stop and report back — do not ship a `sourceUrl` that does not resolve (citation-integrity requirement). The Chapagain 2006 fallback is the journal DOI `10.1016/j.ecolecon.2005.11.027`.

## 4. API — controller enum and tests

- [x] 4.1 In `apps/api/src/modules/water-footprint/water-footprint.controller.ts`, add `'vehicles'` and `'energy-extractives'` to the `@ApiQuery` enum array. No other API source changes (the service error message derives from the slug map).
- [x] 4.2 `apps/api/__tests__/water-footprint/water-footprint.module.test.ts`: update the dataset-size assertion and test name from 53 to 60.
- [x] 4.3 `apps/api/__tests__/water-footprint/water-footprint.controller.test.ts`: update the mocked `BadRequestException` message fixture to list all seven valid slugs (it currently lists four and is stale).
- [x] 4.4 Verify: `npx nx test api` passes with zero errors and zero warnings; `npx nx build api` succeeds and `apps/api/dist/data/water-footprint.json` exists with 60 entries (webpack asset copy is glob-based — no config change expected).

## 5. Web — unit tests and snapshots

- [x] 5.1 `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx`: rename the local null-footprint fixture product `Cassava` to a clearly-fixture name (`Unmeasured crop (fixture)`) — the fixture keeps `waterFootprintLiters: null`. Update the assertions that reference Cassava (default sort last row, null-last "No data" row, flip-sort last row). Also updated the name-ascending last-row assertion, which the renamed fixture now correctly claims as the null-last row.
- [x] 5.2 Same file: add `'Vehicles'` and `'Energy & Extractives'` to `FILTER_OPTIONS` — the wrapper-isolation and exactly-one-checked tests then cover the two new radios automatically.
- [x] 5.3 Update the snapshot: `npx nx test web -- --updateSnapshot`. Expected diffs only: (a) the renamed null fixture product name in the table row and card, (b) two new filter radio wrappers in the fieldset. Visually diff `__snapshots__/WaterFootprintTable.test.tsx.snap` and confirm nothing else changed — an unexpected diff is a side effect to investigate, not commit.
- [x] 5.4 Do not touch `apps/web/__tests__/lib/waterFootprintEquivalents.test.ts` (the null → `—` path stays covered there) or any component source — `WaterFootprintTable.tsx` derives filter options from the shared map.
- [x] 5.5 Verify: `npx nx test web` passes with zero errors and zero warnings (a passing test emitting console.error/warn is not acceptable — fix the cause).

## 6. E2E — `apps/web/e2e/water-footprint.spec.ts`

- [x] 6.1 Update the dataset-size anchors: `bodyRows` count 53 → 60; Textiles filter row count 6 → 5; live-region assertions "Showing 6 of 53" → "Showing 5 of 60" and "Showing 5 of 53" → "Showing 5 of 60".
- [x] 6.2 Add a `Vehicles` radio visibility assertion to the core-render smoke test (alongside the existing Textiles/All/Digital & Computing assertions).
- [x] 6.3 Verify: `npm run e2e` passes. **E2E rationale:** this is a data-only change with unchanged table behavior, but the E2E suite contains dataset-size anchors that must be updated and re-validated, and the two new filter radios are user-visible behavior (new categories in the filter UI) — so the suite is run, not skipped.

## 7. Documentation

- [x] 7.1 `docs/data-sources/water-footprint.md`: add the new providers per design.md §7 (FoE/Trucost 2015; Chapagain et al. 2006; Chapagain & Hoekstra 2007; Bras et al. 2012 + Ford report reproduction; Semmens et al. 2014; Wang et al. 2020; EPA 2016; Flexer et al. 2018 with Vera et al. 2023 and Link et al. 2025 as context), following the existing per-provider format.
- [x] 7.2 Same file: update the "Product dataset strategy" integration note to 60 products / 7 categories with per-category counts; update §6's retired-citations note (Smartphone returned via FoE/Trucost 2015; t-shirt/jeans citations corrected to Chapagain et al. 2006); update §9 → §14 (lithium integrated via Flexer et al. 2018 — annotated as integrated; NREL per-MWh, WRI Aqueduct, and AWARE stay deferred); add the new product-footprint rows to the Available Metrics table.
- [x] 7.3 `docs/planning/water-footprint.md`: add a new dated phase section for this curation + expansion (existing phase-block style); update the header endpoint line to the seven slugs; update the current-state count in "Technical approach" (52 → 60). Leave historical phase text (Phase 2's "52 product entries", Phase 5's "52 → 53") untouched — it is a dated record.
- [x] 7.4 `README.md` and `apps/api/README.md`: structure-tree comment "52/53 products" → 60; endpoint table category list → all seven slugs.
- [x] 7.5 `docs/deploy/cloud-run.md`: verification comment "52 products" → 60.
- [x] 7.6 Verify: `grep -rn "52 products\|53 products\|53-product" README.md docs/ apps/ packages/` (excluding `openspec/changes/archive/`, build outputs, and CHANGELOG.md history) returns no stale current-state counts.
- [x] 7.7 Do not touch `docs/design-system.md` (no presentation decision is established — conclusion documented in design.md) or `ROADMAP.md` (no item completed/removed) or `openspec/changes/archive/**` (never rewrite history).

## 8. Validation gates

- [x] 8.1 `npm run lint` — zero errors.
- [x] 8.2 `npm run build` — all three projects build with zero errors.
- [x] 8.3 `npm run test` — all green, zero errors, zero warnings (AGENTS.md rule).
- [x] 8.4 `npm run e2e` — green (rationale in task 6.3).
- [x] 8.5 Coverage thresholds are untouched (80% statements/functions/lines; branches per project) — do not lower or disable them; no production code paths were added, so coverage should be unaffected.
- [x] 8.6 Final self-check against the delta specs: 60 products served; `?category=vehicles` → 3 entries; `?category=energy-extractives` → 2 entries; invalid slug error lists seven slugs; eight filter radios render with exactly-one-active; null fixture renders "No data" / "—" / sorts last; jeans row shows 10,850 L; no Cassava row anywhere in served data.
