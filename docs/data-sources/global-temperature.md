# Global Temperature

Tracks global and regional surface temperature anomalies over time. Key indicator for measuring the pace of climate change. Series are published against different reference periods (for example 1850-1900, 1961-1990 or 1991-2020), so a baseline is always stated next to a value.

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

**Verified and in use (25 Oct 2026): `annual-temperature-anomalies` (per country).** This is the chart the site's `global-temperature` category reads.

- **Chart / column / indicator:** `https://ourworldindata.org/grapher/annual-temperature-anomalies`, column `temperature_anomaly`, indicator id `1325256` (unit `°C`).
- **Baseline:** anomaly = a year's average surface temperature minus the **1991-2020 mean** of the same place. The baseline is prose in the indicator's `descriptionShort`, not a data field, so the API checks it against that text and answers `502` if it changes.
- **Span:** 1940-2025 annual (the metadata `timespan` says 1940-2026 but no 2026 row exists); the site serves the full 1940 span up to the previous calendar year. 213 entities in the full CSV: 193 countries, `OWID_KOS`, `OWID_WRL` and 18 `(NIAID)` regions with an empty code; Antarctica and a few micro-states are absent.
- **Coverage:** country values cover land inside the borders only; World covers land and ocean, so they are not directly comparable. Small countries are less reliable (grid resolution).
- **Origin and credit:** Copernicus Climate Change Service (C3S), ERA5 monthly averaged data on single levels (2 m temperature), DOI 10.24381/cds.f17050d7. The Climate Data Store dataset page lists the license as **CC BY 4.0** (OWID's metadata still says "Copernicus License"); the Copernicus license text allows any lawful use, commercial included, and asks for the notice `Contains modified Copernicus Climate Change Service information (<year>)` and a statement that neither the European Commission nor ECMWF is responsible for any use of the information. The site adopts CC BY 4.0 and keeps the notice, the DOI citation and the disclaimer. The API declares the origin once (a static constant), lists it in `GET /api/v1/data-sources` (notice without a year) and serves it as `data.origin` (notice completed with the dataset year); the page credits it next to the chart.
- **The `tab=chart` requirement:** this chart opens on its map tab. A `csvType=filtered` request without `tab=chart` returns HTTP 200 and a valid CSV but ignores `country` and returns only the map's years (one per entity). The API always requests `tab=chart` with `country` and `time`.
- **Payload:** 195 entities x 86 years (1940-2025), 2 decimals, plus the global series below: about 110 KB raw and 31 KB gzipped for the whole `data`.

**Verified and in use (25 Oct 2026): `temperature-anomaly` (World, pre-industrial).** The long-run global series of the same page.

- **Chart / columns / indicator:** `https://ourworldindata.org/grapher/temperature-anomaly`, columns `near_surface_temperature_anomaly` (the mean, indicator id `1325020`), `near_surface_temperature_anomaly_lower` (`1325021`) and `near_surface_temperature_anomaly_upper` (`1325022`), the 95% confidence bounds; unit degrees Celsius. Entities: `OWID_WRL`, `OWID_NH`, `OWID_SH`; the site uses World only. `tab=chart` applies `country` and `time` here as well, and the three columns come from one CSV.
- **Baseline:** **1861-1890** (OWID's pre-industrial baseline, as recommended by the source); indicator 1325020's `descriptionShort` says "...compared to the 1861-1890 mean", which the API verifies like the ERA5 baseline.
- **Span:** 1850-2026 in the CSV, but **2026 is a partial year**, so the API caps the request at the previous calendar year (176 World rows for 1850-2025: World 2025 = +1.41 C, warmest 2024 = +1.53 C).
- **Origin and credit:** Met Office Hadley Centre, HadCRUT5 (https://www.metoffice.gov.uk/hadobs/hadcrut5/), Crown copyright under the Open Government Licence v3.0; the notice "(c) British Crown Copyright, Met Office, provided under the Open Government Licence v3.0" and the citation Morice et al. (2021), Journal of Geophysical Research: Atmospheres, 126, e2019JD032361, doi:10.1029/2019JD032361 are shown next to the chart. Served as `data.global.origin` and listed in the catalog.
- **Payload:** 176 values x 3 arrays: about 3 KB raw, 1 KB gzipped.

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
