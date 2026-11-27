# Ocean Health

Tracks ocean-related indicators including sea surface temperature, acidity (pH), sea level rise, ocean heat content, coral reef coverage, and marine biodiversity indices.

The live page (`/ocean-health/`) uses three providers, one BFF endpoint each (`/api/v1/ocean-health/*`), so an outage of one provider only affects its own section. They are listed first; the candidates that are documented but **not integrated** follow.

## Providers in use

### In use 1. Copernicus Climate Pulse (C3S, ERA5)

- **URL:** https://pulse.climate.copernicus.eu — file: `https://sites.ecmwf.int/data/climatepulse/data/series/era5_daily_series_sst_60S-60N_ocean.csv`
- **License:** ✅ Commercial/ads OK — CC BY 4.0. Credit: "Contains modified Copernicus Climate Change Service information", with the no-liability statement of the Copernicus license text (both come from the API payload and are shown next to the chart).
- **Terms check (Nov 2026):** the Climate Pulse Credits page only requires "clear and visible attribution to the Copernicus programme" and names no licence of its own; the series is derived from ERA5, whose Climate Data Store licence is CC BY 4.0, so the site reuses the ERA5 licence, notice and disclaimer already used by `global-temperature`, plus the Hersbach et al. (2020) citation from the Credits page.
- **Model:** Free. One CSV file, no API key, no documented rate limit.
- **Data:** Daily mean sea surface temperature of the ocean between 60°S and 60°N (ocean only) since 1979, the daily 1991–2020 climatology, the daily anomaly against it, and a `PRELIMINARY` / `FINAL` status per day.
- **Cadence:** Daily, about two days behind real time (the file header states the last days are computed from ERA5 data not yet in the Climate Data Store; preliminary values can still change slightly).
- **Limitations:** ~650 KB and ~17,500 rows, so the API reduces it (calendar-day alignment, record, latest and the last 90 days) and never ships it to the browser. Not an operational service: layout changes are caught by the parser (header and `# Units:` line are validated). Global means only; no regional breakdown.

| Field            | Details                                                                           |
| ---------------- | --------------------------------------------------------------------------------- |
| Base URL         | `https://sites.ecmwf.int/data/climatepulse/data/series`                           |
| Auth             | None                                                                              |
| Free tier        | Yes                                                                               |
| Rate limit       | None specified (the API caches 6 h and probes with `HEAD`)                        |
| Update frequency | Daily (about two days behind)                                                     |
| Format           | CSV with `#` comment header                                                       |
| API settings     | `COPERNICUS_CLIMATE_PULSE_BASE_URL`, `COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS` |

---

### In use 2. Our World in Data charts (already integrated for the other categories)

- **URL:** https://ourworldindata.org — grapher CSVs `https://ourworldindata.org/grapher/<slug>.csv` and indicator metadata `https://api.ourworldindata.org/v1/indicators/<id>.metadata.json`.
- **License:** ✅ Commercial/ads OK — CC BY 4.0 (OWID as processor); each chart's upstream producer is credited from the payload with the license it asks for.
- **Cadence:** Updated by OWID (annual series, one revision a year or so); the API caches 24 h.
- **Charts used:**

| Chart slug (`/grapher/…`)         | Indicator | Shows                                                                                     | Upstream producer and license                                                                     |
| --------------------------------- | --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `sea-surface-temperature-anomaly` | 1357160   | Annual SST anomaly vs 1861–1890, World, Northern and Southern Hemisphere, with 95% bounds | Met Office Hadley Centre, HadSST — Open Government Licence v3.0                                   |
| `ocean-heat-content-upper`        | 1357159   | Ocean heat content 0–700 m, World, four sources (IAP, NOAA, MRI/JMA, CSIRO), 10²² J       | NOAA NCEI (CC BY 4.0) and the US EPA (public domain); IAP, MRI/JMA and CSIRO are named per series |
| `ocean-heat-top-2000m`            | 1357158   | Ocean heat content 0–2000 m, World, three sources (NOAA, MRI/JMA, IAP), 10²² J            | Same as above                                                                                     |
| `seawater-ph`                     | 1357137   | Ocean pH at Hawaii: monthly measurement and rolling yearly average                        | Hawaii Ocean Time-series, SOEST, University of Hawaii — public domain                             |

