# Waste & Recycling

Tracks municipal solid waste generation, recycling rates, landfill usage, and waste composition by country and region. Includes e-waste and hazardous waste data where available.

> Note: World Bank What a Waste also appears in `plastic-pollution.md`; World Bank API also appears in `co2-emissions.md` and `water-footprint.md`.

## Providers

### 1. World Bank — What a Waste Global Database

- **URL:** https://datacatalog.worldbank.org/search/dataset/0039597/what-a-waste-global-database — portal: https://datatopics.worldbank.org/what-a-waste/
- **License:** ✅ Comercial/ads OK — CC BY (World Bank open data).
- **Model:** Free (Public). Static downloads (Excel/CSV). Reports 2018 (v2.0) and 2026 (v3.0).
- **Data type:** Static, periodically updated.
- **Data:** 217 countries and 262 cities. Waste generation, composition, collection, treatment, disposal, recycling, plastics, financing, informal workers.
- **API key:** Not required.

| Field            | Details                                                   |
| ---------------- | --------------------------------------------------------- |
| Base URL         | https://datacatalog.worldbank.org/search/dataset/0039597/ |
| Auth             | None                                                      |
| Free tier        | Yes                                                       |
| Rate limit       | None                                                      |
| Update frequency | Every ~8 years (major report editions)                    |
| Format           | Excel, CSV                                                |

---

### 2. World Bank Open Data API

- **URL:** `https://api.worldbank.org/v2/country/{iso}/indicator/{code}?format=json`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. REST + JSON.
- **Data:** Waste-related indicators (e.g. `EN.POP.SLUM.UR.ZS`), solid waste management, urbanization.
- **API key:** Not required.
- **CORS:** Enabled — can be called from the client.
- **Validated indicators (May 2026):** Total GHG indicators work (`EN.GHG.CO2.MT.CE.AR5`, `EN.GHG.ALL.MT.CE.AR5`, `EN.GHG.CH4.MT.CE.AR5`, `EN.GHG.N2O.MT.CE.AR5`). Waste-specific GHG breakdown (`EN.GHG.WAST.*`) does not exist in API. Use OWID CH₄ from waste (ID 1146696) instead.

| Field            | Details                        |
| ---------------- | ------------------------------ |
| Base URL         | `https://api.worldbank.org/v2` |
| Auth             | None                           |
| Free tier        | Yes                            |
| Rate limit       | None specified                 |
| Update frequency | Annual                         |
| Format           | JSON                           |

---

### 3. Eurostat Waste Statistics API

- **URL:** `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_wasmun` (JSON-stat format)
- **License:** ✅ Comercial/ads OK — CC BY 4.0.
- **Model:** Free.
- **Data:** Waste generation and treatment by European country, by stream (packaging, electronics, etc.); recycling rates.
- **API key:** Not required.

| Field            | Details                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| Base URL         | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/` |
| Auth             | None                                                                   |
| Free tier        | Yes                                                                    |
| Rate limit       | None specified                                                         |
| Update frequency | Annual                                                                 |
| Format           | JSON-stat                                                              |

---

### 4. EPA — Waste Reduction Model & Facts and Figures (US)

- **URL:** https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling
- **License:** ✅ Comercial/ads OK — Public domain (US Government).
- **Model:** Free. Static downloadable (Excel/PDF).
- **Data:** Waste generation, recovery, composting, incineration, landfill in the US.
- **API key:** Not required.

| Field            | Details                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| Base URL         | https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling |
| Auth             | None                                                                      |
| Free tier        | Yes                                                                       |
| Rate limit       | None                                                                      |
| Update frequency | Annual                                                                    |
| Format           | Excel, PDF                                                                |

---

### 5. Our World in Data — Waste & Recycling

- **URL:** https://ourworldindata.org/waste-management — CSV via grapher — API v1: `https://api.ourworldindata.org/v1/indicators/{id}.data.json`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). CSV downloadable.
- **Data:** Recycling rates, per-capita waste generation, mismanaged waste, plastic entering the ocean.
- **API key:** Not required.
- **Validated endpoint (May 2026):** CH₄ emissions from waste sector (ID 1146696): 1990–2023 time series, 205 countries. Best longitudinal waste indicator available.

| Field            | Details                               |
| ---------------- | ------------------------------------- |
| Base URL         | `https://ourworldindata.org/grapher/` |
| Auth             | None                                  |
| Free tier        | Yes                                   |
| Rate limit       | None                                  |
| Update frequency | Annual                                |
| Format           | CSV, JSON                             |

---

## Available Metrics

| Metric                                       | Providers                    |
| -------------------------------------------- | ---------------------------- |
| Waste generation (kg/capita/day)             | What a Waste, OWID           |
| Waste composition (organic, paper, plastic…) | What a Waste                 |
| Recycling rates                              | What a Waste, Eurostat, OWID |
| Landfill / incineration rates                | What a Waste, EPA, Eurostat  |
| Collection coverage                          | What a Waste                 |
| EU waste streams (packaging, WEEE, etc.)     | Eurostat                     |
| US waste generation & recovery               | EPA                          |
| World Bank waste indicators                  | World Bank API               |
| Mismanaged waste                             | OWID                         |

## Integration Notes

- **Recommended combination:** World Bank What a Waste CSV (global coverage) + Eurostat API (EU depth) + OWID (harmonized annual series).
- What a Waste is a static dataset — download at build time.
- Eurostat returns JSON-stat format; parse with a library like `jsonstat-euro` or `jsonstat.js`.
- World Bank API has CORS enabled — fine for direct client calls, but caching server-side is preferred.
- EPA data is US-only and available as Excel — pre-process at build time.
