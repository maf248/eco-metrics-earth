# Design: add-deforestation-module

Read first: `AGENTS.md` ("Adding an OWID-backed category", "Multi-provider categories use sectioned pages", Known Constraints), `docs/design-system.md` (Color Palettes, Visualization Heuristics, Chart rules 1 to 12, World map conventions, Degraded provider states), and the archived changes `2026-11-25-add-ocean-health-module` (sectioned page, one endpoint per source) and `2026-10-25-add-co2-emissions-module` (explorer, map, ranking). Facts below were probed live on 2026-11-26.

## 1. Architecture at a glance

```
OWID grapher CSV  forest-area-km                         (tab=chart, countries, 1990..)  ─┐
OWID grapher CSV  forest-area-as-share-of-land-area      (tab=chart, countries, 1990..)  ─┼─► ForestAreaService ─► snapshot `deforestation-forest-area`
OWID indicator metadata 1129226, 1132530                                                  ─┘          │
OWID grapher CSV  tree-cover-loss-by-dominant-driver     (tab=chart, countries, 2001..)  ─┐          ▼
OWID indicator metadata 1104660 (one of the seven)                                        ─┴─► TreeCoverLossService ─► snapshot `deforestation-tree-cover-loss`
                        GET /api/v1/deforestation/forest-area        GET /api/v1/deforestation/tree-cover-loss
                                  (envelope, meta.source = OWID, origin = FAO FRA 2025)   (envelope, origin = WRI / Google DeepMind)
web: deforestation.ts (2 x fetchProviderPayloadFromBff) ─► defineSectionedProviderCategoryPage
     ─► DeforestationContent: intro, key figures, [forest area explorer, change map + ranking], [tree cover loss by cause], methodology
```

The unit of resilience is the **section**, as in `ocean-health`: one endpoint, one snapshot key, one `meta` and one freshness state per section. Both sections read the same upstream provider (OWID), so independence is per endpoint and per snapshot: a failure of one chart, its metadata or its parsing leaves the other section intact, but a complete OWID outage degrades both (each then falls back to its own snapshot).

## 2. Decisions

**Decision 1. Two endpoints, not one.** One envelope has one `meta.source`, one snapshot and one `502`; the two sources have different origins, update schedules (FAO 2025-12-05, next 2026-12-05; GFW 2025-08-26, next 2026-12-27), licences to credit and failure modes. Routes: `forest-area` (FAO: feeds key figures, explorer, map and ranking) and `tree-cover-loss` (GFW drivers). Snapshot keys: `deforestation-forest-area`, `deforestation-tree-cover-loss`. Neither takes parameters. Because the controller and both services live in one module, `DeforestationModule` imports `OwidModule` and `SnapshotsModule` and is imported by `AppModule`.

**Decision 2. No change to `OwidClient`.** `getGrapherSeries(slug, { tab, country, timeRange, column })` caches the whole parsed table under a key that excludes `column`, so the seven GFW columns cost one download (seven selects of the cached table). All three charts MUST be requested with `tab: 'chart'`: probed live, `forest-area-km` and `forest-area-as-share-of-land-area` open on their map tab and, without it, ignore `country` and answer with a single year (399 lines for all countries, one year). `tree-cover-loss-by-dominant-driver` gives the same output either way; it is requested with `tab: 'chart'` too, so the three behave alike. `country` is the allowlist from `listCountryEntityCodes()` (countries, Kosovo, World; this is what excludes OWID regions and income groups), `timeRange` is `{ from: 1990, to: <current UTC year> }` for the FAO charts and `{ from: 2001, ... }` for GFW. Assembly goes through `buildYearAlignedEntities` (multi-measure, drops entities with no value, requires World), exactly like CO2 and energy sources.