- **Requesting:** all with `csvType=filtered&useColumnShortNames=true&tab=chart`; the anomaly needs `country=OWID_WRL~OWID_NH~OWID_SH` (the default request returns World only); the heat charts `country=OWID_WRL`; `seawater-ph` is date-indexed (`entity,day,…`, no `code`) with no `country` and no `time`.
- **Limitations:**
  - The annual series are capped at the previous UTC year by the API (the current year is partial).
  - Each ocean heat content source covers a different span and uses its **own reference period** (OWID states none): compare shape and trend, not level. In the captured data CSIRO ends in 2015, IAP and MRI/JMA in 2020 and NOAA continues.
  - The OWID pH series **ends in December 2024** at the time of writing.
  - One monitoring site (Station ALOHA, north of Hawaii) is not a global average.

| Field            | Details                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| Base URL         | `https://ourworldindata.org/grapher` and `https://api.ourworldindata.org/v1` |
| Auth             | None                                                                         |
| Free tier        | Yes                                                                          |
| Update frequency | Annual / revised by OWID                                                     |
| Format           | CSV (grapher), JSON (indicator metadata)                                     |

---

### In use 3. NOAA Laboratory for Satellite Altimetry (LSA)

- **URL:** https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/ — file: `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_ref_90.csv`
- **License:** ✅ Commercial/ads OK — public domain (U.S. Government work). The file's own `#comment` header asks for this acknowledgment in publications and web pages, which the page prints verbatim: "Altimetry data are provided by NOAA Laboratory for Satellite Altimetry."
- **Model:** Free. One CSV file, no API key.
- **Data:** Global mean sea level anomaly (annual signals removed, mm) per altimetry mission (TOPEX/Poseidon, Jason-1, Jason-2, Jason-3, Sentinel-6 Michael Freilich) from decimal years, plus the long-term trend in the `#trend` header line (3.11 mm/year, no glacial isostatic adjustment correction). The BFF adds each mission's calendar-year mean (2 decimals) for the page's data table; the chart draws every observation.
- **Limitations:**
  - **NOAA STAR labels its data and images "for experimental use only"** (not official operational NOAA products); the page shows that disclaimer next to the chart.
  - **The feed ended in February 2025**: the file was last modified on 19 Feb 2025 and its last observation is from mid-February 2025. The page derives its end-date note from the data, so it stays true if NOAA resumes updating.
  - The file has no timestamp, so the API reports the retrieval time as the data's date (`lastUpdatedBasis: 'retrieval'`).
  - The parser requires the `#trend` line and the `year` header: a changed layout is a provider error, never a mislabelled chart.

| Field            | Details                                                       |
| ---------------- | ------------------------------------------------------------- |
| Base URL         | `https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr`  |
| Auth             | None                                                          |
| Free tier        | Yes                                                           |
| Rate limit       | None specified (the API caches 7 days and probes with `HEAD`) |
| Update frequency | None since February 2025                                      |
| Format           | CSV with `#` comment header                                   |
| API settings     | `NOAA_LSA_BASE_URL`, `NOAA_LSA_CACHE_TTL_SECONDS`             |

---

## Checked and not integrated

- **OWID `sea-level`** stops at 2020-Q4 and **OWID `coral-bleaching-events`** at 2016: too old for a live page.
- **FAO fish-stock charts on OWID** (CC BY-NC-SA) and **Sea Around Us** catch data (CC BY-NC) are **not commercial-safe**: the site shows ads, so they are never integrated.
- The candidate providers below stay documented as reference only.

## Candidate providers (reference, not integrated)

### 1. NOAA Coral Reef Watch (CRW) — CoralTemp

