# Water Footprint

Tracks the water consumed to produce everyday goods — food, textiles, technology, vehicles, construction materials (product water footprint, in liters per unit or per kg) — which is the core concept of this category. Also covers the macro context: freshwater availability, withdrawals, and water stress by country and sector (agriculture, industry, municipal).

> Note: World Bank API also appears in `co2-emissions.md` and `waste-recycling.md`. The product-level dataset plan (static JSON of ~30–50 products) lives in `WATER_FOOTPRINT.md` at the repo root.

## Providers

### 1. Our World in Data — Water Use & Stress

- **URL:** https://ourworldindata.org/water-use-stress — CSV via grapher: `https://ourworldindata.org/grapher/<chart>.csv`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). CSV/JSON via grapher endpoints. Underlying data comes from FAO AQUASTAT (partly via World Bank).
- **Data type:** Annual; one row per country-year.
- **Data:** Freshwater withdrawals (total, per capita, by sector share), water stress (SDG 6.4.2), renewable freshwater resources per capita, long-run global freshwater use.
- **API key:** Not required.
- **CORS:** Enabled on grapher endpoints.
- **Validated (Jul 2026):** Working chart slugs:
  - `annual-freshwater-withdrawals` — billion m³, 1962–2022
  - `freshwater-withdrawals-as-a-share-of-internal-resources` — water stress SDG 6.4.2 (%), 2000–2022
  - `renewable-water-resources-per-capita` — m³/person, 1961–2022
  - `water-withdrawals-per-capita` — m³/person
  - `global-freshwater-use-over-the-long-run` — global trend since 1900
  - Sector shares: `agricultural-water-as-a-share-of-total-water-withdrawals`, `industrial-water-as-a-share-of-total-water-withdrawals`, `municipal-water-as-a-share-of-total-water-withdrawals`
  - ⚠️ The former slug `water-stress-indicator` was removed (404, no redirect). Use `freshwater-withdrawals-as-a-share-of-internal-resources` instead — the Postman OWID collection has been updated accordingly.

| Field            | Details                                       |
| ---------------- | --------------------------------------------- |
| Base URL         | `https://ourworldindata.org/grapher/`         |
| Auth             | None                                          |
| Free tier        | Yes                                           |
| Rate limit       | None                                          |
| Update frequency | Annual (follows AQUASTAT/World Bank releases) |
| Format           | CSV, JSON                                     |

---

### 2. World Bank Open Data API

- **URL:** `https://api.worldbank.org/v2/country/{iso}/indicator/{code}?format=json`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. REST + JSON.
- **Data:** Renewable freshwater resources, withdrawals (total and by sector), water stress, drinking water access — by country and year. Source data is FAO AQUASTAT.
- **API key:** Not required.
- **CORS:** Enabled — can be called from the client.
- **Validated indicators (Jul 2026):**
  - `ER.H2O.INTR.PC` — Renewable internal freshwater resources per capita (m³)
  - `ER.H2O.INTR.K3` — Renewable internal freshwater resources, total (billion m³)
  - `ER.H2O.FWTL.ZS` — Annual freshwater withdrawals, total (% of internal resources)
  - `ER.H2O.FWTL.K3` — Annual freshwater withdrawals, total (billion m³)
  - `ER.H2O.FWAG.ZS` / `ER.H2O.FWIN.ZS` / `ER.H2O.FWDM.ZS` — Withdrawals by sector: agriculture / industry / domestic (% of total)
  - `ER.H2O.FWST.ZS` — Level of water stress: withdrawal as a proportion of available freshwater resources (SDG 6.4.2)
  - `SH.H2O.SMDW.ZS` — People using safely managed drinking water services (% of population)
- Several of these (`ER.H2O.INTR.PC`, `ER.H2O.FWTL.ZS`, `ER.H2O.FWAG.ZS`, `SH.H2O.SMDW.ZS`) are already in the Postman World Bank collection under "🌊 Ocean & Water".
- **Caveat:** AQUASTAT-sourced values are carried forward between country updates — e.g. identical values for 2020–2022 are common. See Integration Notes.

