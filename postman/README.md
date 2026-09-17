# Postman Collections — eco-metrics earth

API collections for all external data providers used in the project.

## Files

| File                                                                                | Description                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `World Bank Open Data API — Environment & Development.postman_collection.json`      | World Bank Open Data API                                    |
| `NOAA — eco-metrics earth.postman_collection.json`                                  | NOAA (GML, Tides & Currents, NSIDC, NCEI)                   |
| `Open-Meteo — Weather, Climate, Air Quality, Marine, Flood.postman_collection.json` | Open-Meteo (prototype only — non-commercial license)        |
| `Our World in Data — Ecology, Humanity & Sustainability.postman_collection.json`    | Our World in Data (first production provider — see ROADMAP) |
| `eco-metrics.environment.template.json`                                             | Environment variables template (no real keys)               |

## Sync strategy

### Option A — Postman Git Sync (recommended)

Each collection is connected to this repo via Postman's native Git Sync.

- **Postman → repo:** open the collection → top-right menu → "Push changes"
- **Repo → Postman:** open the collection → top-right menu → "Pull changes"

See setup guide: https://learning.postman.com/docs/collaborating-in-postman/using-version-control/git-integration/

### Option B — Manual export/import

1. In Postman: right-click collection → Export → Collection v2.1 → save to this folder
2. To import: File → Import → select the JSON from this folder

## Environment setup

1. Copy `eco-metrics.environment.template.json`
2. Rename to `eco-metrics.environment.json` (gitignored — never commit this)
3. Fill in real API keys
4. Import into Postman: Environments → Import