**Decision 3. Forest area share: use `forest-area-as-share-of-land-area`, restricted to 1990 onwards.** The OWID citation of this chart reads "DEFRA (2013) and other sources" and the series reaches back to the year 1000, because OWID combines historical reconstructions with FAO. Its own processing note says FAO FRA data "is used for the 1990 onwards" and the land area is the FAO Land Use variable. This was checked against the area chart: for all 218 countries with both series, `forest area / (share / 100)` (the implied land area) is constant across 1990 to 2025 (variation below 2%, in practice none; World 12,976 million ha every year). So the 1990+ share is the FAO forest area over a fixed FAO land area, and it is consistent with the hectares series. Alternatives (deriving the share needs a land area that only this chart exposes; a different slug does not exist) are rejected in section 6. Consequences: the request starts at 1990 so no pre-1990 historical estimate is ever read; the credited origin is FAO FRA 2025, and the data sources entry for the origin says the OWID chart also contains pre-1990 estimates from other sources that this site does not use; the service guards the assumption: the World implied land area (`area / (share / 100)`) must be within 1% across all years, otherwise `ProviderDataError` (a re-based land area must not silently become a mislabelled measure); `ForestAreaData.dataset` is taken from the area indicator (`Global Forest Resources Assessment`, version `2025-12-05`), not from the share indicator (`Historic forest cover estimates from combined sources`).

**Decision 4. FAO series not used.** `annual-change-forest-area` repeats a per-period average on each year of the period, so a yearly chart of it would show steps that look like annual data; `annual-deforestation` only has 1990, 2000, 2010, 2015 and 2020, and its period (annual average over the preceding period) is ambiguous in a table. Both can be recovered, correctly and with the right caveats, from the area series (net change between two years is a difference of two values), which the page already does for the map and ranking. They stay out of scope.

**Decision 5. Net change is derived in the web, not served.** `ForestAreaData` serves year-aligned `area` (hectares) and `share` (% of land) per entity. Net change (hectares, % of the first year) is a pure function of the area array and the payload's `startYear` / `endYear`, computed in `lib/forestChange.ts` and used by the key figures, the map and the ranking, so the three can never disagree (same rule as the CO2 ranking, which derives from the same payload).

**Decision 6. Net change definition and edge cases.** For an entity, with `first = area[0]` (the value of `startYear`, 1990) and `last = area[endYear - startYear]`: net change in hectares is `last - first` when both are non-null; percent change is `(last - first) / first * 100` when both are non-null and `first > 0`. `first = 0` (probed: Falkland Islands, Tokelau, Monaco, Gibraltar, Svalbard and Jan Mayen, Vatican, Nauru) leaves the percentage undefined: no map value (no-data) and an em dash in the table; the hectares change is still shown (0 for these). A missing first or last value leaves both undefined (nothing is probed missing today: all 235 country codes have both years; the rule exists so a future provider change cannot produce `NaN`). Territorial changes: FRA 2025 reports every country within today's borders for the whole period (Sudan and South Sudan both have 1990 values, 28.1 and 7.1 million ha; the USSR and Kosovo have none and are not in the allowlist or have no values), so no entity needs splitting or merging. Classification into map classes uses the percentage rounded to one decimal, the value the table prints, so a value is never shown as "-5.0%" in the class that ends at -5.

**Decision 7. Ranking: countries only, percentage threshold.** The ranking rows are every entity except World (the allowlist already removed OWID regions). Columns: rank `#`, Country (flag, name, toggle button sharing the map selection), Net change (thousand ha) and Change (% of 1990). Default order: net change in hectares, most loss first. The hectares column ranks every country with a defined hectares change. The percentage column shows the value for every country where it is defined, but a country is **ranked by percentage only when its 1990 forest area was at least 1,000,000 ha** (`RANKING_MIN_FIRST_AREA_HA`). When the table is sorted by percentage, ranked rows come first, in the chosen direction, and every row below the threshold (or without a percentage) follows, in name order, whatever the direction, with an em dash in the `#` column. A note under the table, derived from the data, says: "Percentage change is ranked only for countries with at least 1 million hectares of forest in 1990 (N countries are listed after the ranked ones)." This keeps one value per country on the map and in the table (no hidden rows, no value that differs between map and table), while micro-states never head the percentage ranking (Nauru, Tokelau). With the threshold, the probed top of the percentage loss ranking is Burkina Faso (-61%), Benin (-55%), Cote d'Ivoire (-55%); the hectares top is Brazil (-132.4 million ha, -21%), DR Congo (-21.4), Indonesia (-20.4), Tanzania (-14.8), Angola (-14.3), Myanmar (-12.1), Paraguay (-11.4, -44%); the largest gains are China (+70.0) and Russia (+21.0).