| Field            | Details                        |
| ---------------- | ------------------------------ |
| Base URL         | `https://api.worldbank.org/v2` |
| Auth             | None                           |
| Free tier        | Yes                            |
| Rate limit       | None specified                 |
| Update frequency | Annual                         |
| Format           | JSON                           |

---

### 3. FAO AQUASTAT

- **URL:** https://www.fao.org/aquastat/en/ — dissemination platform: https://data.apps.fao.org/aquastat/
- **License:** ✅ Comercial/ads OK — CC BY 4.0 (FAO Statistical Database Terms of Use, applies to FAOSTAT and AQUASTAT). ⚠️ Some older FAO data catalog entries still show a legacy "CC BY-NC-SA 3.0 IGO" label; the current terms of use (CC BY 4.0) prevail.
- **Model:** Free. Web platform with CSV export and bulk download; per-variable CSVs also in the FAO data catalog (`data.apps.fao.org/catalog/`).
- **Data type:** Annual country series, reported in ~5-year questionnaire cycles.
- **Data:** 180+ variables for 200+ countries: renewable water resources (internal/external), withdrawals by sector and source, water stress, irrigation and drainage, wastewater treatment and reuse, environmental flow requirements, dams.
- **API key:** Not required.
- **Limitations:** The dissemination platform is a JS single-page app — there is no stable documented REST API. Use the CSV exports / catalog downloads, or consume AQUASTAT through OWID / World Bank (both republish it) for programmatic access.

| Field            | Details                                           |
| ---------------- | ------------------------------------------------- |
| Base URL         | https://data.apps.fao.org/aquastat/               |
| Auth             | None                                              |
| Free tier        | Yes                                               |
| Rate limit       | None                                              |
| Update frequency | Continuous review; country data in ~5-year cycles |
| Format           | CSV                                               |

---

### 4. Our World in Data — Poore & Nemecek (2018) Product Footprints

- **URL:** https://ourworldindata.org/environmental-impacts-of-food — CSV via grapher.
- **License:** ✅ Comercial/ads OK — CC BY (OWID processing; cite Poore & Nemecek 2018, _Science_).
- **Model:** Free (CC BY). Static dataset (study data, reference year 2010).
- **Data type:** Static; one value per food product (not a time series).
- **Data:** Freshwater withdrawals per kg of food product (L/kg), per 1,000 kcal, per 100 g of protein; scarcity-weighted water use variants. ~40 food products (beef, chicken, rice, almonds, chocolate, wine, etc.).
- **API key:** Not required.
- **Validated (Jul 2026):** `water-withdrawals-per-kg-poore` (liters per kilogram). Related charts: `freshwater-withdrawals-per-1000kcal`, `water-per-protein-poore`, `scarcity-water-per-kg-poore`.
- This is the primary commercial-safe source for the product-level dataset planned in `WATER_FOOTPRINT.md` (root).

| Field            | Details                               |
| ---------------- | ------------------------------------- |
| Base URL         | `https://ourworldindata.org/grapher/` |
| Auth             | None                                  |
| Free tier        | Yes                                   |
| Rate limit       | None                                  |
| Update frequency | Static (study snapshot)               |
| Format           | CSV, JSON                             |

---

### 5. Water Footprint Network — WaterStat

- **URL:** https://www.waterfootprint.org/resources-explained/ — publications & datasets: https://www.waterfootprint.org/publications/
- **License:** ⚠️ Solo no comercial (verificar) — datasets are free for research and education; WFN collates externally published sources and does not own all copyrights. Review per-dataset terms before commercial use.
- **Model:** Free downloads (Excel, PDF). No API.
- **Data type:** Static datasets (Mekonnen & Hoekstra studies, 1996–2005 baseline).
- **Data:** WaterStat: green/blue/grey water footprint of crops and derived products, animal products, national water footprints, international virtual water flows, water scarcity and pollution levels. Covers non-food products (cotton, leather, paper) absent from Poore & Nemecek.
- **API key:** Not required.

| Field            | Details                                      |
| ---------------- | -------------------------------------------- |
| Base URL         | https://www.waterfootprint.org/publications/ |
| Auth             | None                                         |
| Free tier        | Yes (research/education)                     |
| Rate limit       | None                                         |
| Update frequency | Static (published studies)                   |
| Format           | Excel, PDF                                   |

