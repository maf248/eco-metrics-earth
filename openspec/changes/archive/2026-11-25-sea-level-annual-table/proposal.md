## Why

The sea level data table lists every observation of every mission: about 1,650 rows with the live NOAA file, roughly 6,600 DOM nodes and about 0.4 MB of uncompressed HTML, repeated in the React Server Components payload. That one disclosure outweighs the rest of the page and triggers Lighthouse's excessive DOM size audit, while a reader looking for the text equivalent of the chart wants the trend, not 10-day samples.

## What Changes

- `GET /ocean-health/sea-level` adds `annual` to `OceanSeaLevelData`: for every mission, the mean of its observations in each calendar year, rounded to 2 decimals and year-aligned on one shared range (`null` where the mission did not observe). The per-observation `missions` stay as they are for the chart.
- The sea level table becomes a `YearDataTable`: one row per year, newest first, one column per mission. Its caption says a year a mission only partly covered averages the observations it has.
- The chart's accessible description says the table lists the yearly average of every mission.
- No new exported shared type: `annual` is an inline field of `OceanSeaLevelData`.

## Impact

- Shared: `OceanSeaLevelData` gains a required field. Deploy the API before the web, as for the module itself.
- API: `buildOceanSeaLevelData`, its tests and the controller test.
- Web: payload guard, sea level section, chart option description, fixtures, unit and E2E tests.
- Specs: `ocean-health-api` and `ocean-health-page`.
