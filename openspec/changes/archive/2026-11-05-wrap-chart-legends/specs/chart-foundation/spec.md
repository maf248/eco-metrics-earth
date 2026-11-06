## MODIFIED Requirements

### Requirement: Mobile-safe, accessible option defaults

A `baseChartOption()` helper SHALL provide the defaults every chart option starts from: `tooltip.confine: true`, `axisLabel.hideOverlap: true` on axes, `legend.type: 'plain'` (a legend wraps onto rows; it never scrolls or pages), `aria.enabled: true`, and a `grid` with `containLabel` and compact paddings. A chart SHALL be paired with a table or text equivalent of its data, and a multi-series chart SHALL show a legend.

#### Scenario: Defaults present

- **WHEN** `baseChartOption()` is called
- **THEN** the returned option has `tooltip.confine` true, `aria.enabled` true and `hideOverlap` on the axis label configuration

#### Scenario: Legend never scrolls

- **WHEN** `baseChartOption()` is called
- **THEN** its legend type is `plain`

## ADDED Requirements

### Requirement: Wrapped legends reserve room by chart width

`apps/web/src/components/charts/wrappedLegend.ts` SHALL export `wrappedLegend(labels, reserve)`, which returns a `plain` legend at the bottom of the chart (centred, `roundRect` icons, explicit padding, item size and item gap), the option `reserve` returns for a one-row legend height, and an ECharts `media` list that starts with a query-less default entry holding the one-row reserve (ECharts reverts to it when a chart widens past every query) followed by one `{ query: { maxWidth }, option }` entry per extra row, ordered from the widest `maxWidth` to the narrowest. The number of rows at a width SHALL be estimated by packing the items greedily from a per-character width table (printable ASCII at 12 px, each entry the widest of DejaVu Sans, Liberation Sans and Arial, any other character counted as the widest entry), so the estimate is never narrower than the legend ECharts draws in common system sans-serif fonts. The helper SHALL be pure and name no colour.

#### Scenario: One row when wide

- **GIVEN** the eight energy source labels
- **WHEN** `wrappedLegend` runs
- **THEN** the root reserve is computed for one row and no media query applies above the widest breakpoint

#### Scenario: More rows when narrow

- **WHEN** the media list is read
- **THEN** each successive entry has a smaller `maxWidth` and reserves a taller legend than the previous one

#### Scenario: Widening reverts the reserve

- **GIVEN** a chart rendered narrow enough for a three-row legend
- **WHEN** it is resized wide enough for one row
- **THEN** the media list's query-less default restores the one-row reserve

#### Scenario: Legend stays clear of the plot

- **GIVEN** the energy sources page at 375 px wide in every E2E browser project (real fonts)
- **WHEN** the stacked area and the donut have rendered
- **THEN** each legend shows all eight sources on more than one row, inside the chart, with no pager, and starts at least 8 px below the year labels or the ring

### Requirement: Chart boxes use the card width on mobile

`ChartSkeleton.tsx` SHALL export `chartBoxClassName(variant)`, used by both the skeleton and the loaded chart of `lazyChart`, so the two never differ. Every box SHALL bleed 12 px into each side of its card's padding below the `sm` breakpoint (`-mx-3 sm:mx-0`). A `series` box SHALL be `h-72 sm:h-96`; a `donut` box SHALL be `h-96` at every width.

#### Scenario: Skeleton and chart share the box

- **WHEN** a lazy chart renders its skeleton and then its chart
- **THEN** both carry the classes of `chartBoxClassName` for their variant

#### Scenario: Donut is taller on mobile

- **WHEN** `chartBoxClassName('donut')` is called
- **THEN** it contains `h-96` and `-mx-3`, and no `h-72`
