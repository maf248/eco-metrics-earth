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