- **URL:** https://coralreefwatch.noaa.gov/ — data: https://www.ncei.noaa.gov/products/coral-reef-watch
- **License:** ✅ Commercial/ads OK — Public domain (NOAA).
- **Model:** Free. NetCDF + PNG files.
- **Data type:** Real-time (daily) + reanalysis from 1985.
- **Data:** Daily global SST at 5 km (CoralTemp), SST anomaly, HotSpot, Degree Heating Week (DHW), Bleaching Alert Area (5 levels), seasonal bleaching forecast, marine heatwave, disease risk, larval connectivity.
- **API key:** Not required (HTTPS/FTP file access).
- **Limitations:** Data in netCDF — requires server-side processing.

| Field            | Details                                            |
| ---------------- | -------------------------------------------------- |
| Base URL         | `https://coastwatch.pfeg.noaa.gov/erddap/griddap/` |
| Auth             | None                                               |
| Free tier        | Yes                                                |
| Rate limit       | None                                               |
| Update frequency | Daily                                              |
| Format           | netCDF, PNG                                        |

---

### 2. NOAA OISST (Optimum Interpolation SST)

- **URL:** https://www.ncei.noaa.gov/products/optimum-interpolation-sst
- **License:** ✅ Commercial/ads OK — Public domain (NOAA).
- **Model:** Free.
- **Data type:** Daily global SST from 1981.
- **Data:** Sea surface temperature at 0.25° resolution, from 1981 to present.
- **API key:** Not required.

| Field            | Details                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| Base URL         | `https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/` |
| Auth             | None                                                                            |
| Free tier        | Yes                                                                             |
| Rate limit       | None                                                                            |
| Update frequency | Daily                                                                           |
| Format           | netCDF                                                                          |

---

### 3. NOAA ERDDAP Servers

- **URL:** https://coastwatch.pfeg.noaa.gov/erddap/
- **License:** ✅ Commercial/ads OK — Public domain (NOAA).
- **Model:** Free. REST with JSON, CSV, GeoJSON, netCDF output.
- **Data type:** Hundreds of oceanographic datasets.
- **Data:** Chlorophyll, salinity, currents, wind, SST, dissolved oxygen, and much more.
- **API key:** Not required.
- **CORS:** Enabled — ideal for Next.js (can be called server-side or client-side).

| Field            | Details                                   |
| ---------------- | ----------------------------------------- |
| Base URL         | `https://coastwatch.pfeg.noaa.gov/erddap` |
| Auth             | None                                      |
| Free tier        | Yes                                       |
| Rate limit       | None specified                            |
| Update frequency | Varies by dataset (hourly to daily)       |
| Format           | JSON, CSV, GeoJSON, netCDF                |

---

### 4. Open-Meteo Marine API

- **URL:** `https://marine-api.open-meteo.com/v1/marine`
- **License:** ⚠️ Non-commercial only — CC BY-NC 4.0. Commercial use requires a paid plan.
- **Model:** Free for non-commercial use.
- **Data type:** Forecast. JSON.
- **Data:** Wave height, period, direction, marine wind.
- **API key:** Not required.
- **CORS:** Enabled.

| Field            | Details                                       |
| ---------------- | --------------------------------------------- |
| Base URL         | `https://marine-api.open-meteo.com/v1/marine` |
| Auth             | None                                          |
| Free tier        | Yes (non-commercial)                          |
| Rate limit       | < 10,000 req/day per IP (recommended)         |
| Update frequency | Hourly forecast                               |
| Format           | JSON                                          |

---

### 5. Ocean Health Index

- **URL:** https://oceanhealthindex.org/global-scores/data-download/
- **License:** ✅ Commercial/ads OK — CC BY.
- **Model:** Static downloadable (CSV).
- **Data type:** Annual scores.
- **Data:** Annual scores (0–100) per country across 10 goals: food provision, artisanal fishing, natural products, carbon storage, coastal protection, tourism, livelihoods, sense of place, clean waters, biodiversity.
- **API key:** Not required.

| Field            | Details                                                   |
| ---------------- | --------------------------------------------------------- |
| Base URL         | https://oceanhealthindex.org/global-scores/data-download/ |
| Auth             | None                                                      |
| Free tier        | Yes                                                       |
| Rate limit       | None                                                      |
| Update frequency | Annual                                                    |
| Format           | CSV                                                       |

