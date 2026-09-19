# Water Footprint

Tracks the water consumed to produce everyday goods — food, textiles, technology, vehicles, construction materials (product water footprint, in liters per unit or per kg) — which is the core concept of this category. Also covers the macro context: freshwater availability, withdrawals, and water stress by country and sector (agriculture, industry, municipal).

> Note: World Bank API also appears in `co2-emissions.md` and `waste-recycling.md`. The product-level dataset plan (static JSON of ~30–50 products) lives in `docs/planning/water-footprint.md`.

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
- This is the primary commercial-safe source for the product-level dataset planned in `docs/planning/water-footprint.md`.

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
- **⚠️ Retired citations (Sep 2026):** the dataset previously carried two entries (Smartphone, Laptop) citing Apple Product Environmental Reports for per-device water, and five entries citing `"Water Footprint Network (various)"`. Neither citation supports its figure — the Apple PERs do not publish per-device water (see the caveat above), and an organisation name without a publication is not retrievable. The three construction materials were re-sourced to Gerbens-Leenes et al. 2018 (provider 7); the other four entries were removed rather than carry an unverifiable number. They may return when a citable per-unit value is found.

| Field            | Details                                       |
| ---------------- | --------------------------------------------- |
| Base URL         | N/A — per-study (journals, corporate reports) |
| Auth             | Varies (some papers paywalled)                |
| Free tier        | Partial (open-access papers, public reports)  |
| Rate limit       | N/A (no API)                                  |
| Update frequency | Static (published studies)                    |
| Format           | PDF                                           |

---

### 7. Gerbens-Leenes, Hoekstra & Bosman (2018) — Construction Materials

- **URL:** https://doi.org/10.1016/j.wri.2017.11.002 — _Water Resources and Industry_ 19:1–12. Underlying thesis (free full text): https://essay.utwente.nl/69751/
- **License:** ⚠️ Cita por dato — the article is CC BY-NC-ND 4.0 on the University of Groningen portal; individual values can be cited with attribution, the document cannot be redistributed.
- **Model:** Static, manually curated. No API.
- **Data type:** One blue and one grey value per material.
- **Data:** Blue and grey water footprints of unalloyed steel (11 / 2,300 L/kg), chromium-nickel alloyed steel (77 / 1,500 L/kg), ordinary Portland cement CEM I (2.0–2.6 / 0.63 L/kg), Portland composite cement CEM II/B (1.7–2.1 / 0.45 L/kg), soda-lime float glass (5.8 / 1,300 L/kg).
- **Validated (Sep 2026):** values transcribed from the conclusions of the underlying Bosman (2016) University of Twente thesis, which the paper reports.
- **Note:** for all three materials the grey water footprint is 20–220× the blue. The dataset stores the **blue** figure and states the grey figure in `methodology`, so the number stays comparable with other `blue` entries.
- This supersedes the retired `"Water Footprint Network (various)"` citations for steel, cement and glass.

| Field            | Details                             |
| ---------------- | ----------------------------------- |
| Base URL         | N/A — journal article               |
| Auth             | None                                |
| Free tier        | Yes (open-access underlying thesis) |
| Rate limit       | N/A (no API)                        |
| Update frequency | Static (published study)            |
| Format           | PDF                                 |

---

### 8. AI and Computing Water Footprint

Three sources, each reporting water per unit of computing work. They disagree by orders of magnitude **because they draw the system boundary differently** — that disagreement is the reason the dataset carries a `waterType` discriminator.

- **Google (2025), _Measuring the environmental impact of delivering AI at Google Scale_** — https://arxiv.org/abs/2508.15734
  - **License:** ⚠️ Cita por dato — arXiv preprint, citable with attribution.
  - **Data:** Median Gemini Apps text prompt = 0.26 mL water, 0.24 Wh, 0.03 gCO2e. **Scope:** on-site data-centre cooling only; excludes the indirect water of electricity generation. Mapped to `lifecycle-onsite`.
- **Li, Yang, Islam & Ren (2025), _Making AI Less "Thirsty"_, Communications of the ACM 68:54–63** — https://doi.org/10.1145/3724499 (preprint: https://arxiv.org/abs/2304.03271)
  - **License:** ⚠️ Cita por dato — peer-reviewed article, citable with attribution.
  - **Data:** Training GPT-3 in Microsoft's U.S. data centres consumes 5.4 million L total, including 700,000 L scope-1 on-site. GPT-3 consumes a 500 mL bottle per ~10–50 medium-length responses. Also projects global AI water withdrawal at 4.2–6.6 billion m³ in 2027 (macro — not in the product dataset).
  - **Scope:** on-site (scope 1) figures map to `lifecycle-onsite`; totals including electricity-embodied water map to `lifecycle-total`.
- **de Vries (2023), _Bitcoin's growing water footprint_, Cell Reports Sustainability** — https://doi.org/10.1016/j.crsus.2023.100004
  - **License:** ⚠️ Cita por dato — peer-reviewed commentary, citable with attribution.
  - **Data:** ~16,000 L per Bitcoin transaction (2021 average); annual Bitcoin water footprint 1,573.7 GL in 2021. Mapped to `lifecycle-total`.

- **⚠️ Reading these together:** the Google per-prompt figure (0.26 mL) and the Li et al. per-response figure (~10–50 mL) are **not** a contradiction and must not be presented as competing estimates of the same quantity. The IEA estimates ~60 % of data-centre water consumption is indirect, which accounts for most of the gap. Always show the `waterType` alongside the value.

