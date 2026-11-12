## 1. Shared types

- [x] 1.1 Add `packages/shared/src/lib/waste-recycling.ts` with the wire types (`WasteTreatmentGroup`, `WasteCompositionGroup`, `WasteGeneration`, `WasteCountry`, `WasteRecyclingData`) and export them from the package root.
- [x] 1.2 Add `DataSourceLicense` and optional `license` to `DataSourcePublication`.
- [x] 1.3 Type tests for the new types (missing group fails, optional treatment/composition, optional license); `npm exec nx test shared`.

## 2. Dataset generation

- [x] 2.1 Add `fflate@0.8.3` as a pinned root `devDependency` (Node 24 via nvm for `npm install`).
- [x] 2.2 Write `scripts/generate-waste-recycling-data.mjs` (workbook path + required `--retrieved`) and the root npm script `data:waste-recycling`: read `Country dataset` and `Codebook` by machine key, group treatment and composition with blank groups as `null` (never 0), normalize the reported groups with largest-remainder rounding, compute world totals and the recycling summary over the countries that report recycling, write rounded JSON in a stable key order; fail on missing machine keys.
- [x] 2.3 Run it on the downloaded workbook and commit `apps/api/src/modules/waste-recycling/data/waste-recycling.json`; re-run and confirm byte-identical output.
- [x] 2.4 Spot-check: DEU (1.63 kg, recycling ≈ 47 %, composting ≈ 22 %), CHN recycling `null` and incineration ≈ 75 %, BOL sums 100, NGA without treatment, ALB treatment year 2022, IND composition, world 2022 ≈ 2.33 bn t and 2050 ≈ 3.49 bn t, recycling summary ≈ 18 % over 130 countries and ≈ 46 % of the population.

## 3. API

- [x] 3.1 Create `apps/api/src/modules/waste-recycling/` (module, controller, service with shape validation) and register it in the app module.
- [x] 3.2 `GET /api/v1/waste-recycling` returns countries sorted by name, world block and `meta.source` (World Bank, CC BY 4.0, catalog URL, `2026-03-11`).
- [x] 3.3 Data-sources contributor with the single publication and its license; aggregator validation rejects `publisher` + `license` together.
- [x] 3.4 Unit tests for the service, controller, contributor and validation, plus invariants of the committed dataset (217 countries; reported shares sum to 100.0; no group is 0 where the workbook is blank; the spot checks of 2.4), so the script's output is covered by the existing Jest setup; `npm exec nx test api`.

## 4. Web — data and page

- [x] 4.1 `lib/wasteRecycling.ts`: `getWasteRecycling` with a payload guard; unit tests.
- [x] 4.2 Read `docs/design-system.md`; add the treatment and composition palettes (tokens only) and document them.
- [x] 4.3 `components/waste-recycling/`: `WasteRecyclingContent`, `WasteKeyFigures`, `WasteWorldMap` (four measures), `WasteCountryTable`, `WasteTreatmentBars`, `WasteCompositionBars`, `WasteProjectionChart`, each chart with its text equivalent.
- [x] 4.4 `Dataset` JSON-LD through `datasetJsonLd` with the World Bank as creator.
- [x] 4.5 Registry entry (`CATEGORY_PAGES`), `CATEGORY_SKELETONS` entry, `LIVE_CATEGORY_SUMMARIES` entry (≤ 120 chars), live meta description and the title override.
- [x] 4.6 `/data-sources/`: render a publication's license.
- [x] 4.7 Unit tests for every new component and lib, and update the registry, metadata, sitemap, static-params and home tests for five live categories; `npm exec nx test web`.

## 5. E2E

- [x] 5.1 `e2e/` spec for `/waste-recycling/`: server-rendered key figures, map measure switch, table search ("arg"), adding Germany to the bars, projection chart, attribution, JSON-LD.
- [x] 5.2 Add `/waste-recycling/` to the accessibility audit (both themes) and update home/sitemap/data-sources E2E for the new category and license.
- [x] 5.3 Run the E2E suite with ports 3000/3001 free.

## 6. Docs

- [x] 6.1 Update `AGENTS.md`, `apps/api/README.md`, `apps/web/README.md` (module, endpoint, regeneration command) and `docs/design-system.md`.
- [x] 6.2 Update the coverage matrix row in `ROADMAP.md`.

## 7. Gates

- [x] 7.1 `npm exec nx run-many -t lint build test`, format check, `npx openspec validate waste-recycling-page --strict`.
