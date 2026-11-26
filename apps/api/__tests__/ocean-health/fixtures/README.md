# Ocean health fixtures

Captured once, by hand, on 25 Nov 2026 from the exact URLs the services use (request header
`User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`). They are never
refreshed inside a test, and no test reaches the network.

## Copernicus Climate Pulse

`era5_daily_series_sst_60S-60N_ocean.csv` comes from
`https://sites.ecmwf.int/data/climatepulse/data/series/era5_daily_series_sst_60S-60N_ocean.csv`.

Hand edits:

- Every `#` header line is kept as returned (including `# Last updated: 24 Nov 2026`, which is
  therefore later than the last data row).
- The data is trimmed to 2023-01-01 .. 2025-04-20: a common year (2023), a leap year (2024, so
  29 February exists) and a partial last year (2025). The record of this window is in 2024, not in
  the latest year.
- The last row (`2025-04-20`) was changed from `FINAL` to `PRELIMINARY` by hand: the live file has no
  preliminary row at capture time.

## NOAA Laboratory for Satellite Altimetry

`slr_sla_gbl_free_ref_90.csv` comes from
`https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_ref_90.csv`.

Hand edits:

- The six header lines (five `#` lines and the column header) are kept as returned.
- Of the 1,557 data rows, 300 are kept in three non-contiguous windows: the first 100 rows
  (TOPEX/Poseidon, 1992-1996), rows 301-400 (TOPEX/Poseidon and Jason-1 overlap, 2002-2003) and the
  last 100 rows (Jason-3 and Sentinel-6MF, 2023-2025).
- Because of that, Jason-2 has no value in the file: its column is present and empty, which
  exercises "a mission without values is dropped".

## Our World in Data

Requested with `v=1&csvType=filtered&useColumnShortNames=true&tab=chart` plus:

- `sea-surface-temperature-anomaly.csv`: `country=OWID_NH~OWID_SH~OWID_WRL`, trimmed to 2022-2026
  (2026 is the partial current year at capture time and is kept to prove it is not served).
- `ocean-heat-content-upper.csv` and `ocean-heat-top-2000m.csv`: `country=OWID_WRL`, trimmed to
  2012-2025. Blank cells are as returned (CSIRO ends in 2015, IAP and MRI/JMA in 2020).
- `seawater-ph.csv`: no `country`, no `time`. The chart has no `code` column (`entity,day,...`).
  Trimmed to the first six and the last six rows of the 345 returned (the series ends
  2024-12-20). The blank yearly-average cells are as returned.
- `indicator-<id>-metadata.json`: captures of
  `https://api.ourworldindata.org/v1/indicators/<id>.metadata.json`, trimmed to the fields the
  client reads plus `origins`, and to `dimensions.entities.values`. Ids: `1357160` (HadSST anomaly,
  mean), `1357159` (NOAA heat content 0-700 m), `1357158` (NOAA heat content 0-2000 m), `1357155`
  (IAP heat content 0-700 m, kept as a reference for the EPA origin) and `1357137` (pH, monthly).
  The `origins[].license` objects (name and URL) are kept as returned; they are the source of the
  license constants.
