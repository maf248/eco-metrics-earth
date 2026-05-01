# Plastic Pollution

Tracks plastic waste generation, mismanagement rates, and ocean plastic accumulation by country and region. Includes single-use plastic data and recycling rates.

> Note: World Bank What a Waste also appears in `waste-recycling.md`.

## Providers

### 1. Our World in Data — Plastic Pollution

- **URL:** https://ourworldindata.org/plastic-pollution — grapher CSV: `https://ourworldindata.org/grapher/global-plastics-production.csv`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). Static downloadable.
- **Data:** Global plastics production, plastic waste by country, mismanaged plastic waste, plastic entering the ocean (Jambeck et al., Meijer et al.), microplastics.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | `https://ourworldindata.org/grapher/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Annual |
| Format | CSV, JSON |

---

### 2. World Bank — What a Waste 3.0 (Plastic Module)

- **URL:** https://www.worldbank.org/en/publication/what-a-waste — dataset: https://datacatalog.worldbank.org/search/dataset/0039597/
- **License:** ✅ Comercial/ads OK — CC BY (World Bank open data).
- **Model:** Free. Static download.
- **Data:** Managed/unmanaged plastics by country (~93 Mt/year mismanaged globally), plastic waste exports.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://datacatalog.worldbank.org/search/dataset/0039597/ |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Every ~8 years (major report editions) |
| Format | Excel, CSV |

---

### 3. NOAA Marine Debris Program

- **URL:** https://marinedebris.noaa.gov/research/monitoring-toolbox-data
- **License:** ✅ Comercial/ads OK — Public domain (NOAA).
- **Model:** Free. CSV downloadable.
- **Data:** Coastal debris surveys, Marine Debris Monitoring and Assessment Project (MDMAP) data.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://marinedebris.noaa.gov/research/monitoring-toolbox-data |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Periodic (field surveys) |
| Format | CSV |

---

### 4. The Ocean Cleanup — Global River Plastic Pollution Dataset (Meijer et al. 2021)

- **URL:** https://theoceancleanup.com/sources/ — paper: Meijer et al. 2021
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. Static download.
- **Data:** Plastic emissions by river and country; top 1,000 rivers account for 80% of ocean-bound plastic.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://theoceancleanup.com/sources/ |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Static (2021 dataset) |
| Format | CSV (published with paper) |

---

### 5. Plastic Atlas (Heinrich Böll Foundation)

- **URL:** https://www.boell.de/en/plasticatlas
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free. Infographics and aggregated dataset.
- **Data:** Production and pollution plastic aggregated dataset, infographics.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://www.boell.de/en/plasticatlas |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Per edition |
| Format | PDF, downloadable data |

---

### 6. Eurostat — Plastic Packaging Waste

- **URL:** https://ec.europa.eu/eurostat/databrowser/view/env_waspac
- **License:** ✅ Comercial/ads OK — CC BY 4.0.
- **Model:** Free.
- **Data:** Generation, recycling, and recovery of plastic packaging waste in the EU.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_waspac` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Annual |
| Format | JSON-stat |

---

## Available Metrics

| Metric | Providers |
|---|---|
| Global plastics production (annual) | OWID |
| Plastic waste by country | OWID, What a Waste |
| Mismanaged plastic waste | OWID, What a Waste |
| Plastic entering the ocean (by country) | OWID (Meijer / Jambeck) |
| Plastic emissions by river | Meijer et al. dataset |
| Coastal debris surveys | NOAA Marine Debris |
| EU plastic packaging recycling rates | Eurostat |

## Integration Notes

> **Note:** No real-time public API exists for "ocean plastic". The best strategy is combining static datasets: OWID + Meijer et al. + What a Waste, displayed as annual series with ISR caching.

- Fetch OWID and What a Waste CSVs at build time; cache with long `revalidate`.
- Eurostat returns JSON-stat — use a parsing library.
- NOAA Marine Debris data is survey-based (not continuous) — suitable for a static data snapshot.
- Meijer et al. river dataset is ideal for a map visualization of per-river plastic flow.
