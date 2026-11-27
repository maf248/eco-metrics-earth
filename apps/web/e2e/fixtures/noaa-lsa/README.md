# NOAA Laboratory for Satellite Altimetry E2E fixture

`slr_sla_gbl_free_ref_90.csv` is a trimmed capture, taken once by hand on 24 Nov 2026 from
`https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_free_ref_90.csv` (request header
`User-Agent: eco-metrics-earth-api (+https://github.com/maf248/eco-metrics-earth)`). The E2E fixture server
serves it under `/noaa-lsa/` and the API reads it with its real parser. It is never refreshed inside a test.

Hand edits (and nothing else):

- The six header lines (five `#` lines, including `#trend = 3.11 mm/year (...)`, and the column header)
  are kept as returned.
- Of the 1,557 data rows, 300 are kept in three non-contiguous windows: the first 100 rows (TOPEX/Poseidon,
  1992-1996), rows 1,287-1,386 (Jason-3 and Sentinel-6MF overlap, 2020-2022) and the last 100 rows
  (Jason-3 and Sentinel-6MF to the end of the file).
- Because of that only three missions have values (TOPEX/Poseidon, Jason-3 and Sentinel-6MF); the Jason-1
  and Jason-2 columns are present and empty, which exercises "a mission without values is dropped".
- The file is frozen upstream: NOAA's data ends in February 2025 and the page derives its end-date note
  from the data, so the fixture keeps that end.
