# Postman Collections — eco-metrics earth

API collections for all external data providers used in the project.

## Files

| File | Description |
|------|-------------|
| `world-bank.collection.json` | World Bank Open Data API |
| `noaa.collection.json` | NOAA Climate & Weather API |
| `open-meteo.collection.json` | Open-Meteo Weather API |
| `our-world-in-data.collection.json` | Our World in Data datasets |
| `eco-metrics.environment.template.json` | Environment variables template (no real keys) |

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
