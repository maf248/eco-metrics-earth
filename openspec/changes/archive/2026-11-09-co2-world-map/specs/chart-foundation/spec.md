## ADDED Requirements

### Requirement: A sequential palette and a no-data color are declared and themed

`globals.css` SHALL declare `--chart-seq-1` … `--chart-seq-5` and `--chart-no-data` with light values on `:root` and dark values under `.dark`, not mapped in `@theme inline`. The theme adapter SHALL read them by name and add to the ECharts theme a visual map default (`visualMap.inRange.color` = the five steps, low to high) and map series defaults (`map.itemStyle.areaColor` = no-data, border from `line-strong`, emphasis and select border from `fg` with the region's own fill kept). The token guard SHALL recognise these tokens as used. Map options SHALL NOT name a color.

#### Scenario: Theme carries the map colors

- **WHEN** the theme is built
- **THEN** it has `visualMap.inRange.color` with five resolved colors in token order and `map.itemStyle.areaColor` resolved from `--chart-no-data`

### Requirement: Maps register where they are used and load lazily

A lazy map entry SHALL register the map series and the piecewise visual map only in the chunk loaded by `LazyMapEChart`, so pages without a map never download them. `ChartSkeleton` SHALL offer a `map` variant whose box keeps the world geometry's aspect ratio, shared with the loaded chart's box. The world geometry SHALL be fetched from a static asset once per page load and registered once.

#### Scenario: Skeleton and chart share the box

- **WHEN** the map variant's box class is computed
- **THEN** the skeleton and the loaded chart use the same class, whose aspect ratio matches the asset's `aspect` within 0.01

### Requirement: The chart wrapper exposes its instance

`EChart` SHALL accept an optional `onReady(chart)` callback, called once after the first option and theme are applied, so a component can read and change the view (zoom, selection). The lazy chart SHALL pass it through.

#### Scenario: onReady is called once

- **WHEN** an `EChart` with `onReady` mounts and then receives a new option
- **THEN** `onReady` was called exactly once, with the instance

## MODIFIED Requirements

### Requirement: ECharts is installed and chart tokens are declared

`apps/web/package.json` SHALL list `echarts` at the exact version `6.1.0` (no range, no `echarts-for-react`). `apps/web/src/app/globals.css` SHALL declare `--chart-1` to `--chart-8` on `:root` (light) and `.dark` (dark) with the hex values recorded in `docs/design-system.md` (Color Palettes), and SHALL NOT map them in `@theme inline`. The sequential ramp `--chart-seq-1` to `--chart-seq-5` and the no-data fill `--chart-no-data` SHALL be declared in both themes with the values recorded in `docs/design-system.md` (Sequential), read by name by the theme adapter and not mapped in `@theme inline`; they were added by the first change that uses them (the world map). Divergent tokens SHALL NOT be declared: the divergent palette stays pending.

#### Scenario: Pinned dependency

- **WHEN** `apps/web/package.json` is read
- **THEN** `echarts` is `6.1.0` exactly and `echarts-for-react` is absent

#### Scenario: Categorical tokens in both themes

- **WHEN** `globals.css` is read
- **THEN** `--chart-1` is `#2a78d6` on `:root` and `#3987e5` under `.dark`, and `--chart-2` to `--chart-8` match the design-system table in both themes

#### Scenario: No unused tokens

- **WHEN** `globals.css` is read
- **THEN** it declares no divergent token, and every `--chart-seq-*` token and `--chart-no-data` is consumed (`CHART_SEQUENTIAL_TOKENS`, `CHART_NO_DATA_TOKEN`)

#### Scenario: No Tailwind utilities for chart tokens

- **WHEN** the `@theme inline` block is read
- **THEN** it contains no `--color-chart-*` entry
