# Copernicus Climate Pulse E2E fixture

`era5_daily_series_sst_60S-60N_ocean.csv` is a trimmed capture, taken once by hand on 24 Nov 2026 from
`https://sites.ecmwf.int/data/climatepulse/data/series/era5_daily_series_sst_60S-60N_ocean.csv` (request
header `User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`). The E2E fixture
server serves it under `/copernicus/` and the API reads it with its real parser. It is never refreshed
inside a test.

Hand edits (and nothing else):

- Every `#` header line is kept as returned, including `# Last updated: 24 Nov 2026`, which is therefore
  later than the last data row.
- The data is trimmed to 2022-01-01 .. 2025-06-30: three full years (2022, 2023 and the leap year 2024, so
  29 February exists) and a partial fourth (2025). The highest daily value of this window is in 2024, not
  in the latest year, so the "record is not in the latest year" branch is exercised. It is 21.091 °C on
  both 1 and 20 March 2024: a tie, which the API resolves to the most recent date (20 March).
- Every row keeps the status the source returned (all `FINAL`): the live file has no preliminary row, so the
  preliminary flag is covered by unit tests only.
