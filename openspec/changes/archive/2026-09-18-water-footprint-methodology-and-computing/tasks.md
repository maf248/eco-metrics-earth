# Tasks: Water Footprint — Methodology Discriminator, Citation Integrity, and Digital & Computing

## Task Group 1 — Shared Types

### [x] 1.1 Add the water-type discriminator to `packages/shared/src/lib/water-footprint.ts`

- Define `WaterFootprintWaterType = 'blue' | 'green-blue-grey' | 'lifecycle-onsite' | 'lifecycle-total'` with a JSDoc block explaining what each member counts.
- Define `waterFootprintWaterTypeLabels: Record<WaterFootprintWaterType, string>`:
  - `blue` → `'Blue water'`
  - `green-blue-grey` → `'Green + blue + grey'`
  - `lifecycle-onsite` → `'Life cycle (on-site)'`
  - `lifecycle-total` → `'Life cycle (total)'`
- Add `waterType: WaterFootprintWaterType` as a **required** field on `WaterFootprintProduct`, with a JSDoc line stating that values of different water types are not directly comparable.
- Add `'Digital & Computing'` to the `WaterFootprintCategory` union.
- Add `'digital-computing': 'Digital & Computing'` to `waterFootprintCategorySlugMap`.

**Verification:** `npx nx build shared` compiles.

### [x] 1.2 Export the new symbols from `packages/shared/src/index.ts`

- Export the `WaterFootprintWaterType` type and the `waterFootprintWaterTypeLabels` constant alongside the existing water-footprint exports.

**Verification:** `npx nx build shared` succeeds; `npx nx test shared` passes.

---

## Task Group 2 — Dataset

All edits are to `apps/api/src/modules/water-footprint/data/water-footprint.json`. Values are transcribed verbatim from the cited source — do not average, convert, or round beyond what the source states.

### [x] 2.1 Tag every retained entry with `waterType`

- 38 `Food & Beverages` entries (Poore & Nemecek 2018) → `"blue"`
- 6 `Textiles` entries (Mekonnen & Hoekstra 2011) → `"green-blue-grey"`
- `Microchip (2g)` (Williams, Ayres & Heller 2002) → `"lifecycle-total"`

**Verification:** every retained entry has a `waterType`; `JSON.parse` succeeds.

### [x] 2.2 Correct the three construction-material entries

Replace `source` with `"Gerbens-Leenes, Hoekstra & Bosman (2018), Water Resources and Industry"` and `sourceUrl` with `"https://doi.org/10.1016/j.wri.2017.11.002"` on all three. Set `waterType` to `"blue"` and `category` stays `"Manufactured"`.

| Current `product` | New `product`             | `waterFootprintLiters` | `unit`   |
| ----------------- | ------------------------- | ---------------------- | -------- |
| `Steel (virgin)`  | `Steel (unalloyed)`       | `250` → `11`           | `per kg` |
| `Cement`          | `Portland cement (CEM I)` | `5` → `2.6`            | `per kg` |
| `Flat glass`      | `Soda-lime float glass`   | `25` → `5.8`           | `per kg` |

`methodology` values:

- Steel: `"Blue water footprint (process plus energy-related) of unalloyed steel. The grey water footprint is far larger at 2,300 L/kg, driven by cadmium released during iron-ore beneficiation."`
- Cement: `"Blue water footprint of ordinary Portland cement. The study reports a 2.0-2.6 L/kg range depending on the gypsum source; the upper bound is stored here. Grey water footprint is 0.63 L/kg excluding flue-gas-desulphurisation gypsum."`
- Glass: `"Blue water footprint of soda-lime float glass: 3.2 L/kg process water plus 2.6 L/kg energy-related, with soda ash from the Solvay process. Grey water footprint is 1,300 L/kg for suspended solids."`

**Verification:** no entry in the file still contains the string `Water Footprint Network (various)`.

### [x] 2.3 Remove the four entries with no supporting primary source

Delete: `PET plastic (virgin)`, `Compact car`, `Smartphone (1 unit)`, `Laptop (1 unit)`.

