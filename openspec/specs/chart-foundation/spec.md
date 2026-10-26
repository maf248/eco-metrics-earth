# chart-foundation Specification

## Purpose

Provide the shared ECharts foundation: chart tokens, token-driven theme adapter, lifecycle wrapper and lazy loading.

## Requirements

### Requirement: ECharts is installed and chart tokens are declared

`apps/web/package.json` SHALL list `echarts` at the exact version `6.1.0` (no range, no `echarts-for-react`). `apps/web/src/app/globals.css` SHALL declare `--chart-1` to `--chart-8` on `:root` (light) and `.dark` (dark) with the hex values recorded in `docs/design-system.md` (Color Palettes), and SHALL NOT map them in `@theme inline`. Sequential and divergent tokens SHALL NOT be declared: the sequential ramp is added by the first change that uses it (the world map), and the divergent palette stays pending.

#### Scenario: Pinned dependency

- **WHEN** `apps/web/package.json` is read
- **THEN** `echarts` is `6.1.0` exactly and `echarts-for-react` is absent

#### Scenario: Categorical tokens in both themes

- **WHEN** `globals.css` is read
- **THEN** `--chart-1` is `#2a78d6` on `:root` and `#3987e5` under `.dark`, and `--chart-2` to `--chart-8` match the design-system table in both themes

#### Scenario: No unused tokens

- **WHEN** `globals.css` is read
- **THEN** it declares no `--chart-seq-*` token

#### Scenario: No Tailwind utilities for chart tokens

- **WHEN** the `@theme inline` block is read
- **THEN** it contains no `--color-chart-*` entry

### Requirement: Theme adapter converts tokens into an ECharts theme

`apps/web/src/components/charts/chartTheme.ts` SHALL read tokens with `getComputedStyle(document.documentElement).getPropertyValue('--<name>')`, resolve each value (any CSS color syntax, including `oklch()`) to an `rgba()` string by painting it into a 1x1 canvas and reading the pixel back, and build the ECharts theme: the 8 categorical colors as the palette, axis line, axis label and split-line colors from `line`, `fg-muted` and `line-subtle`, tooltip background, border and text from `surface-raised`, `line-strong` and `fg`, legend text from `fg-secondary`. `chartTokens.ts` SHALL export `CHART_COLOR_TOKENS` (the 8 categorical names). Chart options SHALL NOT contain any color literal, `var()` or `oklch()` string.

#### Scenario: Tokens resolve to rgba

- **GIVEN** a canvas stub that returns known pixel data for a given fill style
- **WHEN** the adapter resolves `--chart-1` (`#2a78d6`)
- **THEN** the theme palette's first entry is the matching `rgba(...)` string

#### Scenario: Theme differs between light and dark

- **GIVEN** `:root` custom properties for light and a `.dark` override
- **WHEN** the adapter builds the theme with and without the `dark` class on `<html>`
- **THEN** the palette and surface-derived colors differ accordingly

#### Scenario: Options carry no colors

- **WHEN** the CO2 chart option builder is run
- **THEN** the returned option contains no color property, `var(`, `oklch(`, `#` color literal or `rgb` string

#### Scenario: Zero warnings in jsdom

- **WHEN** the adapter tests run
- **THEN** `HTMLCanvasElement.prototype.getContext` is stubbed and no jsdom "not implemented" error is printed

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

### Requirement: Charts load lazily with a same-height skeleton

A Client Component `LazyEChart` SHALL import `EChart` with `next/dynamic` and `ssr: false`, rendering `ChartSkeleton` of exactly the chart's height while the chunk loads, so the layout does not shift when the chart appears. The page itself SHALL remain a Server Component. ECharts SHALL NOT be part of the JavaScript of routes that do not render a chart.

#### Scenario: Skeleton then chart

- **WHEN** `LazyEChart` renders before the chunk resolves
- **THEN** the skeleton is shown with the same height classes as the loaded chart container

#### Scenario: No layout shift

- **WHEN** the chunk resolves and the chart replaces the skeleton
- **THEN** the container height is unchanged

#### Scenario: Other routes do not load ECharts

- **WHEN** the production build output of a placeholder category route (e.g. `/ocean-health/`) is inspected
- **THEN** it references no chunk that contains `echarts`

### Requirement: Mobile-safe, accessible option defaults

A `baseChartOption()` helper SHALL provide the defaults every chart option starts from: `tooltip.confine: true`, `axisLabel.hideOverlap: true` on axes, `legend.type: 'scroll'` for multi-series use, `aria.enabled: true`, and a `grid` with `containLabel` and compact paddings. A chart SHALL be paired with a table or text equivalent of its data, and a multi-series chart SHALL show a legend.

#### Scenario: Defaults present

- **WHEN** `baseChartOption()` is called
- **THEN** the returned option has `tooltip.confine` true, `aria.enabled` true and `hideOverlap` on the axis label configuration

### Requirement: Jest runs ECharts under jsdom

`apps/web/jest.config.cjs` SHALL transform `echarts` and `zrender` (ESM-only) despite `next/jest` ignoring `node_modules`, `jest.setup.ts` SHALL inject an approximate `measureText` through zrender's platform API, and chart tests SHALL initialise with explicit width and height and assert on SVG output. The setup SHALL import only zrender's platform module so tests that do not render charts are not slowed down.

#### Scenario: ECharts imports under Jest

- **WHEN** a unit test imports `echarts/core` and renders a chart
- **THEN** it runs without "Cannot use import statement outside a module" errors

#### Scenario: Text measurement works without canvas

- **WHEN** a chart with axis labels is rendered in jsdom
- **THEN** no canvas-related error or warning is printed

### Requirement: The token guard recognizes chart tokens

`apps/web/__tests__/designTokens.test.ts` SHALL treat `--chart-*` as a separate group: they MUST have a light and a dark value, MUST NOT be required in `@theme inline` or as Tailwind utilities, and MUST equal the names exported by the adapter (`CHART_COLOR_TOKENS`). All other tokens keep the existing checks, and the palette-utility check SHALL keep failing on palette colors in `src/app` and `src/components`.

#### Scenario: Declared chart tokens pass

- **WHEN** the chart tokens are declared with both values and the adapter lists exactly those names
- **THEN** the token tests pass

#### Scenario: A chart token the adapter does not read fails

- **GIVEN** a `--chart-9` declared in `globals.css` but absent from the adapter lists
- **WHEN** the token tests run
- **THEN** they fail naming the token

#### Scenario: A non-chart token is still guarded

- **GIVEN** a non-chart token declared but never used
- **WHEN** the token tests run
- **THEN** they fail naming the orphan

#### Scenario: Flag classes are not color utilities

- **WHEN** the token tests scan files that contain `fi fi-ar` and other flag classes
- **THEN** no violation is reported

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