---

### 6. NOAA Tides & Currents API

- **URL:** https://api.tidesandcurrents.noaa.gov/api/prod/
- **License:** ✅ Commercial/ads OK — Public domain (NOAA).
- **Model:** Free. JSON. No API key required.
- **Data:** Sea levels, tide predictions, water temperature, salinity.
- **API key:** Not required.
- **Validated (May 2026):** Sea level and tide prediction endpoints confirmed working.

| Field            | Details                                                     |
| ---------------- | ----------------------------------------------------------- |
| Base URL         | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` |
| Auth             | None                                                        |
| Free tier        | Yes                                                         |
| Rate limit       | None specified                                              |
| Update frequency | Near real-time                                              |
| Format           | JSON                                                        |

---

## Available Metrics

### In use

| Metric                                                                | Provider                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Daily sea surface temperature, 60°S–60°N, with climatology and record | Copernicus Climate Pulse                                   |
| Annual SST anomaly (World and hemispheres, 1861–1890 baseline)        | Our World in Data (HadSST, Met Office)                     |
| Ocean heat content 0–700 m and 0–2000 m, per source                   | Our World in Data (NOAA NCEI, US EPA; IAP, MRI/JMA, CSIRO) |
| Global mean sea level per altimetry mission and trend                 | NOAA Laboratory for Satellite Altimetry                    |
| Ocean pH at Hawaii (monthly and rolling yearly average)               | Our World in Data (Hawaii Ocean Time-series)               |

### Candidates (not integrated)

| Metric                               | Providers                                     |
| ------------------------------------ | --------------------------------------------- |
| Sea surface temperature (SST)        | NOAA CRW / CoralTemp, NOAA OISST, NOAA ERDDAP |
| SST anomaly                          | NOAA CRW                                      |
| Degree Heating Week (DHW)            | NOAA CRW                                      |
| Coral Bleaching Alert Area           | NOAA CRW                                      |
| Chlorophyll concentration            | NOAA ERDDAP                                   |
| Salinity                             | NOAA ERDDAP, NOAA Tides & Currents            |
| Ocean currents                       | NOAA ERDDAP                                   |
| Dissolved oxygen                     | NOAA ERDDAP                                   |
| Wave height / period / direction     | Open-Meteo Marine                             |
| Sea level / tides                    | NOAA Tides & Currents                         |
| Ocean Health Index scores (10 goals) | Ocean Health Index                            |
| Marine heatwave                      | NOAA CRW                                      |

## Integration Notes

- **Live integration:** one provider module per non-OWID provider (`apps/api/src/modules/providers/copernicus-climate-pulse/` and `.../noaa-lsa/`), the OWID client for its four charts, and `apps/api/src/modules/ocean-health/` with five endpoints (`sea-surface-temperature`, `sea-surface-anomaly`, `ocean-heat-content`, `sea-level`, `ocean-ph`), each with its own envelope, snapshot and `502`. Both new providers are listed in `GET /api/v1/data-sources` (`copernicus-climate-pulse`, `noaa-lsa`) and have a `HEAD` probe in `GET /api/v1/health/dependencies`.
- E2E never reaches these providers: the fixture server serves trimmed captures (`apps/web/e2e/fixtures/{owid,copernicus,noaa-lsa}/`).
- **The notes below apply to the candidate providers**, which are documented as reference and not integrated.
- **Recommended combination:** NOAA ERDDAP (JSON REST, no key, CORS) + NOAA Coral Reef Watch (coral health).
- ERDDAP can serve many datasets as JSON directly — ideal for server-side Route Handlers with ISR caching.
- netCDF files (CRW, OISST) require server-side processing (e.g. Python/Node binary parser) before sending to the frontend.
- Open-Meteo Marine has CORS enabled but is **non-commercial only** — avoid if running ads.
- Ocean Health Index CSV is updated annually — cache at build time or with long `revalidate`.