**Decision 8. Map.** One `ChoroplethMap` of `% change since the first year`, countries only, no year slider (a single comparison, not a series). It takes a new ramp `divergent`: seven fixed classes centred on 0, `< -50`, `-50 to -25`, `-25 to -5`, `-5 to +5`, `+5 to +25`, `+25 to +50`, `>= +50` (percent), loss in the warm arm and gain in the cool arm (hue pairing: resolved decision 3 in section 8), the middle class a low-chroma neutral that is validated as distinct from the no-data grey. Every legend label is only its signed range: the middle class reads "−5 to +5%", with no "Little change" wording (user decision, 2026-11-27). Found while validating: clearing the selection from the table left the region outlined, because ECharts keeps the selection outside the option and `setOption` merges; the CO2 and waste maps had the same latent bug. Fixed once for every map: builders write `selected` explicitly on every item and `ChoroplethMap` syncs the chart through `select` / `unselect` actions after each option change. The HTML legend (`MapLegend`) names every class and "No data" (a country without a percentage: no first value, or first value 0). The tooltip shows the country, the percentage with its sign and the net change in hectares. The ranking table (Decision 7) is the text equivalent, collapsed under "View data table" in the same card, with the shared selection, as for CO2. The map is below the explorer, as the CO2 page puts it.

**Decision 9. Explorer.** `CountryExplorer` with World selected by default; a `MeasureToggle` "Hectares / % of land", hectares first. A line chart of the selected entity's series 1990 to the latest year, its `YearDataTable` (the full-hectare values in thousand hectares, newest first, or the percentage, "Tables follow the toggle"), a live region, `DataAttribution` with `OriginCredit`. The value axis follows the data (chart rule 12, like the pH and sea surface charts), padded: the whole-world series moves by 4.7% in 35 years, so a zero baseline would draw a flat line, while the key figures and the tooltip carry the exact values and the chart says in its subtitle that the axis does not start at zero. Unit of the hectares axis: million hectares when the entity's maximum is at least 1 million ha, otherwise thousand hectares (the unit is part of the axis name; the chart remounts through `chartKey` when it changes). Percent axis in "% of land area".

**Decision 10. GFW stacked bars.** `lib/treeCoverLossChartOption.ts`: a pure, color-free builder, one `bar` series per driver (`stack: 'loss'`), a category year axis 2001 to the latest year, the seven drivers always present in the option so colour follows the entity, a semantic palette of existing tokens only (no new CSS custom property), like the waste palettes: `CHART_TREE_COVER_LOSS_TOKENS` in `chartTokens.ts`, selected with the chart `palette` `treeCoverLoss`, in the fixed stacking order below (the generic categorical palette painted Wildfire green and was rejected; no cause is green, wildfire is red, agriculture yellow and sand, logging brown, mining and built-up land charcoal and violet, other natural disturbances teal; the assignment was chosen with the palette validator over every pair in both themes and its numbers and exceptions are recorded in the design system), a wrapped legend, a tooltip listing the year, each driver with a value and the total, and the unit "million hectares" (values converted for display, never in the payload). Stacking order (bottom to top), the order GFW and OWID list them in, grouped as the source groups them (not a regrouping): Permanent agriculture, Hard commodities, Settlements and infrastructure, Shifting cultivation, Logging, Wildfire, Other natural disturbances. A `null` driver value draws no segment and is "No value" in the tooltip and an em dash in the table, never 0. The country selector is a `CountryExplorer` of its own (state independent of the forest explorer; World default). Below the fold: `RenderWhenVisible`. The text equivalent is a `YearDataTable` (`wide`) with a column per driver plus a "Total" column, newest first.

**Decision 11. Tree cover loss total and nulls.** Probed: across all 4,714 country-years, the sum of the non-blank driver cells equals OWID's `tree-cover-loss` total within 1.4e-7 relative, and 2,650 country-years have at least one blank driver (shifting cultivation blank in 2,198 of 4,750 rows). A blank driver therefore means "no loss attributed to this driver" in the source's own arithmetic. The payload still carries `null` (the contract of every series here: no value is not zero), the total is derived in the web as the sum of the non-null drivers of that year and is `null` only when every driver is `null`, and tooltip and table print an em dash for a blank driver. The table's note says: "A dash means the source lists no loss for that cause."; it does not say "zero". The separate `tree-cover-loss` chart is not requested.

