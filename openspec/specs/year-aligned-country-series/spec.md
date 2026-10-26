# year-aligned-country-series Specification

## Purpose

Provide one generic builder that turns OWID long-format rows into compact year-aligned country entities, shared by every per-country category so payload shape and edge cases are handled once.

## Requirements

### Requirement: A generic builder assembles year-aligned country entities

`apps/api/src/common/series/` SHALL export a pure function `buildYearAlignedEntities` that takes `{ label, startYear, allowedCodes, measures }` where `measures` maps a measure key to `{ series: MetricSeries[]; convert: (value: number) => number }`, and returns `{ endYear, entities }`. It SHALL: keep only series whose `entityCode` is in `allowedCodes`; derive `endYear` as the latest year with a non-null value in any measure at or after `startYear`; build for every entity one array per measure key of length `endYear - startYear + 1` (index `i` = year `startYear + i`, `null` where there is no value or the year is out of range) applying `convert` to each present value; drop entities whose arrays are all `null`; attach `iso2` through `iso2ForEntityCode`; take the display name from the first measure series that has the entity; order World first, then by name (English collation) with the code as tie-break; and throw `ProviderDataError` (`<label> response has no value in any year`, `<label> response has no World entity`) when there is no usable year or no World. The module SHALL also export `roundTo(value, decimals)` (which returns `0` rather than `-0`) and `latestTimestamp(...timestamps)`. `common/` MUST NOT import from `modules/`. The builder SHALL NOT know any category: units, rounding and measure names stay in the category.

#### Scenario: Two measures are merged by entity code

- **GIVEN** two measures where `ARG` appears in both and `ATA` only in the first
- **WHEN** the entities are built
- **THEN** `ARG` has both arrays populated and `ATA` has an all-`null` array for the second measure

#### Scenario: One measure works the same way

- **GIVEN** a single measure key
- **WHEN** the entities are built
- **THEN** each entity has exactly that key, aligned to the year range

#### Scenario: Gaps and out-of-range years

- **GIVEN** a series with no 1951 value and a point for a year before `startYear`
- **WHEN** the entities are built
- **THEN** index 1 is `null` and the earlier year is ignored

#### Scenario: Allowlist and ordering

- **GIVEN** series for `OWID_EUR`, `ZZZ` (outside `allowedCodes`), `OWID_WRL`, `ARG` and `AFG`
- **WHEN** the entities are built
- **THEN** only `OWID_WRL`, `AFG` and `ARG` are returned, in that order

#### Scenario: Unusable input

- **GIVEN** series with no value in any year, or without `OWID_WRL`
- **WHEN** the entities are built
- **THEN** a `ProviderDataError` is thrown whose message starts with the given `label`

#### Scenario: Conversion and rounding are the caller's

- **GIVEN** a `convert` that divides by 1,000,000 and rounds to 3 decimals
- **WHEN** the entities are built from `29921192`
- **THEN** the value is `29.921`

#### Scenario: Negative zero is normalized

- **WHEN** `roundTo(-0.001, 2)` is called
- **THEN** it returns `0` and `Object.is(result, -0)` is false

### Requirement: CO2 emissions is rebuilt on the generic builder without changing its output

`buildCo2EmissionsData` SHALL compose `buildYearAlignedEntities`, `roundTo` and `latestTimestamp` instead of carrying its own copies, keeping its exported name, input shape, `ProviderDataError` messages and output byte-for-byte identical for the same input. The existing `co2-emissions` unit suites SHALL pass without assertion changes.

#### Scenario: Existing CO2 builder tests pass unchanged

- **WHEN** `build-co2-emissions-data.test.ts` and `co2-emissions.controller.test.ts` run
- **THEN** they pass with no change to their assertions

#### Scenario: Output is identical for the committed fixtures

- **GIVEN** the committed CO2 fixtures
- **WHEN** the builder output is serialized before and after the refactor
- **THEN** the two JSON strings are equal

### Requirement: OWID responses share one envelope helper

`apps/api/src/modules/providers/owid/` SHALL export `buildOwidEnvelope(data, lastUpdated)` returning `{ success: true, data, status: 200, meta: { source: { ...OWID_PUBLISHER, lastUpdated }, fetchedAt } }` with `fetchedAt` the ISO 8601 time of the call. Both category controllers SHALL use it, so the attribution contract exists in one place.

#### Scenario: Envelope shape

- **WHEN** `buildOwidEnvelope(D, '2026-10-13T08:42:32.000Z')` is called
- **THEN** it returns `success: true`, `status: 200`, `data` equal to `D`, `meta.source` equal to `OWID_PUBLISHER` plus that `lastUpdated`, and an ISO `meta.fetchedAt`

#### Scenario: CO2 controller output is unchanged

- **WHEN** the CO2 controller test runs
- **THEN** it passes with the same assertions

### Requirement: The year alignment of a single series is reusable

`apps/api/src/common/series/` SHALL also export `alignSeriesToYears(series, startYear, length, convert)` returning an array of `length` numbers or `null` (index `i` = year `startYear + i`, `null` where the series has no value or the year is out of range), the same routine `buildYearAlignedEntities` uses per measure, so a payload block that is not an entity list (such as the global temperature series) aligns its arrays identically.

#### Scenario: Aligned array from one series

- **GIVEN** a series with points for 1850 and 1852 and `length` 3
- **WHEN** `alignSeriesToYears` runs with `startYear` 1850
- **THEN** the result is `[a, null, c]`

#### Scenario: Missing series

- **WHEN** `alignSeriesToYears` receives `undefined`
- **THEN** it returns an array of `null` of the given length