**Verification:** `grep` for each product name in the JSON returns nothing. `Technology` now holds exactly one entry and `Manufactured` exactly three.

### [x] 2.4 Add the five `Digital & Computing` entries

Each entry uses `"category": "Digital & Computing"`.

1. `"AI text prompt (Gemini, median)"` — `0.00026` L, `"per prompt"`, `"lifecycle-onsite"`
   - source: `"Google (2025), Measuring the environmental impact of delivering AI at Google Scale"`
   - sourceUrl: `"https://arxiv.org/abs/2508.15734"`
   - methodology: `"Median Gemini Apps text prompt: 0.26 mL of on-site data-centre water consumption, alongside 0.24 Wh of energy and 0.03 gCO2e. Counts cooling water at the data centre only; it excludes the indirect water used to generate the electricity consumed."`
2. `"AI text responses (GPT-3)"` — `0.5` L, `"per 10-50 responses"`, `"lifecycle-total"`
   - source: `"Li, Yang, Islam & Ren (2025), Communications of the ACM 68:54-63"`
   - sourceUrl: `"https://doi.org/10.1145/3724499"`
   - methodology: `"GPT-3 consumes a 500 mL bottle of water for roughly 10-50 medium-length responses, depending on when and where it is deployed. Includes scope-1 on-site cooling plus the water embodied in electricity generation, which is why it sits orders of magnitude above on-site-only figures for the same unit of work."`
3. `"GPT-3 training run (on-site)"` — `700000` L, `"per training run"`, `"lifecycle-onsite"` — same source and sourceUrl as entry 2
   - methodology: `"Scope-1 on-site water directly evaporated to cool Microsoft's U.S. data centres while training the 175-billion-parameter GPT-3 model."`
4. `"GPT-3 training run (total)"` — `5400000` L, `"per training run"`, `"lifecycle-total"` — same source and sourceUrl as entry 2
   - methodology: `"Total water footprint of training GPT-3: 5.4 million L, including the 700,000 L of scope-1 on-site consumption, with the remainder embodied in electricity generation."`
5. `"Bitcoin transaction"` — `16000` L, `"per transaction"`, `"lifecycle-total"`
   - source: `"de Vries (2023), Cell Reports Sustainability"`
   - sourceUrl: `"https://doi.org/10.1016/j.crsus.2023.100004"`
   - methodology: `"Average water footprint per Bitcoin transaction in 2021, combining data-centre cooling with water consumed by the power plants supplying the mining electricity."`

**Verification:** the file parses; the array length is 53; category counts are Food & Beverages 38, Textiles 6, Technology 1, Manufactured 3, Digital & Computing 5; every entry has all seven required fields.

---

## Task Group 3 — API

### [x] 3.1 Add the new slug to the Swagger query enum

- In `apps/api/src/modules/water-footprint/water-footprint.controller.ts`, add `'digital-computing'` to the `@ApiQuery` `enum` array.
- The service needs no change: it resolves slugs through `waterFootprintCategorySlugMap`.

**Verification:** `npx nx build api` succeeds; `GET /api/v1/water-footprint/products?category=digital-computing` returns the 5 new entries and `?category=bogus` still returns 400.

### [x] 3.2 Update API tests

- `apps/api/__tests__/water-footprint/water-footprint.service.test.ts` and `water-footprint.controller.test.ts`: fixtures must carry `waterType`; add coverage for the `digital-computing` slug.
- `apps/api/__tests__/water-footprint/water-footprint.module.test.ts`: the smoke assertion on `getAllProducts()` length moves 52 → 53.
- `apps/api/__tests__/app/app.module.test.ts`: update if it asserts a product count.

**Verification:** `npx nx test api` — zero failures, zero warnings.

---

## Task Group 4 — Web UI

Read `docs/design-system.md` before touching presentation.

### [x] 4.1 Fix sub-litre formatting in `apps/web/src/lib/waterFootprintEquivalents.ts`

- `formatLiters` currently uses `maximumFractionDigits: 1`, so `0.00026` renders as `"0"`.
- Render values below 1 L with enough significant digits to be readable, leaving values ≥ 1 L byte-identical to today's output.

