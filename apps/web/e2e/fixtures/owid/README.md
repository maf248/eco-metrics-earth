# OWID E2E fixtures

Trimmed captures of the real OWID responses, served by the E2E fixture server. The energy CSV
(`electricity-production-by-source.csv`) is the unedited capture for World, Algeria, Argentina, Bosnia and
Herzegovina and Spain; the API test copy under `apps/api/__tests__/energy-sources/fixtures/` differs
intentionally (hand-edited for edge cases).

## Ocean health

Captured once by hand on 24 Nov 2026 from the exact URLs the API uses
(`v=1&csvType=filtered&useColumnShortNames=true&tab=chart`, plus the `country` filter below). They are
never refreshed inside a test.

- `sea-surface-temperature-anomaly.csv`: `country=OWID_WRL~OWID_NH~OWID_SH`, 1850-2025. The partial
  current year (2026) was removed by hand so the fixture does not depend on the clock the API caps the
  series with.
- `ocean-heat-content-upper.csv` and `ocean-heat-top-2000m.csv`: `country=OWID_WRL`, 1955-2025. Blank
  cells are as returned (each source covers a different span, for example CSIRO ends in 2015).
- `seawater-ph.csv`: no `country` and no `time`; the chart is date-indexed (`entity,day,...`, no `code`).
  Unedited: 345 rows from 1988-10-31 to 2024-12-20, with the blank yearly averages of the first year.
- `indicator-<id>-metadata.json`: captures of
  `https://api.ourworldindata.org/v1/indicators/<id>.metadata.json`, trimmed to the fields the API reads
  plus `origins`, and to `dimensions.entities.values`. Ids: `1357160` (HadSST anomaly, mean), `1357159`
  (heat content 0-700 m), `1357158` (heat content 0-2000 m) and `1357137` (pH, monthly). The
  `origins[].license` objects are kept as returned.

## Deforestation

Captured once by hand on 27 Nov 2026 from the exact URLs the API services build
(`v=1&csvType=filtered&useColumnShortNames=true&tab=chart`, the `country` allowlist and the `time`
range below), then trimmed to 20 entities: World, Brazil, China, Russia, Nauru (0 ha of forest in
every year, so no percentage change), Sudan, South Sudan, Argentina, Uruguay (879,440 ha in 1990),
Ireland and Luxembourg (both under the 1 million ha ranking threshold, with blank drivers in some
years), Indonesia, Democratic Republic of Congo, Paraguay, Burkina Faso, Benin, Canada, India,
Tanzania and Angola. Every entity has a shape in the map geometry. Rows are otherwise as returned,
so the World values are the real ones (4,343,532,500 ha in 1990, 4,140,214,500 in 2025; 33.472633%
and 31.905802%). They are never refreshed inside a test. The same captures, with the same
procedure, live under `apps/api/__tests__/deforestation/fixtures/` for the API tests.

- `forest-area-km.csv`: `https://ourworldindata.org/grapher/forest-area-km.csv`, `time=1990..2026`
  (the data ends in 2025), column `_1a_forestarea`.
- `forest-area-as-share-of-land-area.csv`:
  `https://ourworldindata.org/grapher/forest-area-as-share-of-land-area.csv`, `time=1990..2026`,
  column `forest_share`. The chart reaches back to the year 1000; only 1990 onwards is requested.
- `tree-cover-loss-by-dominant-driver.csv`:
  `https://ourworldindata.org/grapher/tree-cover-loss-by-dominant-driver.csv`, `time=2001..2026`
  (the data ends in 2024), seven driver columns in one download. Nauru is not in this chart.
- `indicator-1129226-metadata.json` (forest area, FAO FRA 2025), `indicator-1132530-metadata.json`
  (share of land covered by forest) and `indicator-1104660-metadata.json` (tree cover loss driven by
  agriculture, one of the seven drivers): captures of
  `https://api.ourworldindata.org/v1/indicators/<id>.metadata.json`, trimmed to the fields the API
  reads plus `origins` (as returned), and to the entities above in `dimensions.entities.values`.

Facts the E2E spec relies on: the key figures read "a net 203 million hectares" and "31.9%"; of the
19 countries, 4 started under 1 million ha of forest (Nauru, Luxembourg, Ireland, Uruguay) and are
listed after the ranked ones when sorting by percentage; Brazil has the largest net loss
(-132,357 thousand ha, -21.4%) and Burkina Faso the largest percentage loss (-61.0%); Ireland has a
blank hard commodities value in 2024 and a blank shifting cultivation value in every year.
