# Deforestation

Tracks forest area and net change in forest area by country (FAO, 1990 onwards) and tree cover loss by dominant driver (Global Forest Watch, 2001 onwards). Tree cover loss is not deforestation: it includes temporary loss such as logging and fire in forests that regrow. The page does not show a deforestation rate.

## Sources in use

The page is live and reads three Our World in Data (OWID) charts, through the API module `deforestation` (two endpoints, one per source):

| OWID chart                           | Producer behind it                                              | Used for                                        |
| ------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------- |
| `forest-area-km`                     | FAO Global Forest Resources Assessment 2025                     | Forest area by country, 1990 to 2025            |
| `forest-area-as-share-of-land-area`  | FAO Global Forest Resources Assessment 2025 (1990 onwards)      | Forest area as a share of land area             |
| `tree-cover-loss-by-dominant-driver` | WRI and Google DeepMind (Global Forest Watch), Sims et al. 2025 | Tree cover loss by dominant cause, 2001 to 2024 |

- All three are requested with `tab=chart`: `forest-area-km` and `forest-area-as-share-of-land-area` open on their map tab, where OWID ignores `country` and answers with a single year.
- **Share chart restriction.** `forest-area-as-share-of-land-area` reaches back to the year 1000 because OWID combines historical reconstructions (DEFRA and others) with FAO. Only 1990 onwards is requested, the FAO series; it is consistent with the hectares series (the implied land area is constant), and the API guards that assumption.
- **FAO annual series not used.** `annual-change-forest-area` repeats a per-period average on every year of the period, so a yearly chart would show steps that look like annual data. `annual-deforestation` only has 1990, 2000, 2010, 2015 and 2020, with an ambiguous period. The net change between two years is recovered from the area series instead, which the map and the ranking do.
- **Producer version.** The GFW drivers dataset has a newer producer version (v1.13, 2001 to 2025) than OWID currently serves (2001 to 2024). The page follows OWID until it republishes.
- **Naming.** GFW now brands its portal "Global Nature Watch".
- **Licences are per dataset** (see below). The credits shown next to the charts come from the API payload (`data.origin`).

> Note: Global Forest Watch and FAOSTAT also appear in `reforestation.md` (they supply tree cover gain / forest area data for both categories).

## Providers

### 1. Global Forest Watch Data API (WRI)

- **URL:** https://data-api.globalforestwatch.org/ — portal: https://data.globalforestwatch.org/
- **License:** Per dataset, not per portal. The Hansen/UMD tree cover loss (`umd_tree_cover_loss`) and the WRI and Google DeepMind tree cover loss by dominant driver (`wri_google_tree_cover_loss_drivers`) are CC BY 4.0 (verified through the GFW Data API; the drivers dataset requires the credit "Tree cover loss by dominant driver". WRI/Google DeepMind). Other GFW datasets may carry other licences, some of them non-commercial: check each dataset record before use.
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
- **License:** CC BY 4.0 (`umd_tree_cover_loss`, verified through the GFW Data API).
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
- **License:** CC BY 4.0 under the FAO Statistical Database Terms of Use, which add a condition: the datasets "shall not be used for or in conjunction with the promotion of a commercial enterprise and/or its product(s) or services, and/or in any way that suggests that FAO endorses any specific company, products or services". Credit FAO and do not imply endorsement.
- **Model:** Free. Annual country-level data (bulk CSV downloads).
- **Data:** Forest area, net change in forest area, timber production, trade in forest products. The page uses forest area only, through the OWID charts above.
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
- **License:** CC BY 4.0 for OWID's own processing; the producer's licence applies to the underlying data (FAO CC BY 4.0 with the terms above, GFW CC BY 4.0).
- **Model:** Free (CC BY). Static downloadable.
- **Data:** Forest area (FAO FRA) and tree cover loss series by country (based on Hansen/UMD and GFW). The page uses the three charts listed under Sources in use.
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

| Metric                                      | Providers           | Used by the page                                   |
| ------------------------------------------- | ------------------- | -------------------------------------------------- |
| Tree cover loss by dominant driver (annual) | OWID (GFW)          | Yes                                                |
| Forest area by country                      | OWID (FAO)          | Yes, with the net change between two years derived |
| Forest area as a share of land area         | OWID (FAO)          | Yes                                                |
| Tree cover loss (annual, 30 m)              | GFW / Hansen        | Available only                                     |
| GLAD deforestation alerts (weekly)          | Global Forest Watch | Available only                                     |
| RADD alerts (Sentinel-1, cloud-penetrating) | Global Forest Watch | Available only                                     |
| Active fires (VIIRS)                        | Global Forest Watch | Available only                                     |
| Carbon stocks                               | Global Forest Watch | Available only                                     |
| Timber production & trade                   | FAOSTAT             | Available only                                     |

## Integration Notes

- **Current approach:** the page reads OWID charts only. For real-time alerts and Hansen historical data, Global Forest Watch Data API would be the candidate if the page ever needs them.
- Hansen GeoTIFF tiles are large raster files — process server-side or pre-aggregate before serving to the frontend.
- FAOSTAT is best consumed via bulk CSV downloads processed at build time — the old JSON API host (`fenixservices.fao.org`) is dead.
- OWID grapher CSV is a convenient harmonized layer cacheable with ISR.
- Licences are per dataset: the Hansen/UMD and drivers datasets are CC BY 4.0, but other GFW datasets may be non-commercial, so check each record before adding one. FAO's CC BY 4.0 carries the no-endorsement and no-promotion condition quoted above.
