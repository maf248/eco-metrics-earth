# Postman Collections — eco-metrics earth

API collections for all external data providers used in the project.

## Files

| File                                                                                            | Description                                                 |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `collections/World Bank Open Data API — Environment & Development.postman_collection.json`      | World Bank Open Data API                                    |
| `collections/NOAA — eco-metrics earth.postman_collection.json`                                  | NOAA (GML, Tides & Currents, NSIDC, NCEI)                   |
| `collections/Open-Meteo — Weather, Climate, Air Quality, Marine, Flood.postman_collection.json` | Open-Meteo (prototype only — non-commercial license)        |
| `collections/Our World in Data — Ecology, Humanity & Sustainability.postman_collection.json`    | Our World in Data (first production provider — see ROADMAP) |
| `environments/eco-metrics.environment.template.json`                                            | Environment variables template (no real keys)               |

The layout matches Postman's Git Sync convention: `postman/collections/` for collection files and `postman/environments/` for environment files.

## Sync strategy

### Option A — Postman Git Sync (recommended)

Each collection is connected to this repo via Postman's native Git Sync.

- **Postman → repo:** open the collection → top-right menu → "Push changes"
- **Repo → Postman:** open the collection → top-right menu → "Pull changes"

See setup guide: https://learning.postman.com/docs/collaborating-in-postman/using-version-control/git-integration/

### Option B — Manual export/import

1. In Postman: right-click collection → Export → Collection v2.1 → save to `postman/collections/`
2. To import: File → Import → select the JSON from `postman/collections/`

## Environment setup

Only one real API key is required: **CDO_TOKEN** for the NOAA Climate Data Online (CDO) API.

1. Register for a free NOAA CDO token at https://ncdc.noaa.gov/cdo-web/token
2. Copy `environments/eco-metrics.environment.template.json`
3. Rename it to `eco-metrics.environment.json` (gitignored — never commit this)
4. Replace `REPLACE_WITH_YOUR_TOKEN` with your real CDO token and `REPLACE_WITH_YOUR_EMAIL` with the contact email the NOAA NWS `User-Agent` header requires
5. Import into Postman: Environments → Import
6. Select the `eco-metrics` environment in the Postman environment dropdown

The environment-level `CDO_TOKEN` and `contactEmail` override the placeholder variables of the same name in the NOAA collection. All other collections (World Bank, Open-Meteo, Our World in Data) work without any API keys.
