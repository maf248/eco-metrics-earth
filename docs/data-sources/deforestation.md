# Deforestation

Tracks forest cover loss and gain by region and country. Includes primary forest loss, tree cover change, and annual deforestation rates.

> Note: Global Forest Watch and FAOSTAT also appear in `reforestation.md` (they supply tree cover gain / forest area data for both categories).

## Providers

### 1. Global Forest Watch Data API (WRI)

- **URL:** https://data-api.globalforestwatch.org/ — portal: https://data.globalforestwatch.org/
- **License:** ⚠️ Solo no comercial — CC BY-NC-SA on some datasets.
- **Model:** Free and open. REST + JSON/GeoJSON.
- **Data type:** Real-time (weekly GLAD/RADD alerts) + historical (Hansen tree cover loss from 2000).
- **Data:** Forest cover loss (Hansen 30 m), GLAD alerts (Landsat), RADD alerts (Sentinel-1, cloud-penetrating), active fires (VIIRS), protected areas, concessions, carbon stocks, biodiversity hotspots, EUDR risk layer. Supports geometry/AOI queries.
- **API key:** Required for some endpoints (free).
- **CORS:** Yes on public endpoints.
- **Limitations:** Some on-demand analyses limit maximum area per request.

| Field            | Details                                     |
| ---------------- | ------------------------------------------- |
| Base URL         | `https://data-api.globalforestwatch.org`    |
| Auth             | API key (free; required for some endpoints) |
| Free tier        | Yes                                         |
| Rate limit       | Not publicly specified                      |
| Update frequency | Weekly (GLAD/RADD alerts); annual (Hansen)  |
| Format           | JSON, GeoJSON                               |

---

### 2. Hansen Global Forest Change (University of Maryland)

- **URL:** https://glad.earthengine.app/view/global-forest-change
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Static downloadable (GeoTIFF tiles at 10°×10°). Also available in Google Earth Engine.
- **Data type:** Static raster tiles.
- **Data:** Forest cover 2000, annual gain/loss to the most recent year at 30 m resolution.
- **API key:** Not required (direct download); Google Earth Engine login for GEE access.

| Field            | Details                                                      |
| ---------------- | ------------------------------------------------------------ |
| Base URL         | `https://storage.googleapis.com/earthenginepartners-hansen/` |
| Auth             | None (direct download)                                       |
| Free tier        | Yes                                                          |
| Rate limit       | None                                                         |
| Update frequency | Annual                                                       |
| Format           | GeoTIFF                                                      |

---

### 3. FAO FAOSTAT — Forestry

- **URL:** https://www.fao.org/faostat/en/#data/FO — bulk CSV: `https://bulks-faostat.fao.org/production/`
- **License:** ✅ Comercial/ads OK — CC BY 4.0 (FAO Statistical Database Terms of Use).
- **Model:** Free. Annual country-level data (bulk CSV downloads).
- **Data:** Forest area, net deforestation, timber production, trade in forest products.
- **API key:** Not required.
- **Validated (Jul 2026):** The legacy API host `fenixservices.fao.org` is down (HTTP 521), and `faostatservices.fao.org/api/v1` returns 401 to unauthenticated requests. Bulk CSV downloads (e.g. `Forestry_E_All_Data.zip`) confirmed working — prefer them.

| Field            | Details                                     |
| ---------------- | ------------------------------------------- |
| Base URL         | `https://bulks-faostat.fao.org/production/` |
| Auth             | None                                        |
| Free tier        | Yes                                         |
| Rate limit       | None specified                              |
| Update frequency | Annual                                      |
| Format           | CSV (zipped)                                |

---

### 4. Our World in Data — Deforestation

- **URL:** https://ourworldindata.org/deforestation — CSV via grapher: `https://ourworldindata.org/grapher/<chart>.csv`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). Static downloadable.
- **Data:** Annual forest loss and gain series by country (based on Hansen/UMD and FAO FRA).
- **API key:** Not required.

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

| Metric                                      | Providers           |
| ------------------------------------------- | ------------------- |
| Tree cover loss (annual, 30 m)              | GFW / Hansen        |
| GLAD deforestation alerts (weekly)          | Global Forest Watch |
| RADD alerts (Sentinel-1, cloud-penetrating) | Global Forest Watch |
| Active fires (VIIRS)                        | Global Forest Watch |
| Carbon stocks                               | Global Forest Watch |
| Forest area by country (annual)             | FAOSTAT, OWID       |
| Net deforestation rate                      | FAOSTAT, OWID       |
| Timber production & trade                   | FAOSTAT             |

## Integration Notes

- **Recommended primary source:** Global Forest Watch Data API for real-time alerts and Hansen historical data.
- Hansen GeoTIFF tiles are large raster files — process server-side or pre-aggregate before serving to the frontend.
- FAOSTAT is best consumed via bulk CSV downloads processed at build time — the old JSON API host (`fenixservices.fao.org`) is dead.
- OWID grapher CSV is a convenient harmonized layer cacheable with ISR.
- GFW's CC BY-NC-SA licence means **no commercial use** — verify before launch. Hansen tiles (CC BY) are the commercial-safe alternative for raster data.