**Decision 12. Labels.** Source names are served by the API (`drivers: [{ id, name }]`, the order is the stacking order), so the web never hardcodes them. Names: "Permanent agriculture", "Hard commodities (mining and energy)", "Settlements and infrastructure", "Shifting cultivation", "Logging", "Wildfire", "Other natural disturbances". "Hard commodities" is GFW's term and OWID's column short name, while OWID titles the same column "Mining and energy industry" and its description reads "mining or energy infrastructure"; keeping GFW's term with the plain-language gloss in parentheses is faithful and understandable (resolved decision 5 in section 8). "Wildfire" is not "natural fires": the source defines it as fire "with no visible human conversion or agricultural activity afterward", started by natural causes or by people.

**Decision 13. Key figures (decision from the user, 2026-11-27).** Server-rendered `<p>` with `<strong>` numbers, derived from the World entity of the `forest-area` payload, never hardcoded:

> Since 1990 the world has lost a net **203 million hectares** of forest, an area the size of Mexico. Forests now cover **31.9%** of the world's land.

Rules: `1990` is the payload's `startYear`; the million-hectare figure is `abs(net change)` in million hectares rounded to an integer, formatted `en-US`; "lost a net" when the World net change is negative, "gained a net" (and no Mexico clause) when positive, "Since {startYear} the world's forest area has hardly changed" when the rounded figure is 0; "31.9%" is the World `share` of the latest year with one decimal. The clause ", an area the size of Mexico" appears only for a net loss whose rounded value is within `[MEXICO_CLAUSE_MIN_MHA, MEXICO_CLAUSE_MAX_MHA]` = `[180, 215]` million ha (user decision, 2026-11-27). Mexico's reference area is 196.4 million ha (1,964,375 km² total area, INEGI; about 194 million ha of land area): the range is about -8% to +9% around it, so "the size of" never overstates the comparison. Both constants and the reference live in one constants file with a comment citing the reference. If the World entity or either value is missing, the paragraph is omitted (the section's own state shows the reason).

**Decision 14. Sectioned page.** `defineSectionedProviderCategoryPage` with two sections, `forestArea` and `treeCoverLoss`, each `provider: { name: 'Our World in Data' }` and its own `load` (`fetchProviderPayloadFromBff`). Page order: intro line; the key figures panel (derived from `forestArea` only; omitted when that section has no payload); the forest area card (`<h2>` "Forest area": stale notice, then explorer) and the change card (`<h2>` "Forest change since 1990": map and ranking), both fed by the `forestArea` state; the cause card (`<h2>` "Tree cover loss by cause"), fed by the `treeCoverLoss` state; the methodology note (static, never provider-dependent). With the `forestArea` state unavailable, one `DataUnavailable` replaces the explorer and the change card under the "Forest area" heading (the change card is not rendered), and the stale notice, when applicable, shows once above the explorer. With the `treeCoverLoss` state unavailable, only the cause card shows `DataUnavailable`. `isDegraded` (page leaves the 24 h cache within minutes) follows the existing rule.

**Decision 15. Provenance and credit.** Static `DataSourceOrigin` constants, registered through `OwidProviderStatus.registerCategory('deforestation', origins)` in each service's constructor (never a second OWID catalog entry) and served in `data.origin`:

| Origin               | producer                                                            | title                                                  | licence   |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ | --------- |
| `FAO_FRA_ORIGIN`     | Food and Agriculture Organization of the United Nations             | Global Forest Resources Assessment 2025                | CC BY 4.0 |
| `GFW_DRIVERS_ORIGIN` | World Resources Institute and Google DeepMind (Global Forest Watch) | Tree cover loss by dominant driver (Sims et al., 2025) | CC BY 4.0 |

The GFW origin's `notice` is the credit the dataset's licence metadata requires, "Tree cover loss by dominant driver" (verified through the GFW Data API record of `wri_google_tree_cover_loss_drivers`), with the citation; `OriginCredit` renders it next to the chart. The exact URLs, citation and notice texts are verified against the producers' pages while writing the constants (task 3), and a mismatch with this table stops the task. The Hansen/UMD tree cover loss dataset (`umd_tree_cover_loss`, also CC BY 4.0, data derived from it) is not a separate origin: the drivers dataset is the product shown. Licences are per dataset: other GFW datasets may differ, and `docs/data-sources/deforestation.md` says so.

