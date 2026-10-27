# Design: energy sources module

## Context

`co2-emissions` and `global-temperature` are the references (`AGENTS.md`, "Adding an OWID-backed category (end to end)"). Everything generic already exists; this design only records what is different for a **composition** dataset (eight parts of a whole, two measures, a share that sums to 100) and for a **semantic** palette. Read before implementing: `AGENTS.md`, `docs/design-system.md` (chart rules 1-10, categorical palette, `RenderWhenVisible`), `docs/data-sources/energy-sources.md`.

### What was verified against live OWID (26 Oct 2026)

| Item                                         | Finding                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Share chart (not used)                       | `share-elec-by-source` exists and opens on its chart tab, but its values are derivable from the TWh chart (row "Share vs TWh"), so it is not downloaded.                                                                                                                                                                                                             |
| Redirecting slug                             | `electricity-prod-source-stacked` answers `301` to an OWID **Explorer** (`electricity-mix?...`) with a "zero-filled for stacking" column: do not use.                                                                                                                                                                                                                |
| TWh chart used (confirmed)                   | `electricity-production-by-source`: grapher chart, CSV 200, opens on its chart tab (`country=OWID_WRL~ESP&time=2000..2026` returns 26 years per entity without `tab`). Unit terawatt-hours. Note: "Other renewables include geothermal, wave, and tidal."                                                                                                            |
| Column short names (`useColumnShortNames`)   | `<source>_generation__twh` for coal, gas, oil, nuclear, hydro, wind, solar, bioenergy, and `other_renewables_excluding_bioenergy_generation__twh`.                                                                                                                                                                                                                   |
| Dataset                                      | Indicators: dataset "Electricity mix", version `2026-06-30`, `updatedAt` `2026-09-10T01:11:13Z` (coal, indicator 1295503), timespan 1900-2025.                                                                                                                                                                                                                       |
| Coverage 2000-2025 (allowlist, 216 entities) | Latest year 2025 for most entities, earlier for some (for example Algeria 2024). The chart has 55 country-years made only of zeros/blanks (29 are the 2025 row of 29 countries; the rest belong to one entity whose whole series is zeros). No negative values.                                                                                                      |
| Blanks                                       | Common (hundreds of cells) and meaningful: a source a country has none of is blank, not `0` (Bosnia and Herzegovina: blank gas, nuclear, wind, solar, bioenergy in early years, explicit zeros later). Spain's "other renewables" is an explicit `0`. Both appear in the same dataset.                                                                               |
| Share vs TWh                                 | OWID's share chart equals `TWh / sum(TWh) × 100` within 0.5 points in 48,717 of 48,717 country-year-source comparisons: it adds no information, which is why shares are derived (Decision 2).                                                                                                                                                                        |
| Origins (indicator metadata)                 | Ember "Yearly Electricity Data Europe" (CC BY 4.0), Ember "Yearly Electricity Data" (CC BY 4.0, `https://ember-energy.org/data/yearly-electricity-data/`), Energy Institute "Statistical Review of World Energy" ("© Energy Institute 2026"), Pinto et al. "Global historical electricity" (CC BY 4.0), UK DESNZ (OGL v3.0, on some coal/gas/oil/bio/other columns). |
| Provenance note on the column                | "Electricity data from 2000 onwards (and from 1990 onwards for European countries, including Turkey) comes from Ember. Earlier data comes from the Energy Institute. For the World, data before 1965 (going back to 1900) comes from ... Pinto et al. (2023). For the United Kingdom, earlier years ... DESNZ."                                                      |

## Decisions

### Decision 1. Start year 2000, Ember as the only origin (licensing)

OWID's electricity series are a splice. From 2000 onward (Europe from 1990) the values are Ember's, licensed CC BY 4.0, which permits republication with attribution and a statement of changes. Before 2000 they come from the **Energy Institute Statistical Review**, published "© Energy Institute", all rights reserved: its terms require prior permission for extensive reproduction of tables and prohibit some S&P Global-sourced data. OWID's own CC BY covers OWID's processing, not the underlying producer's terms. Pinto et al. (CC BY) and DESNZ (OGL) only reach back before 1965 / 1984 and are irrelevant from 2000.

So `ENERGY_START_YEAR = 2000` and the API never requests nor serves anything earlier. Consequences:

