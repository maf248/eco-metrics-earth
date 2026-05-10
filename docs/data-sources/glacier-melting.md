# Glacier Melting

Tracks glacier mass balance, retreat rates, and ice volume loss globally. Key indicator for sea level rise projections and freshwater availability.

## Providers

### 1. NSIDC Sea Ice Index v4

- **URL:** https://nsidc.org/data/seaice_index — data: https://noaadata.apps.nsidc.org/NOAA/G02135/
- **License:** ✅ Comercial/ads OK — Public domain (NASA/NOAA).
- **Model:** Free. CSV, GeoTIFF, shapefile, PNG.
- **Data type:** Daily and monthly from 1978–present.
- **Data:** Arctic and Antarctic sea ice extent and concentration, anomalies, trends.
- **API key:** Not required for Sea Ice Index; other NASA datasets require free Earthdata Login.
- **Validated (May 2026):** v4.0 endpoints confirmed working. Daily and monthly data available through present.

| Field | Details |
|---|---|
| Base URL | `https://noaadata.apps.nsidc.org/NOAA/G02135/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Daily |
| Format | CSV, GeoTIFF, Shapefile, PNG |

---

### 2. NSIDC Data Map Services API (WMS/WFS)

- **URL:** https://nsidc.org/data/user-resources/help-center/guide-nsidc-data-map-services-api
- **License:** ✅ Comercial/ads OK — Public domain (NASA/NOAA).
- **Model:** Free. WMS/WFS map services.
- **Data:** Sea ice concentration raster/vector layers, freeze/thaw, glacier velocity, Greenland melt.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | `https://nsidc.org/api/mapservices/NSIDC/wms` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Daily to weekly |
| Format | WMS tiles, WFS GeoJSON |

---

### 3. World Glacier Monitoring Service (WGMS)

- **URL:** https://wgms.ch/data_databaseversions/
- **License:** ✅ Comercial/ads OK — CC BY 4.0 (open access; correct citation required, equivalent to CC BY 4.0 per WGMS data policy).
- **Model:** Free. Open access, direct download (no registration required).
- **Data:** Mass balance, length, area, thickness of 6,000+ glaciers; Fluctuations of Glaciers (FoG) database, updated annually. Latest version: FoG 2026-02-10.
- **API key:** None (direct download; cite the database version DOI).

| Field | Details |
|---|---|
| Base URL | https://wgms.ch/data_databaseversions/ |
| Auth | None |
| Free tier | Yes |
| Rate limit | N/A (downloads) |
| Update frequency | Annual |
| Format | CSV, Access database |

---

### 4. NSIDC GLIMS Glacier Database

- **URL:** https://www.glims.org/ — download: https://nsidc.org/data/nsidc-0272/versions/1
- **License:** ✅ Comercial/ads OK — Public domain (NASA/NOAA).
- **Model:** Free. Static download.
- **Data:** Global glacier inventory with polygons, length, area.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | https://nsidc.org/data/nsidc-0272/ |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Periodic |
| Format | Shapefile, GeoJSON |

---

### 5. NASA MEaSUREs / ICESat-2 Datasets (via NSIDC DAAC)

- **URL:** https://nsidc.org/data
- **License:** ✅ Comercial/ads OK — Public domain (NASA); requires free Earthdata Login.
- **Model:** Free (Earthdata Login). Accessible via `earthaccess` Python library or HTTPS.
- **Data:** Greenland glacier velocity (InSAR), surface elevation (ATL15), ice mass.
- **API key:** Free NASA Earthdata Login required.

| Field | Details |
|---|---|
| Base URL | `https://cmr.earthdata.nasa.gov/search` |
| Auth | NASA Earthdata Login (free) |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Varies by product |
| Format | netCDF, HDF5 |

---

### 6. NASA GRACE / GRACE-FO Mass Balance

- **URL:** https://podaac.jpl.nasa.gov/GRACE
- **License:** ✅ Comercial/ads OK — Public domain (NASA); requires free Earthdata Login.
- **Model:** Free (Earthdata Login).
- **Data:** Greenland and Antarctic ice mass loss (Gt/year) from 2002 to present.
- **API key:** Free NASA Earthdata Login required.

| Field | Details |
|---|---|
| Base URL | `https://podaac.jpl.nasa.gov/GRACE` |
| Auth | NASA Earthdata Login (free) |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Monthly |
| Format | netCDF |

---

### 7. Our World in Data — Ice & Glaciers

- **URL:** https://ourworldindata.org/grapher/cumulative-mass-balance-of-us-reference-glaciers (and others)
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). CSV via grapher.
- **Data:** Annual mass balance series of reference glaciers.
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

## Available Metrics

| Metric | Providers |
|---|---|
| Sea ice extent (Arctic / Antarctic) | NSIDC Sea Ice Index |
| Sea ice concentration | NSIDC, NSIDC Map Services |
| Glacier mass balance | WGMS, NASA GRACE, OWID |
| Glacier length / area | WGMS, GLIMS |
| Surface elevation (ICESat-2) | NASA MEaSUREs |
| Ice sheet mass loss — Greenland / Antarctica | NASA GRACE / GRACE-FO |
| Glacier velocity | NASA MEaSUREs, NSIDC Map Services |

## Integration Notes

- **Recommended primary sources:** NSIDC Sea Ice Index CSVs (no key, public domain) + WGMS for glacier mass balance (CC BY 4.0; cite the DOI of the database version used).
- OWID grapher CSV is the simplest commercial-safe option for glacier mass balance trends.
- NASA GRACE mass balance data is public domain but requires Earthdata Login — fetch server-side.
- netCDF and HDF5 files (NASA MEaSUREs, GRACE) require server-side processing.
- GLIMS polygons are best pre-processed at build time for map rendering.
