## ADDED Requirements

### Requirement: Ocean health wire types

`packages/shared/src/lib/ocean-health.ts` SHALL export from the package root the eleven ocean health wire types of the change design, types only, with English doc comments on indexing, units, baselines, rounding and `null` meaning "no observation".

#### Scenario: Types are importable from both apps

- **WHEN** `OceanSstDailyData` is imported from `@eco-metrics/shared` in the API and the web app
- **THEN** both type-check

#### Scenario: Nulls and negative values are representable

- **WHEN** a type-level test builds an `OceanSstDailyData` with `null` slots and a negative anomaly
- **THEN** it type-checks

#### Scenario: Exported names

- **WHEN** the package root is inspected
- **THEN** it exports `OceanSstStatus`, `OceanSstDailyPoint`, `OceanSstDailyData`, `OceanSstAnomalyRegion`, `OceanSstAnomalyData`, `OceanHeatSource`, `OceanHeatDepth`, `OceanHeatContentData`, `OceanSeaLevelMission`, `OceanSeaLevelData` and `OceanPhData`, and shared coverage thresholds still hold

#### Scenario: Envelope typing

- **WHEN** an `ApiResponse<OceanSeaLevelData>` with `meta` is declared
- **THEN** it type-checks