- every served value is Ember's, so `ENERGY_ORIGIN` (Ember, "Yearly Electricity Data", CC BY 4.0) is the only origin registered and served (`registerCategory`, `data.origin`, credited with `OriginCredit`). The Energy Institute, Pinto and DESNZ are deliberately **not** listed anywhere;
- the request is bounded (`time=2000..<year>`) and the builder independently ignores rows before `startYear`, so a provider that ignores `time` (or a fixture with older rows) still cannot leak a pre-2000 value;
- the rationale lives in the constants (next to `ENERGY_START_YEAR`) and in `docs/data-sources/energy-sources.md`, so nobody "extends the series back" without reading it.

Limit of the claim: provenance is stated by OWID per column, not per row; the CSV does not say which producer each value came from. The claim "2000+ is Ember" rests on OWID's description (see Risks).

### Decision 2. Wire format: generation only, shares derived on the web

```ts
interface EnergySourcesEntity extends CountryEntity {
  generation: Record<EnergySourceId, (number | null)[]>; // TWh, 2 decimals
}
```

`ENERGY_SOURCE_IDS = ['coal','gas','oil','nuclear','hydro','wind','solar','bioenergyOther']` (shared, runtime constant) is the one definition of the sources and of their order; the API builder, the web helpers, the chart builders and the palette token list all derive from it. Arrays are year-aligned from `startYear` 2000. `unit` is `'TWh'`.

**Shares are not on the wire.** One pure helper in `lib/energyMix.ts` computes `share_i = gen_i / sum(present gen) × 100` per year from the served values (null stays null; a year with an all-null or zero sum has no shares). Key figures, the area chart in Share mode, the donut and both tables all use it, so they cannot disagree. Justification: OWID's own share chart equals this computation within 0.5 points in 48,717 of 48,717 comparisons, so downloading it would only duplicate data. Benefits: one CSV and one metadata request instead of two and two, half the payload, no rounding mismatch between a served share and its TWh, shares that sum to 100 exactly. Shares are computed from the already rounded TWh and rounded only for display.

The API calls the generic `buildYearAlignedEntities` with 8 flat measure keys (one per source) and regroups them under `generation`. The web guard reuses `isYearAlignedCountryData(data, [])` and adds an energy-specific entity check (a `generation` object, each id, array length `endYear - startYear + 1`), and must not require shares.

Payload size (simulated from the real data, 216 entities × 26 years × 8 arrays, 2 decimals): about 230 KB raw, **about 45 KB gzipped**; the budget is "at or below about 55 KB gzipped". The payload is also serialised into the page's RSC payload (as for the other two pages), far under the 2 MB Next fetch Data Cache item limit.

### Decision 3. Missing values: `null` on the wire, never zero

A blank cell means "this source reported no generation for this country-year". The API keeps it `null`; it never invents `0`. Consequences, all specified:

- **Summing bioenergy + other renewables**: `null` only when both parts are `null`; when exactly one is `null` the other counts (a country with bioenergy but no "other renewables" has a bioenergy & other renewables value). Sum first, round after (rounding two parts then adding drifts by 0.01).
- **Display**: tables show an em dash, tooltips "No data", the stacked area leaves a gap (the area of that source is absent and the stack above it sits at zero height for it, which is the correct picture of "no generation"), the donut slice is absent.
- **Derived numbers** (shares, renewables share, largest source) use present values only.

### Decision 4. A year exists only if it has real generation

The chart has 55 country-years made of zeros and blanks (for example `nuclear = 0`, everything else blank): the 2025 row of 29 countries, plus one entity whose whole 2000-2025 series is zeros. Serving them would put an empty year at the head of a table. Rule: before alignment, the API drops, per entity, every year whose eight generation values are all `null` or sum to 0; `endYear` derives from the remaining years and an entity left with nothing is dropped.

The web's **latest year of an entity** is the latest year with a positive generation sum. It differs from the payload `endYear` for entities that stopped reporting earlier (Algeria 2024 vs 2025); the donut, its table and its heading use the entity's own latest year.

### Decision 5. Key figures: renewables share and largest source

Computed in the Server Component from the World entity, in the World's latest year: renewables share = sum of the derived shares of `hydro`, `wind`, `solar`, `bioenergyOther`; largest source = greatest present share, ties to the earlier source in the fixed order. One decimal. With the 2025 data this reads "In 2025, renewables generated 33.8% of the world's electricity. The largest single source was coal, at 33.0%." (the derived renewables sum 13.96 + 8.54 + 8.75 + 2.52 = 33.76 is larger than coal's 32.96, which is why both figures are worth stating). "Bioenergy & other renewables" competes as one source in the "largest" comparison because that is the series the page shows.

