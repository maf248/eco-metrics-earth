# CO₂ Emissions

Tracks carbon dioxide emissions by country, sector, and source. Includes historical trends, per-capita values, and cumulative totals relevant to climate change targets.

> Note: UK Carbon Intensity API also appears in `energy-sources.md`; World Bank API also appears in `waste-recycling.md` and `water-footprint.md`.

## Providers

### 1. Our World in Data — CO₂ and Greenhouse Gas Emissions Dataset

- **URL:** https://github.com/owid/co2-data
  - CSV: `https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.csv`
  - JSON: `https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.json`
  - XLSX: `https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.xlsx`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). Static downloadable updated periodically.
- **Data type:** Annual; one row per country-year (CSV) or array per country (JSON).
- **Data:** Annual emissions, per-capita, cumulative, consumption-based, by sector; other GHGs; energy mix; emissions intensity. Based on Global Carbon Project + Climate Watch + Energy Institute.
- **API key:** Not required.
- **CORS:** Enabled on grapher endpoints.

| Field | Details |
|---|---|
| Base URL | `https://nyc3.digitaloceanspaces.com/owid-public/data/co2/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Annual (follows GCP release) |
| Format | CSV, JSON, XLSX |

---

### 2. Global Carbon Project / Global Carbon Budget

- **URL:** https://globalcarbonbudget.org/carbonbudget/ — data on Zenodo: https://zenodo.org/
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. Static downloads (CSV/Excel) published on Zenodo.
- **Data:** Fossil emissions + land-use change + sinks, annually from 1750.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://zenodo.org/ (search "Global Carbon Budget") |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Annual |
| Format | CSV, Excel |

---

### 3. NOAA Global Monitoring Laboratory — Mauna Loa CO₂

- **URL:** https://gml.noaa.gov/ccgg/trends/data.html
- **License:** ✅ Comercial/ads OK — Public domain (NOAA).
- **Model:** Free. Static downloadable.
- **Data type:** Monthly and annual atmospheric CO₂ (Mauna Loa from 1958; global from 1979), CH₄, N₂O, SF₆, halogenated gases.
- **API key:** Not required.
- **Validated (May 2026):** Monthly CO₂ data available through April 2026. CH₄ and N₂O annual data through 2025.

| Field | Details |
|---|---|
| Base URL | `https://gml.noaa.gov/webdata/ccgg/trends/co2/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Monthly |
| Format | TXT, CSV |

---

### 4. Climate TRACE

- **URL:** https://climatetrace.org/data
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. Static downloads + API v7.
- **Data:** Facility-level emissions inventory derived from satellites + AI, by sector. Covers 2015–2024 (annual) and 2021–2024 (monthly).
- **API key:** Not required for direct downloads; API v7 available.

| Field | Details |
|---|---|
| Base URL | https://climatetrace.org/data |
| Auth | None (downloads); API v7 available |
| Free tier | Yes |
| Rate limit | None (downloads) |
| Update frequency | Annual (2015–2024); monthly (2021–2024) |
| Format | CSV (downloads); JSON (API) |

---

### 5. EU EDGAR (Emissions Database for Global Atmospheric Research)

- **URL:** https://edgar.jrc.ec.europa.eu/
- **License:** ✅ Comercial/ads OK — CC BY 4.0 (European Commission).
- **Model:** Free.
- **Data:** GHG and pollutant emissions by country, sector, and year (1970–present). Excel and netCDF (0.1° grid).
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://edgar.jrc.ec.europa.eu/ |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Annual |
| Format | Excel, netCDF |

---

### 6. World Bank Climate Change API

- **URL:** `https://api.worldbank.org/v2/country/{iso}/indicator/EN.GHG.CO2.MT.CE.AR5?format=json`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. REST + JSON.
- **Data:** Total CO₂ emissions, per-capita, intensity, etc., by country and year.
- **API key:** Not required.
- **CORS:** Enabled — can be called from the client.
- **Validated indicators (May 2026):**
  - **Total emissions (working):** `EN.GHG.CO2.MT.CE.AR5` (CO2), `EN.GHG.ALL.MT.CE.AR5` (all GHG), `EN.GHG.CH4.MT.CE.AR5` (methane), `EN.GHG.N2O.MT.CE.AR5` (nitrous oxide)
  - **CO2 sectoral breakdowns (working):** `EN.GHG.CO2.AG.*` (agriculture), `EN.GHG.CO2.BU.*` (buildings), `EN.GHG.CO2.FE.*` (fugitive), `EN.GHG.CO2.IC.*` (industrial combustion), `EN.GHG.CO2.IP.*` (industrial processes)
  - **Non-existent codes:** Sector breakdowns for all GHG (`EN.GHG.AGRI.*`, `EN.GHG.WAST.*`, etc.) do not exist; only CO2 sectoral data available.

| Field | Details |
|---|---|
| Base URL | `https://api.worldbank.org/v2` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Annual |
| Format | JSON |

---

### 7. UK Carbon Intensity API

- **URL:** https://api.carbonintensity.org.uk/ (UK National Energy System Operator — NESO)
- **License:** ✅ Comercial/ads OK — CC BY 4.0.
- **Model:** Free. JSON, no API key, CORS enabled.
- **Data:** Carbon intensity of the UK electricity grid in real-time (gCO₂/kWh). Includes national + regional data (14 regions plus England, Scotland, Wales aggregates).
- **API key:** Not required.
- **CORS:** Enabled.

| Field | Details |
|---|---|
| Base URL | `https://api.carbonintensity.org.uk` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Every 30 minutes |
| Format | JSON |

---

## Available Metrics

| Metric | Providers |
|---|---|
| Annual CO₂ emissions by country | OWID, World Bank, EDGAR |
| Per-capita CO₂ emissions | OWID, World Bank |
| Cumulative / consumption-based emissions | OWID |
| Emissions by sector | OWID, Climate TRACE, EDGAR |
| Facility-level emissions (satellite-derived) | Climate TRACE |
| GHG budget (fossil + land-use + sinks) | Global Carbon Project |
| Atmospheric CO₂ concentration (ppm) | NOAA Mauna Loa |
| CH₄, N₂O, SF₆ concentrations | NOAA Mauna Loa |
| Real-time grid carbon intensity (UK) | UK Carbon Intensity API |

## Integration Notes

- **Recommended combination:** OWID CO₂ dataset (country-year series, CC BY) + NOAA Mauna Loa (atmospheric ppm trend).
- Fetch OWID and GCP CSVs at build-time with long ISR revalidation.
- World Bank API and UK Carbon Intensity have CORS enabled — safe to call client-side, but a server-side proxy adds caching benefits.
- EDGAR netCDF grids require server-side processing for map visualizations.
- Climate TRACE is the best option for facility-level / sector granularity.
