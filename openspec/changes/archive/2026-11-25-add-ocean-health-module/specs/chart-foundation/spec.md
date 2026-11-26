## ADDED Requirements

### Requirement: Series can take a muted role from the theme

The chart theme adapter SHALL expose a resolved `mutedLine` color built from an existing design token (`line-strong`, at a low opacity validated on both surfaces), and the lazy chart wrapper SHALL apply it to every series an option builder flags `muted: true`, before `setOption` and again whenever the theme changes. An option builder SHALL write only the flag, never a color, so chart options still name no color. A muted series SHALL NOT take a palette position away from the unflagged series.

#### Scenario: Muted series take the adapter color

- **GIVEN** an option with series flagged `muted: true`
- **WHEN** the chart mounts in light and in dark mode
- **THEN** those series' line color is the resolved `mutedLine` of the active theme

#### Scenario: Palette positions are unaffected

- **GIVEN** two unflagged series and several muted ones
- **WHEN** the chart mounts
- **THEN** the unflagged series take the first two palette colors

#### Scenario: Theme change re-applies the role

- **WHEN** the `dark` class on `<html>` toggles
- **THEN** the muted series update to the other theme's color

#### Scenario: Options stay color-free

- **WHEN** the unit test scans the ocean-health option builders' output
- **THEN** no string in it is a color

## MODIFIED Requirements

### Requirement: Charts load lazily with a same-height skeleton

A Client Component `LazyEChart` SHALL import `EChart` on demand, on the client only and without a Suspense boundary, so that a chunk already loaded draws at once. It SHALL render `ChartSkeleton` of exactly the chart's height, shaped like the chart it stands for (a series silhouette or a donut), while the chunk loads, and hydration SHALL keep that skeleton even if the chunk arrived first, so the client matches the server HTML, so the layout does not shift when the chart appears. The page itself SHALL remain a Server Component. ECharts SHALL NOT be part of the JavaScript of routes that do not render a chart.

#### Scenario: Skeleton then chart

- **WHEN** `LazyEChart` renders before the chunk resolves
- **THEN** the skeleton is shown with the same height classes as the loaded chart container

#### Scenario: No layout shift

- **WHEN** the chunk resolves and the chart replaces the skeleton
- **THEN** the container height is unchanged

#### Scenario: Other routes do not load ECharts

- **WHEN** the production build output of a placeholder category route (e.g. `/air-quality/`) is inspected
- **THEN** it references no chunk that contains `echarts`