### Decision 6. Palette: a second, semantic palette selected by name

The categorical palette is for entities that have no meaning of their own; an electricity mix is read by colour first (green/blue renewables, dark fossils), so it gets its own tokens. Mechanism, all in the existing chart foundation:

- `globals.css`: `--energy-coal`, `--energy-gas`, `--energy-oil`, `--energy-nuclear`, `--energy-hydro`, `--energy-wind`, `--energy-solar`, `--energy-bio` (hex, light on `:root`, dark under `.dark`), not mapped in `@theme inline` (same treatment as `--chart-*`).
- `chartTokens.ts`: `CHART_ENERGY_TOKENS` in the order of `ENERGY_SOURCE_IDS`.
- `chartTheme.ts`: `buildChartTheme(resolve, palette = 'categorical')`; `'energyMix'` swaps only the `color` array. `EChart`, `LazyEChart` and `ChartPanel` take an optional `palette` prop; `EChart` keeps it in a ref so the `dark`-class observer re-applies the theme with the right palette.
- `designTokens.test.ts`: `--energy-*` is a second chart-token group (light+dark present, no `@theme inline` mapping, names equal to `CHART_ENERGY_TOKENS`).
- Options still name no colour. Colour follows the entity because a series takes the palette colour **at its index**: both the stacked area and the donut always emit all eight series/items in the fixed order. Hiding a legend entry or a null value never shifts the colours of the rest.
- Stacked areas set `areaStyle.opacity: 1`. ECharts' default of 0.7 would blend each band with the one below and the surface and invalidate the validated colours. An opacity is not a colour, so the "no colours in options" rule holds.

#### Validated values

Method (the same checks the categorical palette recorded, made reproducible here because the repo has no validator script): hex → linear sRGB → OKLab; colour-vision deficiency simulated by the Machado et al. (2009) severity-1.0 matrices in linear sRGB (clamped), ΔE = 100 × Euclidean distance in OKLab, computed for every adjacent pair of the stacking order **plus the wrap pair bioenergy & other renewables → coal** (a donut places them side by side); WCAG 2.x contrast against the real surface (white in light mode, black in dark mode). Calibration: the same code reproduces the documented worst categorical CVD results (protan 9.1 light / 8.4 dark), so the thresholds are comparable.

Thresholds: adjacent-pair ΔE ≥ 8 under protan, deutan and tritan, ≥ 15 unsimulated; chroma ≥ 0.06 for every chromatic hue; contrast ≥ 2.0 on white and ≥ 3.0 on black. The OKLCH lightness band is **wider** than the categorical one (0.53-0.76): light 0.28-0.80, dark 0.47-0.90, because charcoal coal and bright amber solar are the semantic anchors. The neutral chroma of coal (0.02) is the one deliberate exception to the chroma floor. A search was run first (random restarts, hill climbing over L/C/H inside narrow semantic hue windows, objective = the worst of ΔE_cvd/8 and ΔE_normal/15), then the winners were rounded by hand and re-measured. The result keeps the intent without needing four similar greens: renewables are blue (hydro), teal-cyan (wind), amber (solar) and green (bioenergy & other renewables); fossils are charcoal (coal), sand (gas) and brown (oil); nuclear is violet.

| Slot | Token            | Source                       | Hue (light) | Light     | L / C / H (light)   | Dark      | L / C / H (dark)    |
| ---- | ---------------- | ---------------------------- | ----------- | --------- | ------------------- | --------- | ------------------- |
| 1    | `energy-coal`    | Coal                         | charcoal    | `#252933` | 0.281 / 0.019 / 268 | `#5c5c69` | 0.479 / 0.021 / 286 |
| 2    | `energy-gas`     | Gas                          | sand        | `#caac7c` | 0.759 / 0.073 / 79  | `#dbbb8f` | 0.809 / 0.069 / 75  |
| 3    | `energy-oil`     | Oil                          | brown       | `#97541c` | 0.515 / 0.111 / 56  | `#9d5834` | 0.534 / 0.104 / 47  |
| 4    | `energy-nuclear` | Nuclear                      | violet      | `#6d028d` | 0.400 / 0.196 / 315 | `#d277f8` | 0.719 / 0.199 / 315 |
| 5    | `energy-hydro`   | Hydro                        | blue        | `#0475d5` | 0.562 / 0.171 / 253 | `#226bb0` | 0.519 / 0.130 / 251 |
| 6    | `energy-wind`    | Wind                         | teal / cyan | `#00c4c6` | 0.743 / 0.127 / 196 | `#33cbea` | 0.779 / 0.127 / 215 |
| 7    | `energy-solar`   | Solar                        | amber       | `#e9a400` | 0.765 / 0.159 / 78  | `#ffd347` | 0.881 / 0.158 / 91  |
| 8    | `energy-bio`     | Bioenergy & other renewables | green       | `#26771e` | 0.502 / 0.146 / 142 | `#11b254` | 0.669 / 0.180 / 150 |