**Verification:** `formatLiters(0.00026)` is not `"0"`; `formatLiters(1451.2)` is still `"1,451.2"`; `formatLiters(5400000)` is still `"5,400,000"`.

### [x] 4.2 Surface the water type in `WaterFootprintTable.tsx`

- Desktop table: add a "Water type" column rendering `waterFootprintWaterTypeLabels[product.waterType]`. It is not sortable — only name and footprint remain sortable.
- Mobile cards: add the same label as its own line.
- The sixth filter chip ("Digital & Computing") should appear automatically because `CATEGORIES` derives from `waterFootprintCategorySlugMap` — **verify this rather than assume it**, and confirm the per-pair `peer` isolation still holds with six options.

**Verification:** all six chips render, exactly one is marked active at a time, and each row shows its water-type label.

### [x] 4.3 Add the comparability note

- Render a short persistent note near the table stating that entries are measured on different bases and that values of different water types are not directly comparable.
- Place and style it consistently with the existing equivalents note in `WaterFootprintContent.tsx`.

**Verification:** the note is present on both desktop and mobile layouts.

### [x] 4.4 Update web tests

- `apps/web/__tests__/lib/waterFootprintEquivalents.test.ts`: cases for sub-litre formatting and for `formatWaterFootprintEquivalents(0.00026)`.
- `apps/web/__tests__/components/water-footprint/WaterFootprintTable.test.tsx` and its snapshot: `waterType` on fixtures, the new column, the sixth chip.
- `apps/web/__tests__/components/water-footprint/WaterFootprintContent.test.tsx` and `apps/web/__tests__/lib/water-footprint.test.ts`: fixture updates.
- `apps/web/__tests__/app/[category]/page.test.tsx` and its snapshot: regenerate.

**Verification:** `npx nx test web` — zero failures, zero warnings.

### [x] 4.5 Update the E2E spec

- `apps/web/e2e/water-footprint.spec.ts`: row count 52 → 53; the live-region assertion `Showing 6 of 52` → `Showing 6 of 53`; add a case for the Digital & Computing filter. Playwright uses `test(...)`.

**Verification:** `npx nx e2e web` passes.

---

## Task Group 5 — Specs and Docs

### [x] 5.1 Update the product count in `openspec/specs/api-cloud-run-deploy/spec.md`

- Three occurrences of 52 in the deploy-verification requirement and its scenarios move to 53.

**Verification:** `grep -rn "52" openspec/specs/` returns no water-footprint product-count references.

### [x] 5.2 Update `docs/data-sources/water-footprint.md`

- Add provider entries for Google (2025) arXiv:2508.15734, Li et al. (2025) CACM, de Vries (2023) _Cell Reports Sustainability_, and Gerbens-Leenes, Hoekstra & Bosman (2018) _Water Resources and Industry_, each with its licence note (papers are citable per data point with attribution, not redistributable).
- Record that the `"Water Footprint Network (various)"` and Apple Product Environmental Report citations were retired, and why.
- Add the water-type taxonomy to the Available Metrics section.

### [x] 5.3 Add Phase 5 to `docs/planning/water-footprint.md`

- Record the discriminator, the citation audit (3 corrected, 4 removed), the new category, and the new totals. Update the status line and "Last updated".

---

## Task Group 6 — Verification

### [x] 6.1 Full gate

- `npm run lint`
- `npm run build`
- `npm run test`
- `npx nx e2e web`
- `npx prettier --check` on every touched file

**Verification:** all green, zero warnings. Confirm no residual `52` product-count assertions anywhere: `grep -rn "52" --include="*.ts" --include="*.tsx" --include="*.md" apps packages openspec docs | grep -i water`.

### [x] 6.2 Manual check

- `npx nx serve api` + `npx nx serve web`, open `/water-footprint/`.
- Confirm: 53 rows, six filter chips, the AI inference row shows a readable sub-litre value rather than "0 L", the water-type column is populated on every row, and the comparability note is visible.
