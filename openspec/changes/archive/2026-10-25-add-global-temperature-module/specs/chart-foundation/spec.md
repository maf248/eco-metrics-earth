## MODIFIED Requirements

### Requirement: Shared chart wrapper owns the ECharts instance

`apps/web/src/components/charts/EChart.tsx` (a Client Component) SHALL be the only place that creates ECharts instances. It SHALL initialise with `echarts.init(element, undefined, { renderer: 'svg' })` using only tree-shaken imports from `echarts/core` and the modules registered in `echartsSetup.ts` (line chart, grid, tooltip, legend, aria, mark line, SVG renderer; never the canvas renderer), call `setOption(option)` and only then `setTheme(theme)`, observe its container with a `ResizeObserver` and call `resize()`, re-resolve and re-apply the theme with `setTheme` whenever the `dark` class on `<html>` changes (observed with a `MutationObserver`), disable animation under `prefers-reduced-motion: reduce`, and call `dispose()` and disconnect both observers on unmount. It SHALL receive the option as a prop and SHALL NOT embed any chart-specific logic.

#### Scenario: Renders an SVG

- **GIVEN** a container with explicit width and height in jsdom
- **WHEN** `EChart` mounts with a line option
- **THEN** an `<svg>` element is present in the container

#### Scenario: Theme is applied after the option

- **WHEN** the wrapper initialises
- **THEN** `setOption` is called before `setTheme`

#### Scenario: Theme follows the dark class

- **GIVEN** a mounted chart
- **WHEN** the `dark` class is added to `<html>`
- **THEN** the theme is re-resolved and `setTheme` is called with the dark values

#### Scenario: Resize

- **WHEN** the `ResizeObserver` callback fires
- **THEN** the chart's `resize()` is called

#### Scenario: Dispose on unmount

- **WHEN** the component unmounts
- **THEN** the instance is disposed and both observers are disconnected

#### Scenario: Reduced motion

- **GIVEN** `prefers-reduced-motion: reduce` matches
- **WHEN** the chart is configured
- **THEN** animation is disabled

#### Scenario: A reference line renders

- **GIVEN** a line option whose series declares a mark line at a value
- **WHEN** `EChart` mounts in jsdom with an explicit size
- **THEN** the SVG contains the reference line and its label text

## ADDED Requirements

### Requirement: Charts can draw a themed reference line

A chart option MAY declare a horizontal reference line (a series `markLine`) with a text label, for example a baseline at zero. The line stroke and the label text colors SHALL come from the chart theme, never from the option: the theme adapter SHALL resolve them from tokens (`CHART_UI_TOKENS`: `referenceLine` from `fg-muted`, `referenceLabel` from `fg-secondary`) and include them in the ECharts theme so they follow light and dark mode through `setTheme`. The mark line component SHALL be registered in `echartsSetup.ts`; its measured gzipped cost SHALL be recorded in `docs/technical/libraries.md`.

#### Scenario: Reference line colors are in the theme

- **GIVEN** a canvas stub and light and dark token values
- **WHEN** the adapter builds the theme in each mode
- **THEN** the theme carries a reference line stroke and label color that differ between the modes

#### Scenario: Options carry no reference line colors

- **WHEN** an option builder that declares a reference line is run
- **THEN** the returned option contains no color property, `var(`, `oklch(`, `#` color literal or `rgb` string

#### Scenario: Reference line repaints with the theme

- **GIVEN** a mounted chart with a reference line
- **WHEN** the `dark` class is added to `<html>`
- **THEN** the reference line stroke and label fill in the SVG change

#### Scenario: Registration is shared

- **WHEN** `echartsSetup.ts` is read
- **THEN** it registers the mark line component next to the line chart, grid, tooltip, legend and aria components

### Requirement: Charts can draw a confidence band without naming colors

A chart option MAY draw a confidence band as a pair of stacked line series: an invisible base series at the lower bound (no line, no area, no symbol) and a series holding the interval width (`upper - lower`) with a low-opacity area and no line. The band takes its color from the chart theme palette (the same palette entry as the main series, through series order) and only an opacity is set in the option. The pair SHALL be excluded from the tooltip's series list (the tooltip is formatted by the option's formatter, showing the interval once) and from the `aria` description where ECharts allows. Missing bounds SHALL leave a gap, not zero.

#### Scenario: Band option shape

- **WHEN** a band option is built from `lower` and `upper`
- **THEN** it holds two stacked series whose second one has an area with an `opacity` below 0.5 and no color property

#### Scenario: Band renders in jsdom

- **WHEN** the option is mounted with explicit size
- **THEN** the SVG contains an area path for the band

#### Scenario: Band follows the theme

- **WHEN** the `dark` class is added to `<html>`
- **THEN** the band fill changes with the theme palette

### Requirement: Below-the-fold charts render when they scroll into view

A client component `RenderWhenVisible` SHALL render a same-height skeleton until its container intersects the viewport (`IntersectionObserver`, with a small root margin) and only then mount its children (the lazy chart, so the ECharts chunk request starts then), and SHALL stop observing after the first intersection. When `IntersectionObserver` is unavailable it SHALL render the children immediately. The first chart of a page SHALL NOT use it.

#### Scenario: Hidden until intersecting

- **GIVEN** an `IntersectionObserver` mock that has not reported an intersection
- **WHEN** the component renders
- **THEN** the skeleton is shown and the children are not mounted

#### Scenario: Mounted on intersection

- **WHEN** the mock reports an intersection
- **THEN** the children are mounted and the observer is disconnected

#### Scenario: Fallback without the API

- **GIVEN** `IntersectionObserver` is undefined
- **WHEN** the component renders
- **THEN** the children are mounted immediately

#### Scenario: Same height

- **WHEN** the skeleton is shown
- **THEN** it has the chart's height classes, so mounting the chart causes no layout shift

### Requirement: Year axes label decades only

Every chart whose category axis is a year range (CO2, per-country temperature and the long-run global series) SHALL build that axis with one shared helper that keeps every year as a category but labels, and ticks, only decade years (`year % 10 === 0`), with the overlap guard kept, so labels stay readable at 375 px. Reference-line labels SHALL be short, placed clear of the data line and never clipped at 375 px.

#### Scenario: Only decades are labelled

- **GIVEN** a year axis from 1948 to 1952
- **WHEN** the axis is built
- **THEN** all five years are categories and only 1950 is labelled and ticked

#### Scenario: One helper for all year charts

- **WHEN** the CO2, per-country temperature and long-run global chart options are built
- **THEN** their x axes come from the shared helper