Adjacent-pair ΔE×100 (unsimulated / protan / deutan / tritan):

| Pair                    | Light                         | Dark                          |
| ----------------------- | ----------------------------- | ----------------------------- |
| coal - gas              | 48.7 / 46.7 / 49.4 / 48.8     | 34.1 / 32.3 / 34.8 / 34.0     |
| gas - oil               | 25.0 / 27.1 / 24.2 / 25.2     | 28.1 / 30.2 / 27.3 / 28.2     |
| oil - nuclear           | 26.8 / 25.4 / 26.2 / 14.3     | 29.4 / 30.0 / 27.2 / 19.0     |
| nuclear - hydro         | 25.0 / 21.6 / 15.7 / 26.4     | 27.2 / 14.5 / 20.6 / 25.4     |
| hydro - wind            | 23.3 / 23.6 / 23.8 / 18.0     | 27.2 / 28.2 / 27.0 / 26.5     |
| wind - solar            | 24.6 / 18.0 / 20.7 / 26.3     | 27.3 / 22.5 / 26.9 / 21.9     |
| solar - bio             | 30.9 / 20.3 / 28.3 / 34.4     | 27.1 / 15.7 / 23.5 / 26.7     |
| bio - coal (donut wrap) | 27.1 / 27.3 / 24.7 / 23.3     | 27.2 / 26.2 / 21.7 / 22.9     |
| **Worst**               | **23.3 / 18.0 / 15.7 / 14.3** | **27.1 / 14.5 / 20.6 / 19.0** |

Every threshold passes with margin (the worst CVD pair is 14.3 against a target of 8). Contrast against the surface: light - coal 14.55, gas 2.16, oil 5.83, nuclear 10.28, hydro 4.66, wind 2.16, solar 2.15, bio 5.62; dark - coal 3.19, gas 11.52, oil 3.88, nuclear 7.73, hydro 3.80, wind 10.87, solar 14.66, bio 7.52. Gas, wind and solar sit just above 2:1 on white, like the categorical yellow (2.17); they are large filled areas next to dark neighbours, and the legend, tooltip and tables name every source.

Known limitation (recorded in the design system): only **adjacent** pairs are separated. Non-adjacent pairs can be close under CVD (lowest all-pairs CVD: light oil/bio 2.5, gas/solar 7.3; dark gas/solar 5.5, nuclear/wind 7.8); identity is carried by the legend, the tooltip and the tables, not by colour alone.

Validation caveat: the repo's categorical palette reads 5.8 under tritan with the matrices above (its recorded worst is 9.1), so the earlier validation evidently used a different tritan model. The energy palette is measured with the stricter one and still passes.

### Decision 7. The stacked chart and the Share / Generation toggle

- Eight `line` series with `areaStyle`, `stack: 'mix'`, `symbol: 'none'`, in source order (coal at the bottom, bioenergy & other renewables on top, fossils below, renewables above). `LineChart` is already registered; no new module for the area.
- `yAxis` in share mode: `min: 0`, `max: 100`, labels `${v}%` (derived shares sum to 100, so nothing is clipped). In TWh mode: `min: 0`, labels via `formatCompact`.
- X axis: `buildYearAxis` (decade labels: 2000, 2010, 2020 on this 26-year range).
- Tooltip: `trigger: 'axis'` (`baseTooltipOption`), `valueFormatter` printing `33.0%` or `10,472 TWh`, `No data` for `null`. ECharts lists all eight series; that is intended.
- `emphasis: { focus: 'series' }`; legend `type: 'scroll'`, always shown; `aria.enabled` from the base option.
- Toggle: the generic `MeasureToggle` (extracted from `Co2Explorer`, see Decision 10), default "Share (%)". The measure is component state, as in CO2.