| Field            | Details                            |
| ---------------- | ---------------------------------- |
| Base URL         | N/A — journal articles / preprints |
| Auth             | None                               |
| Free tier        | Yes (open access)                  |
| Rate limit       | N/A (no API)                       |
| Update frequency | Static (published studies)         |
| Format           | PDF                                |

---

### 9. Candidates not yet integrated

Researched Sep 2026, deferred to follow-up changes — recorded here so the work is not repeated:

- **NREL / life-cycle water per MWh** — Macknick et al. (2012) _Environ. Res. Lett._ 7:045802 and Meldrum et al. (2013) ERL 8:015031. Litres per MWh by generation technology (coal, gas, nuclear, PV, wind, CSP, geothermal). Open access. This is what makes the _indirect_ water of computing computable, and the natural bridge to the `energy-sources` category.
- **WRI Aqueduct 4.0** — https://www.wri.org/data/aqueduct-global-maps-40-data, repo https://github.com/wri/Aqueduct40. ✅ **CC BY 4.0** — commercial-safe. 13 baseline water-risk indicators at catchment resolution plus CMIP6 projections for 2030/2050/2080. CSV + geospatial download, no API. The only researched source offering sub-national resolution.
- **Lithium extraction water footprint** — Nature Reviews Earth & Environment (2022) on direct lithium extraction; a 2024 cradle-to-gate study of Salar de Atacama (442 m³ world-eq per tonne under AWARE); and a study of Argentina's salt flats. Regionally relevant; methodologies vary widely, so each entry needs its accounting basis stated.
- **AWARE / scarcity weighting (WULCA)** — not a new dataset but a multiplier: 1,000 L in Iceland is not 1,000 L in Atacama. OWID already publishes `scarcity-water-per-kg-poore`.

---

## Available Metrics

| Metric                                                                    | Providers                                  |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| Annual freshwater withdrawals (billion m³)                                | OWID, World Bank, AQUASTAT                 |
| Water stress — SDG 6.4.2 (%)                                              | OWID, World Bank, AQUASTAT                 |
| Renewable freshwater resources (total / per capita)                       | OWID, World Bank, AQUASTAT                 |
| Withdrawals by sector (agriculture / industry / municipal)                | OWID, World Bank, AQUASTAT                 |
| Per-capita water withdrawals                                              | OWID                                       |
| Global long-run freshwater use (since 1900)                               | OWID                                       |
| Safely managed drinking water access (%)                                  | World Bank, OWID                           |
| Wastewater treatment / reuse                                              | AQUASTAT                                   |
| Product water footprint — food (L/kg, L/kcal, L/protein)                  | OWID Poore & Nemecek                       |
| Product water footprint — crops, cotton, leather, paper (green/blue/grey) | Water Footprint Network                    |
| Product water footprint — electronics (L/unit)                            | Academic LCA                               |
| Product water footprint — steel, cement, glass (blue, L/kg)               | Gerbens-Leenes et al. 2018                 |
| Water per unit of computing — AI prompt, AI training, Bitcoin tx (L)      | Google 2025, Li et al. 2025, de Vries 2023 |

## Integration Notes

- **Recommended combination:** OWID grapher (water stress + withdrawals + resources per capita; CC BY, no key, CORS) for country series, World Bank API for on-demand REST queries per country, and OWID Poore & Nemecek for the product-level table.
- OWID and World Bank both republish AQUASTAT — credit **FAO AQUASTAT** as the underlying source in the attribution component (see I14 in `ROADMAP.md`).
- AQUASTAT country data arrives in ~5-year questionnaire cycles and is carried forward in between, so series look "stepped" (flat segments with identical values). Don't interpret those plateaus as real stability; consider showing only years with actual updates.
- The water-stress chart was renamed upstream: any saved URL using `water-stress-indicator` must switch to `freshwater-withdrawals-as-a-share-of-internal-resources` (the Postman OWID collection was already updated).
- Water Footprint Network data is research/education oriented — for the commercial product dataset prefer OWID Poore & Nemecek (CC BY) and cite the primary study per entry, as specified in `docs/planning/water-footprint.md`.
- **Water type is part of the contract.** Every dataset entry declares a `waterType` (`blue`, `green-blue-grey`, `lifecycle-onsite`, `lifecycle-total`). A value without its measurement scope is not usable: Poore & Nemecek publishes blue water only, Mekonnen & Hoekstra publishes green + blue + grey, and LCA sources differ on whether electricity-embodied water is counted. Beef is ~1,451 L/kg on the P&N basis and ~15,400 L/kg on the M&H basis — the same product, a 10× difference, entirely from scope. Never sort or compare across water types without surfacing the type.
- **Citation rule.** A `source` must name a retrievable publication, and a `sourceUrl` must resolve to it. An organisation name alone (`"Water Footprint Network (various)"`) is not a citation. A source must not be cited for a figure it does not report. Where no primary source supports a per-unit figure, drop the entry rather than publish an unverifiable number.
- **Product dataset strategy** (per `docs/planning/water-footprint.md`): ✅ Phases 1–5 complete. A static JSON dataset of 53 products across 5 categories (Food & Beverages 38, Textiles 6, Technology 1, Manufactured 3, Digital & Computing 5) is compiled in `apps/api/src/modules/water-footprint/data/water-footprint.json` and served through `GET /api/v1/water-footprint/products?category=`. All entries are commercial-safe (CC BY or citable from open-access papers), declare a `waterType`, and carry `source`, `sourceUrl` and `methodology` fields.
