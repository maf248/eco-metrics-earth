# Add the energy sources module (third OWID-backed category)

## Why

`/energy-sources/` is still an icon, a title and "coming soon". `co2-emissions` and `global-temperature` proved the OWID-backed category recipe in `AGENTS.md` ("Adding an OWID-backed category (end to end)"); this is the first category that follows it with every generic piece already in place (`buildYearAlignedEntities`, `buildOwidEnvelope`, `CountryExplorer`, `ChartPanel`, `YearDataTable`, `DataAttribution`, `OriginCredit`, `RenderWhenVisible`, `buildDatasetJsonLd`, `isYearAlignedCountryData`, `fetchPayloadFromBff`).

It also adds what the previous two did not need:

- **A composition chart.** The page shows how much of a country's electricity comes from each source: a stacked area over time and a donut of the latest year. This is the first stacked chart, the first pie (ECharts' `PieChart` has to be registered where it is used, design-system chart rule 3) and the first chart whose series are _semantic_ (coal, wind, ...) rather than interchangeable categories.
- **A second palette.** The categorical `--chart-1…8` palette is for series that have no inherent meaning. Electricity sources do (renewables read as green/blue, fossils as dark/brown/grey), and a mix is read by colour first. This change adds an "energy mix" palette with its own tokens, validated with the same method as the categorical one.
- **A licensing-driven year range.** OWID's electricity series combine several producers. Only part of them is licensed in a way that lets this site serve them (see the Goals and `design.md`), so the page starts in 2000 on purpose.

Verifying the data against live OWID (26 Oct 2026) also showed what the recipe does not say, which this change handles:

- the TWh chart named in the earlier plan (`electricity-prod-source-stacked`) redirects to an OWID _Explorer_; the grapher chart `electricity-production-by-source` serves the same indicators and answers the CSV request directly, so the spec uses it;
- the chart opens on its **chart** tab (the `country` filter works without `tab: 'chart'`);
- blank cells are common and mean "no generation reported for that source" (Bosnia and Herzegovina has blank gas and nuclear cells in its early years), so `null` must not be coerced to zero on the wire;
- the chart carries 55 country-years (the 2025 row of 29 countries, plus one entity whose whole series is zeros) that hold only zeros and blanks, so years without real generation must not be served;
- OWID's share chart is derivable from the TWh chart (identical within 0.5 points in all 48,717 comparisons), so the API serves TWh only and the web derives the percentages: one download, half the payload.

## Goals

- Serve the **electricity generation mix** (not primary energy) of every country plus World from OWID, from **2000** onward, in one compact year-aligned payload: generation (TWh) for eight fixed sources (percentages are derived on the web) — coal, gas, oil, nuclear, hydro, wind, solar and "bioenergy & other renewables" (bioenergy plus other renewables excluding bioenergy, summed).
- Credit **Ember** as the producer of every served value and serve no year before 2000. Reason (licensing): OWID's series combine Ember (CC BY 4.0) from 2000 onward (Europe from 1990), the Energy Institute Statistical Review before 2000 ("© Energy Institute", all rights reserved, extensive reproduction of its tables requires prior permission, some S&P Global-sourced data prohibited) and Pinto et al. 2023 (CC BY) for the World before 1965. Serving 2000+ only means every served value is Ember's.
- Render `/energy-sources/` with, top to bottom: an intro sentence; a server-rendered key-figures box with exactly two figures (the World's renewables share and the World's largest single source, both for the latest year); a stacked area of the selected country's mix with a "Share (%)" / "Generation (TWh)" toggle; a donut of the latest year's mix for the same country; the text equivalents of both charts (a year × source table and a latest-year table); and a footnote with the methodology and the attribution.
- Add a validated **energy mix palette** (tokens, adapter support, guard test, `docs/design-system.md`), keeping colour from carrying identity alone (always-visible legend, table, tooltip).
- Reuse the OWID provider, the `owid` health indicator and the single `owid` catalog entry unchanged; the only catalog change is one more upstream origin (Ember) listed under OWID.

## Non-Goals

- **Primary energy** (all energy, not just electricity). The footnote says so; no primary-energy chart, column or endpoint.
- **A persistent stale-data cache for provider outages.** Provider failures keep the existing contract (`ProviderError` → `502`, the web keeps the last good ISR page). A separate resilience change follows this one and will adapt this module.
- **Visitor-country preselection.** World is always the default, as in the other two pages.
- **A choropleth map**, a country ranking or any country-vs-country comparison.
- **Data before 2000.** No year before 2000 is requested, parsed into the payload or shown, even though OWID has it.
- A year selector for the donut (it always shows the selected country's latest year), a "low-carbon" or "fossil" aggregate, a renewables-only view, capacity (MW), monthly data, emissions intensity.
- A second OWID health indicator or a second `owid` catalog entry.
- Splitting "bioenergy & other renewables" back into its two parts on the wire or in the UI.
- Committing a palette validator script to the repo (the method is recorded in `design.md` and `docs/design-system.md`; a script is a possible follow-up).
- Any change to the categorical palette, to the CO2 or global temperature pages' behavior, or to icons.

## Impact

- **`packages/shared`**: new `energy-sources.ts` (source ids in their fixed order, renewable ids, wire types) exported from the root.
- **`apps/api`**: new `modules/energy-sources/` (constants, service with a pure builder, controller, module), imported by `AppModule`; `GET /api/v1/energy-sources`; a new upstream origin (Ember) appears under the `owid` catalog entry on `/data-sources/`. No change to `OwidClient`, `OwidProviderStatus`, the health module or the global filter.
- **`apps/web`**: new `lib/energySources.ts` (server-only fetch + guard), pure helpers, chart option builders and structured-data builder; new `components/energy-sources/`; the chart foundation gains a palette selection (`EChart`, `LazyEChart`, `ChartPanel`, theme adapter) and a lazily registered pie entry; `YearDataTable` gains a wide-table option; a generic `MeasureToggle` is extracted from the CO2 explorer (identical output); `CATEGORY_PAGES` and `categoryMetadata` gain the `energy-sources` entry; eight new `--energy-*` tokens in `globals.css`.
- **E2E**: new `energy-sources.spec.ts`, one trimmed OWID CSV plus one indicator metadata fixture, fixture-server routes, additions to the axe and SEO specs.
- **Docs**: `docs/design-system.md` (palette, conventions), `AGENTS.md` (structure tree), the three READMEs, `docs/data-sources/energy-sources.md` (licensing note and the OWID charts used), `ROADMAP.md` (completed item removed, IDs renumbered).
- **Specs**: two new capabilities (`energy-sources-api`, `energy-sources-page`) and modifications to `shared-types`, `bff-fetch-helper`, `chart-foundation`, `design-tokens`, `country-explorer`, `category-page-registry`, `static-category-pages`, `page-metadata` and `presentation-docs`.
- **Deploy order**: API before web (new payload contract), as for every payload change.
