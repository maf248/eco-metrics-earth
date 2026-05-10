# Air Quality

Tracks concentrations of atmospheric pollutants (PM2.5, PM10, NO₂, O₃, CO, SO₂) and air quality indices (AQI) at global, regional, and city level.

## Providers

### 1. Open-Meteo Air Quality API

- **URL:** `https://air-quality-api.open-meteo.com/v1/air-quality` — docs: https://open-meteo.com/en/docs/air-quality-api
- **License:** ⚠️ Solo no comercial — CC BY 4.0 (data); free API tier is restricted to non-commercial use. Commercial use requires a paid plan.
- **Model:** Free for non-commercial use.
- **Data type:** Real-time + 5-day forecast + historical. JSON.
- **Data:** PM2.5, PM10, O₃, NO₂, SO₂, CO, NH₃, pollen (alder, birch, grasses, ragweed, olive, mugwort), European and US AQI, dust, sulfur dioxide, carbon monoxide.
- **API key:** Not required.
- **CORS:** Enabled — can be called directly from the client.
- **Limitations:** Recommended < 10,000 calls/day, < 5,000/hour, < 600/minute per IP. Commercial use requires a paid plan.
- **Validated (May 2026):** Real-time air quality endpoints confirmed working.

| Field | Details |
|---|---|
| Base URL | `https://air-quality-api.open-meteo.com/v1/air-quality` |
| Auth | None |
| Free tier | Yes (non-commercial) |
| Rate limit | < 10,000 req/day, < 5,000/hour, < 600/min per IP |
| Update frequency | Hourly real-time + 5-day forecast |
| Format | JSON |

---

### 2. OpenAQ API v3

- **URL:** `https://api.openaq.org/v3` — docs: https://docs.openaq.org/
- **License:** ⚠️ Solo no comercial — OpenAQ itself is open; commercial use is subject to the terms of the underlying data providers. Review before commercial deployment.
- **Model:** Free (non-profit). REST + JSON.
- **Data type:** Real-time and historical, aggregated from 100+ governmental and research sources worldwide.
- **Data:** PM2.5, PM10, O₃, NO₂, SO₂, CO, BC (black carbon) by location, city, country; station metadata.
- **API key:** Required (free; register at `explore.openaq.org`).
- **CORS:** Not fully enabled — must use server-side calls.
- **Limitations:** Rate limits: 60 req/min, ~2,000/hour. v1 and v2 were retired January 2025 — use v3 only.

| Field | Details |
|---|---|
| Base URL | `https://api.openaq.org/v3` |
| Auth | API key (free registration at explore.openaq.org) |
| Free tier | Yes |
| Rate limit | 60 req/min, ~2,000 req/hour |
| Update frequency | Near real-time |
| Format | JSON |

---

### 3. EPA AirNow API

- **URL:** https://docs.airnowapi.org/
- **License:** ⚠️ Solo no comercial — US Government; ToS restricts commercial redistribution.
- **Model:** Free (US Government).
- **Data type:** Real-time (hourly observations) + forecasts. JSON, CSV, RSS, KML.
- **Data:** AQI and concentrations of O₃, PM2.5, PM10, CO, SO₂, NO₂ for US, Canada, and Mexico (2,500+ stations; 500+ cities with forecast).
- **API key:** Required (free registration).
- **CORS:** Not specified — use server-side.
- **Limitations:** 500 req/hour per service per API key. Coverage limited to North America.

| Field | Details |
|---|---|
| Base URL | `https://www.airnowapi.org/aq/` |
| Auth | API key (free registration) |
| Free tier | Yes |
| Rate limit | 500 req/hour per service |
| Update frequency | Hourly |
| Format | JSON, CSV, RSS, KML |

---

### 4. EU Copernicus Atmosphere Monitoring Service (CAMS)

- **URL:** https://atmosphere.copernicus.eu/ — Atmosphere Data Store: https://ads.atmosphere.copernicus.eu/
- **License:** ✅ Comercial/ads OK — Copernicus License (commercial use OK with attribution).
- **Model:** Free (EU programme).
- **Data type:** Global and European forecasts (downloadable as netCDF/GRIB). Upstream data source that powers Open-Meteo Air Quality.
- **Data:** Global atmospheric composition, European air quality (11 km), aerosols, ozone, CO, greenhouse gases.
- **API key:** Required (CDS API key after free registration).
- **CORS:** Not applicable — designed for batch downloads, not live frontend queries.
- **Limitations:** Best suited for batch pipelines; not practical for real-time frontend requests.

| Field | Details |
|---|---|
| Base URL | `https://ads.atmosphere.copernicus.eu/api/v2` |
| Auth | CDS API key (free registration) |
| Free tier | Yes |
| Rate limit | Queue-based (batch) |
| Update frequency | Daily forecasts |
| Format | netCDF, GRIB |

---

### 5. OpenWeatherMap Air Pollution API

- **URL:** `https://api.openweathermap.org/data/2.5/air_pollution`
- **License:** ✅ Comercial/ads OK — ODbL; commercial and non-commercial use allowed. Attribution required: "Weather data © OpenWeather".
- **Model:** Freemium with free tier.
- **Data type:** Real-time, forecast, and historical. JSON.
- **Data:** AQI, CO, NO, NO₂, O₃, SO₂, PM2.5, PM10, NH₃.
- **API key:** Required.
- **CORS:** Not specified — use server-side to protect key.
- **Limitations:** Free tier: 60 req/min, 1,000,000 req/month.

| Field | Details |
|---|---|
| Base URL | `https://api.openweathermap.org/data/2.5/air_pollution` |
| Auth | API key (free tier available) |
| Free tier | Yes |
| Rate limit | 60 req/min, 1,000,000 req/month (free tier) |
| Update frequency | Hourly |
| Format | JSON |

---

## Available Metrics

| Metric | Providers |
|---|---|
| PM2.5 | Open-Meteo, OpenAQ, AirNow, OpenWeatherMap |
| PM10 | Open-Meteo, OpenAQ, AirNow, OpenWeatherMap |
| O₃ (Ozone) | Open-Meteo, OpenAQ, AirNow, OpenWeatherMap |
| NO₂ | Open-Meteo, OpenAQ, AirNow, OpenWeatherMap |
| SO₂ | Open-Meteo, OpenAQ, AirNow, OpenWeatherMap |
| CO | Open-Meteo, OpenAQ, AirNow, OpenWeatherMap |
| NH₃ | Open-Meteo, OpenAQ |
| AQI (US / EU index) | Open-Meteo, AirNow, OpenWeatherMap |
| Pollen (alder, birch, grass, ragweed…) | Open-Meteo |
| Black carbon (BC) | OpenAQ |
| Station metadata | OpenAQ |
| Global atmospheric composition | CAMS |

## Integration Notes

- **Recommended primary source:** Open-Meteo — no key, CORS enabled, JSON. Best for real-time + forecast.
- **OpenAQ** adds station-level granularity and historical depth; requires server-side (key + no CORS).
- **AirNow** is best for North America specifics; also server-side required.
- **OpenWeatherMap** is a viable fallback; commercial use is allowed on the free tier under ODbL — attribution required.
- **CAMS** is the upstream source powering Open-Meteo — use directly only for batch pipelines or 11 km European-grid resolution.
- All APIs requiring a key **must be called from a Next.js Route Handler or Server Component** to avoid exposing credentials.