### Decision 8. The donut

- A `pie` series with `radius: ['45%', '72%']`, `label.show: false`, `avoidLabelOverlap` irrelevant. Eight data items always present in order; a source without a value has `value: null` (ECharts lays out `NaN` as a zero-angle slice and keeps the legend entry; verified in jsdom/SVG). ECharts' generated aria description prints a `null` value as "NaN", so both charts set `aria.label.description` themselves: the donut lists every source (`Coal 33.0%; Gas no data; ...`), the area names the entity, measure and years and points to the table.
- Tooltip `trigger: 'item'` (still `confine: true`) with a formatter printing `Coal: 33.0% (10,472 TWh)`; each item carries its `generation` value.
- Latest year: the entity's own (Decision 4). No year selector, no dependence on the toggle: slice sizes are always shares, the tooltip and table add TWh.
- Pie registration: `PieChart` is **not** added to `echartsSetup.ts` (design-system chart rule 3). A new module `charts/EPieChart.tsx` imports `PieChart` and the shared `echarts` instance, calls `echarts.use([PieChart])` at module scope and re-exports `EChart`; `charts/LazyPieEChart.tsx` loads it with `next/dynamic` (`ssr: false`, `ChartSkeleton`). The donut section is wrapped in `RenderWhenVisible`, so a visitor who never scrolls to it never downloads the pie code. Registering the pie from the donut component itself would pull ECharts core into the main client chunk (a static import of `echarts/core` defeats the lazy `EChart` chunk), which is why the registration lives behind its own dynamic import.

### Decision 9. The two tables

