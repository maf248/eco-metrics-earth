# Global Temperature

Tracks global and regional surface temperature anomalies over time. Key indicator for measuring the pace of climate change against pre-industrial baselines.

## Providers

### 1. NASA GISTEMP v4 (GISS Surface Temperature Analysis)

- **URL:** https://data.giss.nasa.gov/gistemp/
- **License:** ✅ Commercial/ads OK — Public domain.
- **Model:** Free, public domain. Static files updated monthly.
- **Data type:** Static downloadable, updated monthly.
- **Data:** Monthly/seasonal/annual temperature anomalies from 1880 (global, NH, SH, zonal). Formats: TXT, CSV, netCDF (2°×2° grid), Zarr v3, SBBX. Includes 200-member uncertainty ensemble (Lenssen et al. 2024).
- **API key:** Not required.
- **CORS:** Yes (static file downloads).
- **Example URL:** `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv`

| Field            | Details                                            |
| ---------------- | -------------------------------------------------- |
| Base URL         | `https://data.giss.nasa.gov/gistemp/tabledata_v4/` |
| Auth             | None                                               |
| Free tier        | Yes (public domain)                                |
| Rate limit       | None                                               |
| Update frequency | Monthly                                            |
| Format           | CSV, TXT, netCDF, Zarr                             |

---

### 2. NOAA Global Climate at a Glance

- **URL:** https://www.ncei.noaa.gov/cag/global/time-series/ — JSON endpoint: `https://www.ncei.noaa.gov/access/services/data/v1`
- **License:** ✅ Commercial/ads OK — Public domain (NOAA).
- **Model:** Free. REST with JSON output.
- **Data type:** Monthly and annual series from 1850.
- **Data:** Land+ocean, land-only, ocean-only temperature anomalies by hemisphere and region.
- **API key:** Not required.

| Field            | Details                                             |
| ---------------- | --------------------------------------------------- |
| Base URL         | `https://www.ncei.noaa.gov/access/services/data/v1` |
| Auth             | None                                                |
| Free tier        | Yes                                                 |
| Rate limit       | None specified                                      |
| Update frequency | Monthly                                             |
| Format           | JSON, CSV                                           |

---

### 3. Berkeley Earth

- **URL:** https://berkeleyearth.org/data/
- **License:** ✅ Commercial/ads OK — CC BY 4.0.
- **Model:** Free / open data. Static downloads.
- **Data type:** Static downloadable (TXT, netCDF).
- **Data:** Global, country-level, and city-level temperature series from 1750.
- **API key:** Not required.

| Field            | Details                         |
| ---------------- | ------------------------------- |
| Base URL         | https://berkeleyearth.org/data/ |
| Auth             | None                            |
| Free tier        | Yes                             |
| Rate limit       | None                            |
| Update frequency | Annual                          |
| Format           | TXT, netCDF                     |

---

### 4. Our World in Data — Temperature Anomalies

- **URL:** https://ourworldindata.org/grapher/temperature-anomaly — CSV: `https://ourworldindata.org/grapher/temperature-anomaly.csv?v=1&csvType=full`
- **License:** ✅ Commercial/ads OK — CC BY.
- **Model:** Free (CC BY). JSON metadata available alongside CSV.
- **Data type:** Static downloadable, updated periodically.
- **Data:** Global and hemispheric temperature anomalies based on HadCRUT, GISTEMP, and NOAA series.
- **API key:** Not required.
- **CORS:** Enabled for direct fetch.

| Field            | Details                                                      |
| ---------------- | ------------------------------------------------------------ |
| Base URL         | `https://ourworldindata.org/grapher/temperature-anomaly.csv` |
| Auth             | None                                                         |
| Free tier        | Yes                                                          |
| Rate limit       | None                                                         |
| Update frequency | Periodic (follows source datasets)                           |
| Format           | CSV, JSON                                                    |

---

### 5. DataHub.io Global Temp Time Series

- **URL:** https://datahub.io/core/global-temp
- **License:** ✅ Commercial/ads OK — Public Domain Dedication (PDDL).
- **Model:** Open data. Static.
- **Data type:** Static downloadable.
- **Data:** Monthly and annual GISTEMP + GCAG combined series (CSV/JSON).
- **API key:** Not required.

| Field            | Details                                                     |
| ---------------- | ----------------------------------------------------------- |
| Base URL         | https://datahub.io/core/global-temp                         |
| Annual CSV       | `https://datahub.io/core/global-temp/_r/-/data/annual.csv`  |
| Monthly CSV      | `https://datahub.io/core/global-temp/_r/-/data/monthly.csv` |
| Auth             | None                                                        |
| Free tier        | Yes                                                         |
| Rate limit       | None                                                        |
| Update frequency | Follows source datasets                                     |
| Format           | CSV, JSON                                                   |

---

## Available Metrics

| Metric                                        | Providers                                         |
| --------------------------------------------- | ------------------------------------------------- |
| Global temperature anomalies (monthly/annual) | NASA GISTEMP, NOAA, Berkeley Earth, OWID, DataHub |
| Hemispheric anomalies (NH / SH)               | NASA GISTEMP, NOAA, OWID                          |
| Land+ocean / land-only / ocean-only           | NOAA, OWID                                        |
| Country-level temperature series              | Berkeley Earth                                    |
| City-level temperature series                 | Berkeley Earth                                    |
| Uncertainty ensemble                          | NASA GISTEMP (200-member)                         |

## Integration Notes

- **Recommended approach:** Fetch NASA GISTEMP CSV at build-time (ISR `revalidate: 86400`) — public domain, no key, stable URL.
- OWID grapher CSV endpoint is a convenient harmonized source (HadCRUT + GISTEMP + NOAA) with CORS enabled.
- NOAA's JSON endpoint (`/access/services/data/v1`) can be queried server-side for filtered time ranges.
- All sources are static or periodically updated — suitable for ISR or build-time pre-fetching; no real-time streaming needed.