**Decision 16. Meta, home, sitemap, skeletons, JSON-LD.** Registering the skeleton in `CATEGORY_SKELETONS` makes the category live (home card, sitemap entry, no `noindex`). Meta description (158 characters): "Forest area by country since 1990, a map and ranking of forest change, and tree cover loss by cause. Data from FAO, Global Forest Watch and Our World in Data." Title override: "Forest Area & Tree Cover Loss by Country" (the word "Deforestation" stays in the visible `<h1>` and the URL; the title does not claim that tree cover loss is deforestation). Home summary (92 characters): "How much forest each country has lost or gained since 1990, and what causes tree cover loss." One `Dataset` JSON-LD for the page built from the sections present (rule 8): name "Forest area and tree cover loss by country", temporal coverage from the earliest start to the latest end, `variableMeasured` per present section, `isBasedOn` through `buildSourceWork` for each present origin; an unavailable section contributes nothing and with none present no JSON-LD is rendered.

**Decision 17. Freshness.** Defaults (`silentDays: 7`, `noticeDays: 30`) for both sections: the sources update once a year, and `meta.fetchedAt` reflects retrieval, not the data year. `meta.source.lastUpdated` is OWID's own `updatedAt` of the indicators read (the latest of the two for the forest area), `lastUpdatedBasis: 'provider'`, as for the other OWID categories.

**Decision 18. Divergent palette.** `docs/design-system.md` keeps the divergent palette pending until the first change that encodes polarity with colour; this is that change. Seven tokens `--chart-div-1 … --chart-div-7`, loss end to gain end, with `--chart-div-4` the neutral middle, declared in hex on `:root` and `.dark`, read by name by the theme adapter, not mapped in `@theme inline`, listed in `CHART_RAMP_TOKENS` under the ramp `divergent`. Validation (the palette validator, ordinal mode, as for the sequential ramps): lightness is monotonic towards the middle on each arm, rising towards it in the light theme (light middle, dark extremes on white) and falling towards it in the dark theme (the neutral middle is the darkest class and lightness and chroma increase towards both extremes, so "little change" never becomes the most salient area on black), and the arms are mirror-like (equal step counts), every adjacent gap at least 0.06 OKLCH L, adjacent OKLab ΔE×100 at least 8 under protan, deutan and tritan simulation, the middle class separated from `--chart-no-data` by ΔE×100 of at least 15 in both themes, and the contrast of every class against the surface recorded with its exceptions (as for the heat ramp). The values are chosen by the coder with the validator and recorded in the design system table in the same change; the spec fixes the structure and the checks, not the hex values. A polarity encoded by colour is always doubled by the legend text, the signed values in the tooltip and the table.

**Decision 19. E2E fixtures.** The OWID fixture server gains `forest-area-km.csv`, `forest-area-as-share-of-land-area.csv`, `tree-cover-loss-by-dominant-driver.csv` and the indicator metadata `indicator-1129226-metadata.json`, `indicator-1132530-metadata.json`, `indicator-1104660-metadata.json`, trimmed real captures recorded once from the exact URLs the API uses (`v=1&csvType=filtered&useColumnShortNames=true&tab=chart`, plus `country` and `time`), documented in `apps/web/e2e/fixtures/owid/README.md`. Entities: World, Brazil, China, Russia (blank GFW drivers and the boreal fire peak), Argentina, a country whose 1990 forest area is 0 (Nauru), a country under the 1 million ha threshold with a non-zero 1990 value, Sudan and South Sudan, plus enough others for the ranking to show ranked and unranked rows; each present in the map geometry. The fixture's World values keep the real figures (4,343,532,500 ha in 1990, 4,140,214,500 in 2025, 33.47% and 31.91%), so the E2E key figures read the sentence of Decision 13.

## 3. Wire types (`packages/shared/src/lib/deforestation.ts`)

