## 1. Shared and API

- [x] 1.1 Add `annual: { startYear; endYear; missions: { id; name; values }[] }` to `OceanSeaLevelData`, with doc comments on indexing, rounding and `null`
- [x] 1.2 Compute `annual` in `buildOceanSeaLevelData`: per mission, mean of its observations by calendar year, rounded to 2 decimals, aligned on the shared year range
- [x] 1.3 Unit tests: mean per year, partial years, `null` outside a mission's span, shared range, rounding

## 2. Web

- [x] 2.1 Validate `annual` in the sea level payload guard (aligned lengths, one entry per mission)
- [x] 2.2 Replace the sea level `RowDataTable` with a `YearDataTable`, one column per mission, and remove `seaLevelRows`
- [x] 2.3 Update the chart's accessible description
- [x] 2.4 Update fixtures, unit tests and the E2E table assertions

## 3. Close

- [x] 3.1 Gates: format, lint, typecheck, unit tests, ocean health E2E
- [x] 3.2 Archive the change
