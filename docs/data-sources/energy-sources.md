# Energy Sources

Tracks the full electricity generation mix by country, covering BOTH renewable and non-renewable energy sources. This category includes:

- **Fossil fuels** (coal, natural gas, oil)
- **Nuclear energy**
- **Renewable sources** (solar, wind, hydro, geothermal, biomass)

The data shows the complete electricity generation profile — not just the renewable share — so visitors can understand the true energy portrait of each country.

> Note: UK Carbon Intensity API also appears in `co2-emissions.md`.

## Electricity Mix (Origen de la electricidad)

This section documents how to obtain the **percentage breakdown of electricity generation by source** — not only renewables, but also fossil fuels (coal, natural gas, oil) and nuclear. This is essential to contextualize renewable growth: a country with 30 % wind+solar but 50 % coal is very different from one with 30 % wind+solar and 70 % hydro.

### What data is available

| Source type | Typical labels in APIs |
|---|---|
| Coal | Coal, Brown coal, Hard coal |
| Natural Gas | Gas, Natural gas, Fossil gas |
| Oil / Diesel | Oil, Diesel, Fossil oil |
| Nuclear | Nuclear |
| Hydro | Hydro, Hydroelectric, Run-of-river, Pumped storage |
| Wind | Wind, Onshore wind, Offshore wind |
| Solar | Solar, Solar PV, Solar thermal |
| Bioenergy | Biomass, Biofuels, Waste |
| Geothermal | Geothermal |
| Other / Unknown | Other, Unknown, Marine, Tide |

### Key providers for full mix data

- **Ember** — global, monthly/annual, % and absolute (TWh). Best single source.
- **EIA** — US-centric, state-level, very granular (down to hourly for grid operators).
- **ENTSO-E** — Europe only, 15 min / hourly, official TSO data.
- **Our World in Data (OWID) Energy** — pre-aggregated global annual mix, ideal for quick validation.
- **UK Carbon Intensity** — UK-only real-time mix + forecast, no key needed.

### Typical visualization

- **Stacked area chart** — share (%) over time per country.
- **Donut / pie chart** — current mix snapshot.
- **Fossil vs low-carbon split** — coal+gas+oil vs nuclear+renewables.

> **Future feature idea:** Consider organizing the data into **"renewable"** vs **"non-renewable"** subsections within this category. A toggle or tabbed view could let users switch between the full mix, renewables-only, and fossil/nuclear-only breakdowns. This would provide both the big-picture context and the focused renewable-energy view that the original category name implied.

---

## Providers

### 1. IRENA Statistics (PxWeb / IRENASTAT)

- **URL:** https://pxweb.irena.org/pxweb/en/IRENASTAT/ — downloads: https://www.irena.org/Data
- **License:** ⚠️ Solo no comercial — Commercial use ambiguous in ToS; requires attribution.
- **Model:** Free. Annual downloads (Excel, CSV) and PxWeb API (JSON-stat) for 150+ countries from 2000.
- **Data:** Installed capacity (MW) by technology (solar, onshore/offshore wind, hydro, geothermal, bioenergy, marine), generation (GWh), energy balances, LCOE, investments.
- **API key:** Not required.
- **PxWeb endpoint:** `https://pxweb.irena.org/api/v1/en/IRENA/...` returns JSON-stat.

| Field | Details |
|---|---|
| Base URL | `https://pxweb.irena.org/api/v1/en/IRENA` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Annual |
| Format | JSON-stat, CSV, Excel |

---

### 2. Our World in Data — Energy Dataset

- **URL:** https://github.com/owid/energy-data — CSV: `https://nyc3.digitaloceanspaces.com/owid-public/data/energy/owid-energy-data.csv`
- **License:** ✅ Comercial/ads OK — CC BY.
- **Model:** Free (CC BY). Static downloadable, updated periodically.
- **Data:** Energy mix, renewable share, generation by source, capacity by technology. Based on Energy Institute Statistical Review + EIA + Ember + IRENA.
- **API key:** Not required.

| Field | Details |
|---|---|
| Base URL | `https://nyc3.digitaloceanspaces.com/owid-public/data/energy/` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None |
| Update frequency | Annual |
| Format | CSV, JSON |

---

### 3. Ember — Electricity Data Explorer

- **URL:** https://ember-energy.org/data/ — API: `https://api.ember-energy.org/v1/` — API docs: https://api.ember-energy.org/v1/docs
- **License:** ✅ Comercial/ads OK — CC BY 4.0.
- **Model:** Free (CC BY 4.0). CSV downloads (no key) + REST API (free API key required).
- **Data:** Monthly and annual electricity generation by country and by source (coal, gas, nuclear, hydro, solar, wind, biomass, etc.), electricity sector emissions, carbon intensity. 200+ geographies (yearly); 88 areas (monthly). Last updated March 2026. **Ideal for full electricity mix breakdown — both absolute (TWh) and share (%).**
- **API key:** Not required for CSV downloads. Required for API (free signup at ember-energy.org/data/api).

| Field | Details |
|---|---|
| Base URL (downloads) | https://ember-energy.org/data/ |
| Base URL (API) | `https://api.ember-energy.org/v1/` |
| Auth | None (downloads); API key (free signup) for REST API |
| Free tier | Yes |
| Rate limit | None (downloads) |
| Update frequency | Monthly |
| Format | CSV (downloads); JSON (API) |

---

### 4. IEA Free Data

