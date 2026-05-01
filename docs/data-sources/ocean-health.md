# Ocean Health

Tracks ocean-related indicators including sea surface temperature, acidity (pH), sea level rise, coral reef coverage, and marine biodiversity indices.

## Providers

### 1. NOAA Coral Reef Watch (CRW) — CoralTemp

- **URL:** https://coralreefwatch.noaa.gov/ — data: https://www.ncei.noaa.gov/products/coral-reef-watch
- **License:** ✅ Comercial/ads OK — Public domain (NOAA).
- **Model:** Free. NetCDF + PNG files.
- **Data type:** Real-time (daily) + reanalysis from 1985.
- **Data:** Daily global SST at 5 km (CoralTemp), SST anomaly, HotSpot, Degree Heating Week (DHW), Bleaching Alert Area (5 levels), seasonal bleaching forecast, marine heatwave, disease risk, larval connectivity.
- **API key:** Not required (HTTPS/FTP file access).
- **Limitations:** Data in netCDF — requires server-side processing.

| Field | Details |
|---|---|
| Base URL | `https://coastwatch.pfeg.noaa.gov/erddap/griddap/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Daily |
| Format | netCDF, PNG |

---

### 2. NOAA OISST (Optimum Interpolation SST)

- **URL:** https://www.ncei.noaa.gov/products/optimum-interpolation-sst
- **License:** ✅ Comercial/ads OK — Public domain (NOAA).
- **Model:** Free.
- **Data type:** Daily global SST from 1981.
- **Data:** Sea surface temperature at 0.25° resolution, from 1981 to present.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | `https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Daily |
| Format | netCDF |

---

### 3. NOAA ERDDAP Servers

- **URL:** https://coastwatch.pfeg.noaa.gov/erddap/
- **License:** ✅ Comercial/ads OK — Public domain (NOAA).
- **Model:** Free. REST with JSON, CSV, GeoJSON, netCDF output.
- **Data type:** Hundreds of oceanographic datasets.
- **Data:** Chlorophyll, salinity, currents, wind, SST, dissolved oxygen, and much more.
- **API key:** Not required.
- **CORS:** Enabled — ideal for Next.js (can be called server-side or client-side).

| Field | Details |
|---|---|
| Base URL | `https://coastwatch.pfeg.noaa.gov/erddap` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Varies by dataset (hourly to daily) |
| Format | JSON, CSV, GeoJSON, netCDF |

---

### 4. Open-Meteo Marine API

- **URL:** `https://marine-api.open-meteo.com/v1/marine`
- **License:** ⚠️ Solo no comercial — CC BY-NC 4.0. Commercial use requires a paid plan.
- **Model:** Free for non-commercial use.
- **Data type:** Forecast. JSON.
- **Data:** Wave height, period, direction, marine wind.
- **API key:** Not required.
- **CORS:** Enabled.

| Field | Details |
|---|---|
| Base URL | `https://marine-api.open-meteo.com/v1/marine` |
| Auth | None |
| Free tier | Yes (non-commercial) |
| Rate limit | < 10,000 req/day per IP (recommended) |
| Update frequency | Hourly forecast |
| Format | JSON |

---

### 5. Ocean Health Index

- **URL:** https://oceanhealthindex.org/global-scores/data-download/
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Static downloadable (CSV).
- **Data type:** Annual scores.
- **Data:** Annual scores (0–100) per country across 10 goals: food provision, artisanal fishing, natural products, carbon storage, coastal protection, tourism, livelihoods, sense of place, clean waters, biodiversity.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://oceanhealthindex.org/global-scores/data-download/ |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Annual |
| Format | CSV |

---

### 6. NOAA Tides & Currents API

- **URL:** https://api.tidesandcurrents.noaa.gov/api/prod/
- **License:** ✅ Comercial/ads OK — Public domain (NOAA).
- **Model:** Free. JSON. No API key required.
- **Data:** Sea levels, tide predictions, water temperature, salinity.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Near real-time |
| Format | JSON |

---

## Available Metrics

| Metric | Providers |
|---|---|
| Sea surface temperature (SST) | NOAA CRW / CoralTemp, NOAA OISST, NOAA ERDDAP |
| SST anomaly | NOAA CRW |
| Degree Heating Week (DHW) | NOAA CRW |
| Coral Bleaching Alert Area | NOAA CRW |
| Chlorophyll concentration | NOAA ERDDAP |
| Salinity | NOAA ERDDAP, NOAA Tides & Currents |
| Ocean currents | NOAA ERDDAP |
| Dissolved oxygen | NOAA ERDDAP |
| Wave height / period / direction | Open-Meteo Marine |
| Sea level / tides | NOAA Tides & Currents |
| Ocean Health Index scores (10 goals) | Ocean Health Index |
| Marine heatwave | NOAA CRW |

## Integration Notes

- **Recommended combination:** NOAA ERDDAP (JSON REST, no key, CORS) + NOAA Coral Reef Watch (coral health).
- ERDDAP can serve many datasets as JSON directly — ideal for server-side Route Handlers with ISR caching.
- netCDF files (CRW, OISST) require server-side processing (e.g. Python/Node binary parser) before sending to the frontend.
- Open-Meteo Marine has CORS enabled but is **non-commercial only** — avoid if running ads.
- Ocean Health Index CSV is updated annually — cache at build time or with long `revalidate`.
