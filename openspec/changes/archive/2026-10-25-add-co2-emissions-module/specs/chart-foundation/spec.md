## ADDED Requirements

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

`apps/web/src/components/charts/EChart.tsx` (a Client Component) SHALL be the only place that creates ECharts instances. It SHALL initialise with `echarts.init(element, undefined, { renderer: 'svg' })` using only tree-shaken imports from `echarts/core` and the modules registered in `echartsSetup.ts` (line chart, grid, tooltip, legend, aria, SVG renderer; never the canvas renderer), call `setOption(option)` and only then `setTheme(theme)`, observe its container with a `ResizeObserver` and call `resize()`, re-resolve and re-apply the theme with `setTheme` whenever the `dark` class on `<html>` changes (observed with a `MutationObserver`), disable animation under `prefers-reduced-motion: reduce`, and call `dispose()` and disconnect both observers on unmount. It SHALL receive the option as a prop and SHALL NOT embed any chart-specific logic.

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