```ts
import type { CountryEntity, DatasetIdentity } from './country-series';
import type { DataSourceOrigin } from './data-sources';

/** One forest area entity (a country or World), year-aligned: index i is `startYear + i`. */
export interface ForestAreaEntity extends CountryEntity {
  /** Forest area in hectares (integers). */
  area: (number | null)[];
  /** Forest area as a percentage of land area, rounded to 2 decimals. */
  share: (number | null)[];
}

/** Payload of `GET /api/v1/deforestation/forest-area`. */
export interface ForestAreaData {
  startYear: number; // 1990
  endYear: number; // latest year with a value
  units: { area: string; share: string }; // 'hectares', '% of land area'
  dataset: DatasetIdentity; // from the area indicator
  origin: DataSourceOrigin; // FAO FRA 2025
  entities: ForestAreaEntity[]; // World first, then countries by name
}

/** Stacking order, bottom to top. */
export const TREE_COVER_LOSS_DRIVER_IDS = [
  'permanentAgriculture',
  'hardCommodities',
  'settlementsInfrastructure',
  'shiftingCultivation',
  'logging',
  'wildfire',
  'otherNaturalDisturbances',
] as const;
export type TreeCoverLossDriverId = (typeof TREE_COVER_LOSS_DRIVER_IDS)[number];

export interface TreeCoverLossDriver {
  id: TreeCoverLossDriverId;
  name: string; // source label, e.g. 'Hard commodities (mining and energy)'
}

/** Hectares lost per year by driver; `null` = no value (not 0). */
export type TreeCoverLossEntity = CountryEntity & Record<TreeCoverLossDriverId, (number | null)[]>;

/** Payload of `GET /api/v1/deforestation/tree-cover-loss`. */
export interface TreeCoverLossData {
  startYear: number; // 2001
  endYear: number; // 2024
  unit: string; // 'hectares'
  dataset: DatasetIdentity;
  origin: DataSourceOrigin;
  drivers: TreeCoverLossDriver[]; // stacking order
  entities: TreeCoverLossEntity[]; // World first, then countries by name
}
```

Values of the GFW drivers are rounded to whole hectares (loss is detected on 30 m cells of about 0.09 ha; a value below 0.5 ha rounds to 0, which stays 0, not `null`). The shapes are the contract; helper names are free, field names are not. Payload size is about 35,000 driver cells (209 entities, 7 drivers, 24 years), comparable to the CO2 payload.

## 4. Accuracy and wording

The user asked that no figure be shown confusingly and no wording be inaccurate. Every label was checked against the source metadata. Decisions are numbered in section 2; the questions raised while writing are resolved in section 8.