- **URL:** https://www.iea.org/data-and-statistics/data-product
- **License:** ✅ Comercial/ads OK — CC BY 4.0 (for free datasets).
- **Model:** Mixed: some datasets free, others paid.
- **Data:** Key clean energy indicators, investment, electrification. Detailed energy balances require paid subscription.
- **Limitations:** Detailed energy balance downloads are paid; highlights and main dashboards are free.

| Field | Details |
|---|---|
| Base URL | https://www.iea.org/data-and-statistics/ |
| Auth | None (free datasets) |
| Free tier | Partial (key indicators only) |
| Rate limit | None |
| Update frequency | Annual / periodic |
| Format | Excel, CSV |

---

### 5. EIA (US Energy Information Administration) Open Data API

- **URL:** https://www.eia.gov/opendata/
- **License:** ✅ Comercial/ads OK — Public domain (US Government).
- **Model:** Free. REST + JSON.
- **Data:** US renewable generation by state and source, capacity, prices, real-time grid data (RTO/ISO).
- **API key:** Required (free).
- **CORS:** Enabled.

| Field | Details |
|---|---|
| Base URL | `https://api.eia.gov/v2` |
| Auth | API key (free registration) |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Monthly / near real-time (grid) |
| Format | JSON |

---

### 6. ENTSO-E Transparency Platform (Europe)

- **URL:** https://transparency.entsoe.eu/ — API guide: https://transparency.entsoe.eu/content/static_content/Static%20content/web%20api/Guide.html
- **License:** ✅ Comercial/ads OK — Free with attribution.
- **Model:** Free.
- **Data:** Generation by source every 15 min/hour for all European countries, cross-border flows, prices.
- **API key:** Required (free token).

| Field | Details |
|---|---|
| Base URL | `https://web-api.tp.entsoe.eu/api` |
| Auth | API token (free registration) |
| Free tier | Yes |
| Rate limit | Not publicly specified |
| Update frequency | 15 min / hourly |
| Format | XML (only; no native JSON support) |

---

### 7. Electricity Maps API

- **URL:** https://www.electricitymaps.com/ — API portal: https://api-portal.electricitymaps.com/
- **License:** ⚠️ Solo no comercial — Freemium; commercial use requires a paid plan.
- **Model:** Freemium; free tier limited for research.
- **Data:** Real-time carbon intensity and energy mix by country/zone.
- **API key:** Required.
- **CORS:** Not permitted on client in production.
- **Limitations:** Free plan limits zones and requests. Commercial use is paid.

| Field | Details |
|---|---|
| Base URL | `https://api.electricitymap.org/v3` |
| Auth | API key (free tier limited) |
| Free tier | Yes (limited) |
| Rate limit | Varies by plan |
| Update frequency | Near real-time |
| Format | JSON |

---

### 8. UK Carbon Intensity API

- **URL:** https://api.carbonintensity.org.uk/ (UK National Energy System Operator — NESO)
- **License:** ✅ Comercial/ads OK — CC BY 4.0.
- **Model:** Free. JSON, no API key, CORS enabled.
- **Data:** Carbon intensity and renewable vs fossil fuel mix of the UK electricity grid in real-time and 48h forecast.
- **API key:** Not required.
- **CORS:** Enabled.

| Field | Details |
|---|---|
| Base URL | `https://api.carbonintensity.org.uk` |
| Auth | None |
| Free tier | Yes |
| Rate limit | None specified |
| Update frequency | Every 30 minutes + 48h forecast |
| Format | JSON |

---

## Available Metrics

| Metric | Providers |
|---|---|
| Installed capacity by technology (MW) | IRENA, OWID Energy |
| Generation by source (GWh, annual) | IRENA, OWID Energy, Ember |
| Renewable energy share (%) | OWID Energy, Ember |
| Monthly generation by source | Ember |
| LCOE by technology | IRENA |
| Real-time US grid generation | EIA |
| European generation (15 min) | ENTSO-E |
| Real-time carbon intensity by zone | Electricity Maps, UK Carbon Intensity |
| UK renewable vs fossil mix | UK Carbon Intensity |
| **Electricity generation mix by source (%, TWh)** | **Ember, OWID Energy, EIA, ENTSO-E** |
| **Fossil vs low-carbon share (%)** | **Ember, OWID Energy, UK Carbon Intensity** |
| **Coal / gas / nuclear / hydro / wind / solar breakdown** | **Ember (global), EIA (US), ENTSO-E (EU)** |

## Integration Notes

- **Recommended combination:** OWID Energy CSV (annual, commercial-safe) + Ember (monthly, CC BY) for trend charts. UK Carbon Intensity for real-time UK widget.
- **For full electricity mix (origen de la electricidad):** Ember is the single best global source — it provides share (%) and absolute generation (TWh) for coal, gas, nuclear, hydro, wind, solar, biomass, and other sources across 200+ countries. Start with Ember CSV downloads (no API key) for prototyping; switch to the REST API for automated updates.
- IRENA PxWeb returns JSON-stat — parse with `jsonstat.js`. Commercial use is ambiguous; prefer OWID/Ember for production.
- EIA API (key required, public domain) is US-focused; call from a Route Handler to protect the key.
- ENTSO-E API (token required) returns XML only — JSON is not natively supported. Parse XML server-side or use a wrapper library.
- Electricity Maps is the richest real-time option globally but commercial use requires a paid plan.
- UK Carbon Intensity is the only fully free, CORS-enabled, real-time renewable mix API — CC BY 4.0 licensed.
- **Visual tip:** When showing electricity mix, prefer stacked percentage area charts over absolute TWh when comparing countries of very different sizes (e.g., Germany vs. Iceland).
