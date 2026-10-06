# Endangered Species

Tracks the conservation status of animal and plant species worldwide. Covers IUCN Red List categories, population trends, and geographic distribution of threatened species.

## Providers

### 1. IUCN Red List API (v4)

- **URL:** `https://api.iucnredlist.org/` — docs (Swagger): https://api.iucnredlist.org/api-docs/index.html
- **License:** ⚠️ Non-commercial only — Non-commercial use only. Commercial use via IBAT.
- **Model:** Free for non-commercial use. REST + JSON.
- **Data type:** Periodic (releases ~2×/year), queried via REST.
- **Data:** Red List category (CR, EN, VU, NT, LC, DD, EW, EX), population trends, habitat, threats, conservation actions, taxonomic synonyms, assessments by country and region. 172,600+ species globally evaluated.
- **API key:** Required (free token; v3 no longer accepts new accounts — use v4).
- **CORS:** Not specified — use server-side.
- **Limitations:** Non-commercial only; rate-limited.

| Field            | Details                               |
| ---------------- | ------------------------------------- |
| Base URL         | `https://api.iucnredlist.org/api/v4`  |
| Auth             | API token (free registration)         |
| Free tier        | Yes (non-commercial)                  |
| Rate limit       | Rate-limited (not publicly specified) |
| Update frequency | ~2 releases/year                      |
| Format           | JSON                                  |

---

### 2. IUCN Red List Spatial Data Download

- **URL:** https://www.iucnredlist.org/resources/spatial-data-download
- **License:** ⚠️ Non-commercial only — Non-commercial use only.
- **Model:** Static download (shapefiles, CSV). Requires free registration.
- **Data type:** Static datasets downloadable by taxonomic group.
- **Data:** Distribution polygons, observation points, taxonomy, Red List category.
- **API key:** Requires free registration.
- **Limitations:** Non-commercial use only; bulk downloads only (no live API).

| Field            | Details                                                     |
| ---------------- | ----------------------------------------------------------- |
| Base URL         | https://www.iucnredlist.org/resources/spatial-data-download |
| Auth             | Free registration required                                  |
| Free tier        | Yes (non-commercial)                                        |
| Rate limit       | N/A (static download)                                       |
| Update frequency | Per Red List release (~2×/year)                             |
| Format           | Shapefile, CSV                                              |

---

### 3. GBIF (Global Biodiversity Information Facility) API

- **URL:** `https://api.gbif.org/v1/` — docs: https://www.gbif.org/developer/summary
- **License:** ✅ Commercial/ads OK — CC BY.
- **Model:** Fully free and open. REST + JSON.
- **Data type:** Real-time (2+ billion occurrence records).
- **Data:** Species occurrences, taxonomy, datasets, species by location/date. Complements IUCN with observed geographic presence.
- **API key:** Not required.
- **CORS:** Enabled — can be called directly from the client.
- **Limitations:** None strict for reasonable use.

| Field            | Details                   |
| ---------------- | ------------------------- |
| Base URL         | `https://api.gbif.org/v1` |
| Auth             | None                      |
| Free tier        | Yes (fully open)          |
| Rate limit       | None (reasonable use)     |
| Update frequency | Continuous                |
| Format           | JSON                      |

---

### 4. Protected Planet API (UNEP-WCMC)

- **URL:** https://api.protectedplanet.net/ — docs: https://api.protectedplanet.net/documentation
- **License:** ⚠️ Non-commercial only — Non-commercial restrictions apply to WDPA data.
- **Model:** Free. REST + JSON.
- **Data:** World Database on Protected Areas (WDPA) and Key Biodiversity Areas (KBA).
- **API key:** Required (free registration).

| Field            | Details                              |
| ---------------- | ------------------------------------ |
| Base URL         | `https://api.protectedplanet.net/v3` |
| Auth             | API key (free registration)          |
| Free tier        | Yes                                  |
| Rate limit       | Not publicly specified               |
| Update frequency | Monthly (WDPA)                       |
| Format           | JSON                                 |

---

## Available Metrics

| Metric                                  | Providers         |
| --------------------------------------- | ----------------- |
| Red List category (CR, EN, VU, NT, LC…) | IUCN Red List API |
| Population trends                       | IUCN Red List API |
| Habitat & threats                       | IUCN Red List API |
| Distribution polygons                   | IUCN Spatial Data |
| Species occurrences (georeferenced)     | GBIF              |
| Taxonomic records                       | GBIF, IUCN        |
| Protected areas (WDPA)                  | Protected Planet  |
| Key Biodiversity Areas (KBA)            | Protected Planet  |

## Integration Notes

- **Recommended combination:** IUCN Red List API v4 (official status) + GBIF (geographic occurrences). GBIF is the only fully commercial-safe option.
- IUCN requires a **free token** and must be called **server-side** (protect the token + non-commercial restrictions). Note: the IUCN API is primarily designed for conservation, education, and research — visualization projects unrelated to conservation may be subject to additional restrictions; review the terms before commercial or non-conservation use.
- GBIF has CORS enabled and can be called client-side, but proxying through a Route Handler is preferred for caching.
- For spatial/map data, combine IUCN Spatial Downloads (build-time) with GBIF occurrence queries (runtime).