1. **Net, not gross.** FAO forest area is net: deforestation and natural loss minus forest expansion and plantations. The change over 1990 to 2025 (-203.3 million ha) is far smaller than gross deforestation. "Has lost a net 203 million hectares" is the user's decision (Decision 13) and keeps "net". Everywhere the net quantity appears the word "net" or "change" appears: map "Change in forest area since 1990", ranking column "Net change", methodology note.
2. **FAO's definition of forest** (from the source): land with tree canopy cover above 10%, over 0.5 ha, with trees able to reach 5 m, natural forests and plantations included, land under agricultural or urban use excluded. A plantation counts as forest, so the series can rise while natural forest falls. The methodology note and the explorer subtitle say "including plantations".
3. **Interpolated years.** FAO reports forest area at reference years (typically every 5 to 10 years); OWID linearly interpolates the years between (OWID's processing note; Sudan 1990 to 2000 changes by exactly 174,140 ha every year). The explorer's subtitle says "FAO reports at intervals of 5 to 10 years; the years in between are interpolated", so a bend in the line is not read as an event in a year, and no sentence compares single years. This also applies to the share series (OWID states it interpolates it).
4. **"Of the world's land".** The share is forest area divided by land area (FAO land area, excluding inland water; World 12,976 million ha), so "31.9% of the world's land" is the right reading. "Now" means the latest assessment year (2025); the explorer table and the methodology note state the year range. The section subtitle reads "% of land area".
5. **Never "deforestation" for GFW.** The section is "Tree cover loss by cause"; units, legend, tooltip, table and alt text say "tree cover loss". GFW measures loss of tree cover seen from satellites: it includes loss in plantations, fires, logging and natural disturbance, much of which regrows, and it is not net of gain.
6. **Subtitle of the cause section (exact text):** "Tree cover loss detected by satellite each year, by dominant cause, in million hectares. It is not the same as deforestation: loss from fires and logging is often followed by regrowth." Footnote under the chart: "Each cause is the dominant one for a patch of about 1 km, so the split is approximate. Detection methods improved between 2011 and 2015, which may make recent years look higher than earlier ones." (the second sentence is OWID's own note on the chart). The legend entries carry the source names; the 2024 fire peak (wildfire 13.9 million ha, boreal fires in Russia and Canada) is data, not an error, and is not annotated.
7. **Driver wording** (Decision 12): source terms kept, "Hard commodities" glossed. No colour or label implies "good" or "bad"; the seven colours are the semantic `treeCoverLoss` palette (never green, wildfire red), not the heat ramp and not the generic categorical palette. The forest area line chart's value axis prints unique labels in the axis unit with thousands separators and no compact suffix ("4,350", never "4.4K" on a value in million hectares), with as many decimals as the data range needs so adjacent ticks never repeat, and one decimal plus "%" for the share.
8. **Two sources, two measures.** Methodology note (exact text): "Forest area comes from the FAO Global Forest Resources Assessment 2025: national reports of the net change in forest land use, with years between reports interpolated. Tree cover loss comes from Global Forest Watch: loss of tree cover detected by satellite since 2001, including loss that later regrows. The two measure different things, so they cannot be compared or added together." The page never shows a figure that mixes them.
9. **Missing and special values.** Countries with no first value or a first value of 0 have no percentage (no-data on the map, em dash in the table); the table note about the 1 million ha threshold (Decision 7); `null` is never 0 (Decision 11); signed values use the real minus sign (U+2212) and an explicit plus, as the design system's "Anomalies are signed" rule, in the map tooltip, legend labels, ranking and the percentage tooltip.
10. **National methods.** Some large national changes reflect improved national inventories or reclassification, not only change on the ground (FAO states this in its assessment). The methodology note adds: "Some national changes partly reflect better inventories or revised definitions." (no country is named).
11. **Borders.** FRA 2025 reports every country within today's borders for the whole period (Decision 6), so no country needs a territorial caveat; the methodology note does not need one either.
12. **Units.** Payload hectares; chart axes in million hectares (or thousand hectares for entities under 1 million ha); tables in thousand hectares with a unit in the header (never mixed units inside one column); key figures in million hectares; percentages with one decimal. Hectare figures in text use `en-US` grouping (server and client agree).
13. **Truncated axis.** The explorer's line chart does not start at zero (Decision 9) and says so; the stacked bars start at zero (chart rule 12).
14. **Provider independence is per endpoint.** The page keeps working per section, but a complete OWID outage degrades both sections (Decision 14); the copy of the unavailable state names OWID, which is what the provider name of both sections is.
15. **Percent change on the map is relative to 1990 forest.** A small percentage of a large forest is a large area (Brazil -21%, -132 million ha) and a large percentage of a small forest is a small area (Paraguay -44%, -11 million ha); the map and the ranking are separate measures and the tooltip shows both.

## 5. File structure

```
apps/api/src/modules/deforestation/
  deforestation.constants.ts        # slugs, columns, indicator ids, origins, units, decimals, snapshot keys
  deforestation.controller.ts       # GET forest-area, GET tree-cover-loss
  deforestation.module.ts
  forest-area.service.ts            # buildForestAreaData (pure) + service
  tree-cover-loss.service.ts        # buildTreeCoverLossData (pure) + service
apps/api/src/app/app.module.ts      # import DeforestationModule
packages/shared/src/lib/deforestation.ts   # + export from src/index.ts
apps/web/src/
  lib/deforestation.ts              # server-only reads + shape guards
  lib/forestChange.ts               # net change, percent change, classes, ranking rows (pure)
  lib/deforestationKeyFigures.ts    # sentence builder (pure)
  lib/deforestationStructuredData.ts
  lib/forestAreaChartOption.ts, lib/forestChangeMapOption.ts, lib/treeCoverLossChartOption.ts
  lib/categoryPages.tsx, categorySkeletons.ts, categoryMetadata.ts, liveCategories.ts   # edits
  components/deforestation/{DeforestationContent,ForestKeyFigures,ForestAreaSection,ForestChangeSection,
                            ForestRankingTable,TreeCoverLossSection,DeforestationMethodology}.tsx
  components/charts/{chartTheme.ts,chartTokens.ts,ChoroplethMap.tsx,MapLegend.tsx}   # divergent ramp
  app/globals.css                   # --chart-div-1..7
apps/web/e2e/deforestation.spec.ts, fixtures/owid/*, utils/{pages.ts,owid-fixture-server.ts}
docs/{data-sources/deforestation.md,design-system.md}, ROADMAP.md, AGENTS.md, READMEs,
postman/collections/Our World in Data ... .postman_collection.json
```

## 6. Alternatives considered

- **One aggregate `/deforestation` endpoint.** Rejected (Decision 1), same reason as ocean health.
- **Derive the share from `area / land area`.** The land area is only available through the share chart, so deriving it would reproduce the same data through an extra, indirect step; reading the share chart and guarding its consistency (Decision 3) is simpler and honest.
- **Use `forest-area-as-share-of-land-area` unrestricted.** Rejected: pre-1990 values come from historical reconstructions (DEFRA and others), a different measure, with a different citation and licence trail.
- **FAO annual deforestation and net change rate** (Decision 4). Rejected.
- **A "total tree cover loss" series from `tree-cover-loss`.** Rejected (Decision 11): derived from the drivers it equals the published total, one fewer request and one fewer thing that can disagree.
- **Regroup drivers into permanent and temporary.** Rejected by the user's decision (all seven as published); the source's own grouping is reflected only by the stacking order.
- **Hide below-threshold countries in the ranking.** Rejected (Decision 7): the map and the table would show different sets and a user could not find a country.
- **Zero as the explorer's axis baseline.** Rejected (Decision 9): the world line would look flat; the exact figures are in the key figures, tooltip and table.
- **Recolour the map with the heat ramp.** Rejected: loss versus gain is polarity around 0, which the heat ramp cannot encode; this is the case the pending divergent palette was reserved for.
- **Per-section `loading.tsx` or `<Suspense>`.** Rejected by Known Constraints.
- **Reading all seven GFW indicator metadata.** Rejected: the seven columns share one dataset (one `updatedAt`, one version); one read gives the identity and unit, and a changed column set already fails the CSV selection.

## 7. Risk assessment

| Risk                                                                       | Mitigation                                                                                                                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OWID re-bases the share chart (different land area) or changes its history | World implied land area guard (Decision 3): `ProviderDataError`, the section serves its snapshot or the unavailable state, never a mislabelled measure. Fixture-based tests pin it. |
| OWID renames a column or reorders the GFW CSV                              | Columns are selected by explicit short name; an unknown column is an `OwidInvalidParameterError` (502 contract); order is irrelevant.                                               |
| `tab=chart` omitted for a chart that opens on its map                      | Constants carry `tab: 'chart'`; a service test asserts the request URL; the builder rejects a World series shorter than a minimum number of years, as the anomaly builder does.     |
| 35,000-cell GFW payload is heavy for the client                            | Compact year-aligned arrays; whole hectares; deferred with `RenderWhenVisible`; E2E checks no overflow at 360 px. The CO2 payload has the same order of magnitude.                  |
| The divergent palette fails the validator for some hue pair                | The coder runs the validator, tries the recorded fallback pairing (section 8, item 3), and records any exception in the design system; the structure and checks are in the spec.    |
| Key figures overstate "size of Mexico" if the data changes                 | The guarded range (Decision 13); out-of-range omits the clause.                                                                                                                     |
| Mixed-unit confusion (hectares, thousand, million)                         | One unit per axis, per column and per sentence (accuracy 12); unit tests assert the headers.                                                                                        |
| A stale snapshot lingers in the Next Data Cache after a contract change    | Deploy API before web, as for every payload change (Known Constraints).                                                                                                             |
| A first-ever failure with no snapshot                                      | `502` and the unavailable state, as for every category.                                                                                                                             |

## 8. Resolved questions (user decisions, 2026-11-27)

All questions raised while writing were accepted with the recommended option:

1. **"Now" in the key figures:** kept ("Forests now cover 31.9%"); the section, table and methodology state the year range.
2. **Plantations:** no footnote under the key figures; the methodology note and explorer subtitle say "including plantations".
3. **Divergent hue pairing:** loss in the warm arm (red to orange), gain in the cool arm (blue), neutral middle; not green for gain (red-green colour-vision-deficiency trap). Fallback if the validator fails or it reads oddly: brown to teal.
4. **Percentage threshold:** ranking-only (Decision 7); percentages shown on the map and in the table for every country with a non-zero 1990 forest area.
5. **Driver label:** "Hard commodities (mining and energy)".
6. **Mexico clause range:** narrowed to 180 to 215 million hectares (Decision 13).
7. **Ranking placement:** collapsed under "View data table" inside the change card, as the CO2 ranking.
8. **Page title:** "Forest Area & Tree Cover Loss by Country"; "Deforestation" stays in the `<h1>` and the URL.
9. **GFW resolution claim:** "about 1 km" is verified against the dataset record at implementation; the text follows the source if it differs.