---

### 6. Academic & Corporate LCA Studies (electronics, vehicles, materials)

- **URL:** No single portal — per-study sources. Examples: Williams, Ayres & Heller (2002, _Environ. Sci. Technol._) for microchips; Apple Product Environmental Reports (https://www.apple.com/environment/) and Samsung sustainability reports for devices; academic LCA literature for steel, cement, glass, plastics, and cars.
- **License:** ⚠️ Varía por estudio — papers and corporate reports are copyrighted; individual data points can be cited with attribution (fair use), but full documents cannot be redistributed.
- **Model:** Static, manually curated. No API — each value is transcribed by hand with its citation.
- **Data type:** One value (or range) per product, from published life-cycle assessments.
- **Data:** Lifecycle water consumption of manufactured products: microchips (~32 L per 2 g chip — Williams et al. 2002), smartphones and laptops, cars, steel, cement, glass, PET. This is the only source category covering **technology and manufactured goods** — Poore & Nemecek covers food only, and WFN covers crops/textiles/paper.
- **Caveat:** Corporate environmental reports (Apple, Samsung) focus on carbon and usually report water at corporate/supply-chain level, not per device — use them for context and validation; per-product figures come mainly from academic LCA studies.

| Field            | Details                                       |
| ---------------- | --------------------------------------------- |
| Base URL         | N/A — per-study (journals, corporate reports) |
| Auth             | Varies (some papers paywalled)                |
| Free tier        | Partial (open-access papers, public reports)  |
| Rate limit       | N/A (no API)                                  |
| Update frequency | Static (published studies)                    |
| Format           | PDF                                           |

---

## Available Metrics

| Metric                                                                    | Providers                  |
| ------------------------------------------------------------------------- | -------------------------- |
| Annual freshwater withdrawals (billion m³)                                | OWID, World Bank, AQUASTAT |
| Water stress — SDG 6.4.2 (%)                                              | OWID, World Bank, AQUASTAT |
| Renewable freshwater resources (total / per capita)                       | OWID, World Bank, AQUASTAT |
| Withdrawals by sector (agriculture / industry / municipal)                | OWID, World Bank, AQUASTAT |
| Per-capita water withdrawals                                              | OWID                       |
| Global long-run freshwater use (since 1900)                               | OWID                       |
| Safely managed drinking water access (%)                                  | World Bank, OWID           |
| Wastewater treatment / reuse                                              | AQUASTAT                   |
| Product water footprint — food (L/kg, L/kcal, L/protein)                  | OWID Poore & Nemecek       |
| Product water footprint — crops, cotton, leather, paper (green/blue/grey) | Water Footprint Network    |
| Product water footprint — electronics, vehicles, materials (L/unit)       | Academic & corporate LCA   |

## Integration Notes

- **Recommended combination:** OWID grapher (water stress + withdrawals + resources per capita; CC BY, no key, CORS) for country series, World Bank API for on-demand REST queries per country, and OWID Poore & Nemecek for the product-level table.
- OWID and World Bank both republish AQUASTAT — credit **FAO AQUASTAT** as the underlying source in the attribution component (see I14 in `ROADMAP.md`).
- AQUASTAT country data arrives in ~5-year questionnaire cycles and is carried forward in between, so series look "stepped" (flat segments with identical values). Don't interpret those plateaus as real stability; consider showing only years with actual updates.
- The water-stress chart was renamed upstream: any saved URL using `water-stress-indicator` must switch to `freshwater-withdrawals-as-a-share-of-internal-resources` (the Postman OWID collection was already updated).
- Water Footprint Network data is research/education oriented — for the commercial product dataset prefer OWID Poore & Nemecek (CC BY) and cite the primary study per entry, as specified in `WATER_FOOTPRINT.md`.
- **Product dataset strategy** (per `WATER_FOOTPRINT.md`): there is no public API with per-product data across all categories — compile a static JSON at build time combining Poore & Nemecek (Food & Beverages), WFN (Textiles / crops-based Manufactured), and LCA studies (Technology, vehicles, materials), with `source`, `sourceUrl`, and `methodology` fields per entry.