- **(a) Year × source** (stacked chart's equivalent): `YearDataTable` with the new `wide` flag (larger `min-w`, so eight columns keep readable widths and the existing scroll region scrolls horizontally at 375 px), headers `Coal (%)` ... `Bioenergy & other renewables (%)`. **Decision: it follows the measure toggle** (shares in "Share (%)", TWh in "Generation (TWh)"). The table is the text equivalent of what the chart currently shows, so it must change with it; the toggle is client state and the table is already client-rendered inside the explorer, so following it costs nothing and avoids a second table. A table that always showed shares would not describe the TWh chart. Server-rendered default is World in shares.
- **(b) Latest year** (donut's equivalent): a new `EnergyLatestTable`, a plain visible `<table>` (8 rows × Source / Share (%) / Generation (TWh), caption "World: electricity mix in 2025"), not collapsed. Reason: it is small, it doubles as the donut's legend-with-values and it should be indexable and readable without opening anything. It does not need the `<details>` shell, so no extra shared component is extracted.

### Decision 10. `MeasureToggle` extraction

The CO2 explorer holds the Total / Per capita radio group inline (about 35 lines). Energy needs the same control; a second copy would be the second duplicate of generic markup in three categories. It is extracted as `components/MeasureToggle.tsx` (props `legend`, `options`, `value`, `onChange`) and `Co2Explorer` is rebuilt on it with **identical output**, protected by the existing CO2 component tests. This is the same "extract before the next copy" move the global temperature change made for the explorer, data table and attribution.

### Decision 11. Service shape

Pure exported builder `buildEnergySourcesData(input)` (testable without Nest), plus the injectable service that wires `OwidClient`:

1. `getGrapherSeries` for each of the 9 generation columns (one table download: the client caches the table per chart/country/range key and `cache-manager` 6 coalesces concurrent calls on the same key, so a cold start is exactly one CSV and one metadata request), plus `getIndicatorMetadata(1295503)`.
2. Builder, in order: sum `bioenergy` + `otherRenewables` per entity-year (null only if both null) → drop years with no real generation (Decision 4) → `buildYearAlignedEntities` with `startYear` 2000 and `roundTo(value, 2)` converters → regroup under `generation`.
3. `lastUpdated` = the indicator's `updatedAt`; `recordProviderUpdate(lastUpdated)`; `registerCategory('energy-sources', [ENERGY_ORIGIN])` in the constructor; `data.dataset` from the same metadata.

No change to `OwidClient`, `OwidProviderStatus`, `buildOwidEnvelope`, the health module or the global filter.

### Decision 12. Page composition

```
EnergySourcesContent (Server Component)
  JsonLd (Dataset)
  intro <p>
  key-figures box           -> EnergyKeyFigures (server)
  EnergyExplorer (client)   -> CountryExplorer (heading "Explore the electricity mix by country", controls = MeasureToggle)
      ChartPanel (palette=energyMix)         stacked area + title + live region
      EnergyDonut (client section)           h3 + RenderWhenVisible(LazyPieEChart palette=energyMix) + live region
      EnergyYearTable                         YearDataTable wide, follows the toggle
      EnergyLatestTable                       plain table
  methodology footnote (data-testid energy-methodology)
  DataAttribution(extra = OriginCredit(Ember))   (data-testids energy-attribution, energy-origin)
```

Tokens only; `CHART_HEIGHT_CLASS_NAME` for both charts. The attribution sits below the card with the footnote rather than under the first chart, because the card holds two charts and two tables and one "Data:" line serves them all.

The footnote also fulfils CC BY's "indicate changes": it states that bioenergy and other renewables were summed by this site.

### Decision 13. Metadata

`CATEGORY_DESCRIPTIONS['energy-sources']` = `Electricity mix by country since 2000: coal, gas, oil, nuclear, hydro, wind, solar and bioenergy, as a share and in TWh. Data from Our World in Data.` (149 characters). Title override `Electricity Mix by Country` (keyword-bearing, like the other two live pages); `<h1>` and nav stay `Energy Sources`. The e2e helper `pages.ts` mirrors both (`CATEGORY_DESCRIPTION_SAMPLES`, `CATEGORY_METADATA_TITLES`).

## File structure changes

```
packages/shared/src/lib/energy-sources.ts                 (new)  ENERGY_SOURCE_IDS, RENEWABLE_SOURCE_IDS, types
packages/shared/src/index.ts                                     exports

apps/api/src/modules/energy-sources/
  energy-sources.constants.ts      (new)  chart/columns/indicator ids, ENERGY_START_YEAR (+ licensing note), ENERGY_ORIGIN
  energy-sources.service.ts        (new)  buildEnergySourcesData (pure) + service
  energy-sources.controller.ts     (new)
  energy-sources.module.ts         (new)
apps/api/src/app/app.module.ts                                   imports EnergySourcesModule
apps/api/__tests__/energy-sources/{build-energy-sources-data,energy-sources.controller}.test.ts + fixtures/ (new)
apps/api/__tests__/app/app.module.test.ts, providers/owid/owid-provider-status.test.ts   adjust enumerations if they list categories

apps/web/src/lib/
  energySources.ts                 (new, server-only) getEnergySources + guard
  energyMix.ts                     (new) labels, share derivation, latestYear, renewablesShare, largestSource
  energyChartOption.ts             (new) buildEnergyAreaOption, buildEnergyDonutOption
  energyStructuredData.ts          (new) buildEnergyDatasetJsonLd
  formatNumber.ts                  formatShare, formatTwh
  categoryPages.tsx / categoryMetadata.ts                       entry, description, title override
apps/web/src/components/
  MeasureToggle.tsx                (new, extracted from Co2Explorer)
  YearDataTable.tsx                `wide` flag
  co2-emissions/Co2Explorer.tsx    uses MeasureToggle (identical output)
  charts/{chartTokens,chartTheme,EChart,LazyEChart,ChartPanel}.ts(x)   palette
  charts/EPieChart.tsx, charts/LazyPieEChart.tsx  (new)
  energy-sources/{EnergySourcesContent,EnergyKeyFigures,EnergyExplorer,EnergyDonut,EnergyYearTable,EnergyLatestTable}.tsx (new)
apps/web/src/app/globals.css                                     8 x 2 --energy-* tokens
apps/web/__tests__/...                                           mirrors of the above + updated enumerations
apps/web/e2e/{energy-sources.spec.ts (new), a11y.spec.ts, seo.spec.ts, utils/pages.ts, utils/owid-fixture-server.ts}
apps/web/e2e/fixtures/owid/                                      2 new fixtures (CSV + indicator metadata)
docs: design-system.md, data-sources/energy-sources.md, AGENTS.md, README.md, apps/api/README.md, apps/web/README.md, ROADMAP.md
```

## Alternatives considered

- **Primary energy (all sources) instead of electricity.** Rejected by the user: different dataset, different licensing review, broader scope. The footnote tells readers what the page is not.
- **Start year before 2000 (1965 or earlier).** Rejected: the Energy Institute series is "© Energy Institute", all rights reserved. Showing it needs permission; Ember-only 2000+ needs none beyond CC BY attribution.
- **Register the Energy Institute (or all five origins) and keep the full range.** Rejected for the same reason: crediting does not license it. Also noisier credit lines for no benefit.
- **Use `electricity-prod-source-stacked` for TWh.** Rejected: it redirects to an Explorer (`301`), the CSV contract of the grapher URL is not guaranteed there and one column is "zero-filled for stacking" (it would turn missing data into zeros against Decision 3).
- **Download OWID's share chart as well.** Rejected: derivable from the TWh chart (Decision 2); it doubled the requests and the payload.
- **Hue-only fallback palette (coal charcoal, gas grey, oil brown, nuclear violet or amber, hydro blue, wind light blue, solar yellow, bio green).** This is effectively what the search produced. The "four greens/teals" option was not needed.
- **Reuse `--chart-1…8` for sources.** Rejected: the categorical order was validated for meaningless series; here a reader expects coal to look like coal, and fixed semantics survive filtering.
- **Semi-transparent areas.** Rejected: blending breaks the validated colours.
- **A year selector for the donut.** Out of scope; the latest year is the common question and the stacked chart already shows the history.
- **Always-shares year table.** Rejected (Decision 9).
- **Collapsed `<details>` for the latest-year table.** Rejected (Decision 9): small and useful in view; also avoids extracting a new disclosure component.
- **Registering `PieChart` in `echartsSetup.ts`.** Rejected: every chart page would ship it. Registering inside the donut component would drag ECharts core into the main chunk (Decision 8).
- **A separate `/energy-sources/<country>/` URL per country.** Rejected by the design system ("Chart-scoped selector, no URL state").

## Risk assessment

| Risk                                                                                                               | Likelihood | Mitigation                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "2000+ is Ember" is OWID's per-column description, not a per-row provenance                                        | Low-medium | Recorded as an assumption in constants and docs; a one-time manual spot check (Ember's CSV vs the served values for a few countries) before release; the origin list is a single constant to adjust. |
| European countries' values may come from Ember's sibling dataset "Yearly Electricity Data Europe" (Eurostat-based) | Low        | Same producer, same CC BY 4.0 licence and credit page; one origin ("Yearly Electricity Data") is registered and served, no list type.                                                                |
| Payload size (about 230 KB raw, 45 KB gzipped) embedded in the RSC payload                                         | Low        | Budget asserted in the spec (≤ ~55 KB gzipped); 2-decimal rounding already applied.                                                                                                                  |
| OWID renames a column or moves the chart                                                                           | Low        | Explicit `column` names; a missing column or World row is a `ProviderDataError` → `502`; the web keeps the last good page; the dependencies check already covers OWID reachability.                  |
| ECharts handling of `null` pie values and `null` in stacked areas                                                  | Medium     | Verify in the first unit test with the SVG output; fallbacks recorded in Decision 8; E2E checks the SVG renders for a country with blanks (fixture includes one).                                    |
| Pie code leaking into the main chunk                                                                               | Low        | `PieChart` registered only in `EPieChart.tsx`, behind `next/dynamic`; scenario "cartesian setup stays pie-free" plus a build-output check in the gates.                                              |
| Palette: low contrast of gas, wind, solar on white (about 2.15:1)                                                  | Accepted   | Same status as the categorical yellow; legend, tooltip and tables always present; recorded in the design system.                                                                                     |
| Palette: only adjacent pairs are CVD-separated                                                                     | Accepted   | Recorded limitation; the fixed stacking order is part of the validation, never reordered.                                                                                                            |
| `MeasureToggle` extraction changes CO2 markup                                                                      | Low        | Identical output is a scenario; existing CO2 tests must pass unchanged.                                                                                                                              |
| Next's fetch Data Cache holds the old BFF contract after deploy                                                    | Medium     | Deploy the API before the web; `fetchEnvelopeFromBff` already retries past the cache on a shape mismatch (`AGENTS.md`, Known Constraints).                                                           |
| Test enumerations of live categories (counts 9, 3 entries, 12 descriptions) break                                  | Certain    | Listed in the tasks: `[category]/page.test.tsx`, `categoryMetadata.test.ts`, `categoryPages.test.tsx`, `app.module.test.ts`, the owid status test, `seo.spec.ts`, `pages.ts`.                        |
| Another dev server on :3000 gets clobbered by the build or E2E                                                     | Medium     | Check ports before build/E2E (the user keeps `next dev` on :3000); `npm run e2e` starts its own servers and the fixture server on :3999.                                                             |
