# Reforestation

Tracks tree planting initiatives, forest restoration progress, and net forest gain by country and region. Complements deforestation data to show net change in global forest cover.

> Note: Global Forest Watch (tree cover gain) and FAOSTAT (FRA) also appear in `deforestation.md`.

## Providers

### 1. Global Forest Watch — Tree Cover Gain (WRI)

- **URL:** https://data-api.globalforestwatch.org/
- **License:** ⚠️ Non-commercial only — CC BY-NC-SA on some datasets.
- **Model:** Free and open. REST + JSON/GeoJSON.
- **Data:** Tree cover gain dataset (Hansen 2000–2020) used as a proxy for gross reforestation. Same API as the Deforestation category.
- **API key:** Required for some endpoints (free).
- **CORS:** Yes on public endpoints.

| Field            | Details                                     |
| ---------------- | ------------------------------------------- |
| Base URL         | `https://data-api.globalforestwatch.org`    |
| Auth             | API key (free; required for some endpoints) |
| Free tier        | Yes                                         |
| Rate limit       | Not publicly specified                      |
| Update frequency | Annual (Hansen)                             |
| Format           | JSON, GeoJSON                               |

---

### 2. FAO Forest Resources Assessment (FRA) / FAOSTAT

- **URL:** https://www.fao.org/forest-resources-assessment/en/ — FAOSTAT bulk CSV: `https://bulks-faostat.fao.org/production/`
- **License:** ✅ Commercial/ads OK — CC BY 4.0 (FAO Statistical Database Terms of Use).
- **Model:** Free. Annual country-level data (bulk CSV downloads).
- **Data:** Net forest area change, forest plantations, natural regeneration by country (every 5 years — FRA cycle).
- **API key:** Not required.
- **Validated (Jul 2026):** The legacy API host `fenixservices.fao.org` is down (HTTP 521) — use the bulk CSV downloads instead (see `deforestation.md`).

| Field            | Details                                              |
| ---------------- | ---------------------------------------------------- |
| Base URL         | `https://bulks-faostat.fao.org/production/`          |
| Auth             | None                                                 |
| Free tier        | Yes                                                  |
| Rate limit       | None specified                                       |
| Update frequency | Every 5 years (FRA); annually for FAOSTAT indicators |
| Format           | CSV (zipped)                                         |

---

### 3. Trees.org / Plant-for-the-Planet Forest Cloud

- **URL:** https://www.trilliontreecampaign.org/ — open source: https://github.com/Plant-for-the-Planet-org
- **License:** ⚠️ Non-commercial only — Complex licensing; widget/embed use only; no official public REST API.
- **Model:** Free widgets and embeds for tree counter. Open-source app.
- **Data:** Global tree-planting counter, restoration project registry (160+ projects), donations.
- **API key:** Some integrations require authentication.
- **Limitations:** No well-documented public REST API — mainly useful for embeds/widgets.

| Field            | Details                                              |
| ---------------- | ---------------------------------------------------- |
| Base URL         | https://app.plant-for-the-planet.org (embed widgets) |
| Auth             | Varies                                               |
| Free tier        | Yes (non-commercial)                                 |
| Rate limit       | N/A                                                  |
| Update frequency | Continuous                                           |
| Format           | Widget / embed                                       |

---

### 4. Bonn Challenge Barometer (IUCN / WRI)

- **URL:** https://www.bonnchallenge.org/ — barometer: https://infoflr.org/bonn-challenge-barometer
- **License:** ✅ Commercial/ads OK — CC BY (reports and dashboards).
- **Model:** Free. No REST API — exportable dashboard and PDF reports.
- **Data:** National restoration commitments (hectares), progress by country.
- **Data type:** Static/periodic (reports and exportable dashboards).
- **Limitations:** No REST API. Use exported CSV/JSON from dashboards.

| Field            | Details                                      |
| ---------------- | -------------------------------------------- |
| Base URL         | https://infoflr.org/bonn-challenge-barometer |
| Auth             | None                                         |
| Free tier        | Yes                                          |
| Rate limit       | N/A (no API)                                 |
| Update frequency | Periodic (annual reports)                    |
| Format           | Dashboard export, PDF                        |

---

### 5. Restor (Crowther Lab / ETH Zürich)

- **URL:** https://restor.eco/
- **License:** ✅ Commercial/ads OK — Open data (CC BY for base datasets).
- **Model:** Interactive map with open restoration project data.
- **Data:** Global restoration project registry with ecological and geographic data.
- **API:** Exists but programmatic use requires contacting the Restor team.
- **Limitations:** No self-service public REST API documented; contact required.

| Field            | Details            |
| ---------------- | ------------------ |
| Base URL         | https://restor.eco |
| Auth             | Contact team       |
| Free tier        | Yes (on request)   |
| Rate limit       | Not specified      |
| Update frequency | Continuous         |
| Format           | JSON (on request)  |

---

## Available Metrics

| Metric                                | Providers                        |
| ------------------------------------- | -------------------------------- |
| Tree cover gain (annual proxy)        | Global Forest Watch              |
| Net forest area change by country     | FAO FRA / FAOSTAT                |
| Forest plantations area               | FAO FRA                          |
| Natural regeneration area             | FAO FRA                          |
| Global tree-planting counter          | Trees.org / Plant-for-the-Planet |
| National restoration commitments (ha) | Bonn Challenge                   |
| Restoration project locations         | Restor                           |

## Integration Notes

> **Honest note:** Reforestation is the category with the fewest robust public REST APIs. The most reliable strategy is:
>
> 1. Use **Hansen/GFW "tree cover gain"** dataset for gross reforestation proxy.
> 2. Use **FAO FRA** (via FAOSTAT bulk CSV) for official net forest area by country.
> 3. Use **OWID forest area grapher CSV** (`https://ourworldindata.org/grapher/forest-area-km.csv`) as a harmonized, cacheable layer.

- Fetch GFW and FAOSTAT data server-side and cache with ISR.
- Bonn Challenge data is best consumed as a static export and pre-processed at build time.
- Trees.org/Plant-for-the-Planet is only suitable as an embedded widget, not as a data API.
