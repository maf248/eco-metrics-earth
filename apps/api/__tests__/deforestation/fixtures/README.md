# Deforestation fixtures

Captured once, by hand, on 27 Nov 2026 from the exact URLs the services build (request header
`User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`). They are never
refreshed inside a test, and no test reaches the network. The E2E copies (added with the web
change) live in `apps/web/e2e/fixtures/owid/`; the API tests keep their own, as for the other
categories.

All three CSVs were requested with `v=1&csvType=filtered&useColumnShortNames=true&tab=chart`, the
full `country` allowlist of `listCountryEntityCodes()` and the `time` range below, then trimmed by
keeping the rows of 20 entities: World, Brazil, China, Russia, Nauru (0 ha of forest in every
year), Sudan, South Sudan, Argentina, Uruguay (879,440 ha in 1990, under the 1 million ha ranking
threshold, with blank shifting cultivation), Ireland and Luxembourg (under the threshold, all
blank drivers in some years), Indonesia, Democratic Republic of Congo, Paraguay, Burkina Faso,
Benin, Canada, India, Tanzania and Angola. Rows are otherwise as returned. The World values are the
real ones (4,343,532,500 ha in 1990, 4,140,214,500 in 2025; 33.472633% and 31.905802%).

- `forest-area-km.csv`: `https://ourworldindata.org/grapher/forest-area-km.csv`, `time=1990..2026`
  (the data ends in 2025), column `_1a_forestarea`.
- `forest-area-as-share-of-land-area.csv`:
  `https://ourworldindata.org/grapher/forest-area-as-share-of-land-area.csv`, `time=1990..2026`,
  column `forest_share`. The chart reaches back to the year 1000; only 1990 onwards is requested.
- `tree-cover-loss-by-dominant-driver.csv`:
  `https://ourworldindata.org/grapher/tree-cover-loss-by-dominant-driver.csv`, `time=2001..2026`
  (the data ends in 2024), seven driver columns in one download. Nauru is not in this chart.
- `indicator-<id>-metadata.json`: captures of
  `https://api.ourworldindata.org/v1/indicators/<id>.metadata.json`, trimmed to the fields the API
  reads plus `origins` (as returned), and to the entities above in `dimensions.entities.values`.
  Ids: `1129226` (forest area, FAO FRA 2025, unit `hectares`), `1132530` (share of land covered by
  forest, unit `%`) and `1104660` (tree cover loss driven by agriculture, one of the seven drivers,
  unit `hectares`).
