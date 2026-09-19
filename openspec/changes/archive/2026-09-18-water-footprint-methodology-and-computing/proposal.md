# Proposal: Water Footprint — Methodology Discriminator, Citation Integrity, and Digital & Computing

## Context

The `/water-footprint/` category shipped in September 2026 with a 52-product table. Two defects in the dataset contract are now live in production.

**1. Methodology mixing.** `WaterFootprintProduct` carries a single `waterFootprintLiters` number with no field stating _what that number measures_. The table defaults to sorting by footprint descending across the whole dataset, so it ranks Poore & Nemecek **blue-water-only** values against Mekonnen & Hoekstra **green + blue + grey** totals. The visible result is that "Cotton (lint) — 4,030 L/kg" outranks "Beef (beef herd) — 1,451 L/kg", implying cotton needs ~3× the water of beef. That is an artifact of measurement scope, not a fact: on the Mekonnen & Hoekstra basis beef is ~15,400 L/kg. The table currently misinforms.

**2. Unverifiable citations.** Seven entries render clickable source links that do not support their stated value:

- Five `Manufactured` entries cite `"Water Footprint Network (various)"` — not a traceable citation, and `docs/data-sources/water-footprint.md` flags the Water Footprint Network as "⚠️ Solo no comercial (verificar)".
- Two `Technology` entries (Smartphone, Laptop) cite Apple Product Environmental Reports for per-device water, while that same provider doc states Apple PERs report water at corporate/supply-chain level, **not per device**.

Separately, the category has no coverage of the water cost of computing — currently the most-discussed water topic in the literature, and one where the on-site vs. total scope distinction is the whole story. That makes it the natural first consumer of the new discriminator.

## Goals

- Add a `waterType` discriminator to `WaterFootprintProduct` (`blue` | `green-blue-grey` | `lifecycle-onsite` | `lifecycle-total`) and tag every dataset entry.
- Surface the water type in the table and cards, and warn that values of different types are not directly comparable.
- Correct the three construction-material entries against a traceable peer-reviewed source, and remove the four entries no primary source supports.
- Add a `Digital & Computing` category with five entries covering AI inference, AI training, and Bitcoin — each pairing an on-site figure with a total figure so the scope distinction is visible in the data itself.
- Make `formatLiters` render sub-litre values readably; without it the AI inference rows display "0 L".

## Non-Goals

- **No new external data provider integration.** The dataset stays a static, versioned JSON file. WRI Aqueduct 4.0, OWID grapher fetching, and any live API remain out of scope.
- **No water-per-kWh dataset.** The NREL life-cycle water-per-MWh figures (Macknick et al. 2012; Meldrum et al. 2013) are a separate change.
- **No lithium / mining entries.** Salar de Atacama and Argentine salt-flat water footprints are a separate change.
- **No macro statistics.** Figures without a functional unit (e.g. 66 billion L/year for US data centres, global AI withdrawal projections) do not belong in a per-unit product table.
- **No scarcity weighting.** AWARE / scarcity-weighted variants are a separate change.
- **No re-derivation of values.** Every number is transcribed verbatim from its cited source; no averaging, midpointing, or unit-conversion arithmetic of our own.
- **No category slug renames.** `Technology` stays as-is even though it drops to a single entry; merging it into the new category would break the published API contract.
- **No sorting restrictions.** Cross-methodology sorting stays available; the fix is disclosure (a visible water-type column plus a comparability note), not blocking the interaction.

## Impact

| Area                                                                       | Change                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared/src/lib/water-footprint.ts`                               | New `WaterFootprintWaterType` union; new required `waterType` field on `WaterFootprintProduct`; `'Digital & Computing'` added to `WaterFootprintCategory`; `'digital-computing'` added to `waterFootprintCategorySlugMap`; new `waterFootprintWaterTypeLabels` map |
| `packages/shared/src/index.ts`                                             | Export the new type and label map                                                                                                                                                                                                                                  |
| `apps/api/src/modules/water-footprint/data/water-footprint.json`           | 52 → 53 entries: 3 corrected, 4 removed, 5 added, all 53 tagged with `waterType`                                                                                                                                                                                   |
| `apps/api/src/modules/water-footprint/water-footprint.controller.ts`       | `'digital-computing'` added to the `@ApiQuery` enum                                                                                                                                                                                                                |
| `apps/web/src/components/water-footprint/WaterFootprintTable.tsx`          | New "Water type" column (desktop) and card line (mobile); sixth filter chip; comparability note                                                                                                                                                                    |
| `apps/web/src/lib/waterFootprintEquivalents.ts`                            | `formatLiters` must render values below 1 L readably                                                                                                                                                                                                               |
| `apps/api/__tests__/`, `apps/web/__tests__/`, `packages/shared/__tests__/` | Unit and snapshot updates for the new field, new category, and new counts                                                                                                                                                                                          |
| `apps/web/e2e/water-footprint.spec.ts`                                     | Row-count and live-region assertions 52 → 53                                                                                                                                                                                                                       |
| `openspec/specs/api-cloud-run-deploy/spec.md`                              | Deploy-verification product count 52 → 53                                                                                                                                                                                                                          |
| `docs/data-sources/water-footprint.md`                                     | New providers; record why the retired citations were retired                                                                                                                                                                                                       |
| `docs/planning/water-footprint.md`                                         | Phase 5 section                                                                                                                                                                                                                                                    |

**Breaking change:** `waterType` is a required field. Any consumer constructing a `WaterFootprintProduct` must supply it. The only consumers are in this repo.

**Category counts after the change (53 total):** Food & Beverages 38 · Textiles 6 · Technology 1 · Manufactured 3 · Digital & Computing 5.
