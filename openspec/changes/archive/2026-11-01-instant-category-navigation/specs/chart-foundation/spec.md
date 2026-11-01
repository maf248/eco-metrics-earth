# Spec Delta

## MODIFIED Requirements

### Requirement: Charts load lazily with a same-height skeleton

A Client Component `LazyEChart` SHALL import `EChart` on demand, on the client only and without a Suspense boundary, so that a chunk already loaded draws at once. It SHALL render `ChartSkeleton` of exactly the chart's height, shaped like the chart it stands for (a series silhouette or a donut), while the chunk loads, so the layout does not shift when the chart appears. The page itself SHALL remain a Server Component. ECharts SHALL NOT be part of the JavaScript of routes that do not render a chart.

#### Scenario: Skeleton then chart

- **WHEN** `LazyEChart` renders before the chunk resolves
- **THEN** the skeleton is shown with the same height classes as the loaded chart container

#### Scenario: No layout shift

- **WHEN** the chunk resolves and the chart replaces the skeleton
- **THEN** the container height is unchanged

#### Scenario: Other routes do not load ECharts

- **WHEN** the production build output of a placeholder category route (e.g. `/ocean-health/`) is inspected
- **THEN** it references no chunk that contains `echarts`
