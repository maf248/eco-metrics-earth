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

A Client Component `LazyEChart` SHALL import `EChart` on demand, on the client only and without a Suspense boundary, so that a chunk already loaded draws at once. It SHALL render `ChartSkeleton` of exactly the chart's height, shaped like the chart it stands for (a series silhouette or a donut), while the chunk loads, and hydration SHALL keep that skeleton even if the chunk arrived first, so the client matches the server HTML, so the layout does not shift when the chart appears. The page itself SHALL remain a Server Component. ECharts SHALL NOT be part of the JavaScript of routes that do not render a chart.

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

A `baseChartOption()` helper SHALL provide the defaults every chart option starts from: `tooltip.confine: true`, `axisLabel.hideOverlap: true` on axes, `legend.type: 'plain'` (a legend wraps onto rows; it never scrolls or pages), `aria.enabled: true`, and a `grid` with `containLabel` and compact paddings. A chart SHALL be paired with a table or text equivalent of its data, and a multi-series chart SHALL show a legend.

#### Scenario: Defaults present

- **WHEN** `baseChartOption()` is called
- **THEN** the returned option has `tooltip.confine` true, `aria.enabled` true and `hideOverlap` on the axis label configuration

#### Scenario: Legend never scrolls

- **WHEN** `baseChartOption()` is called
- **THEN** its legend type is `plain`

### Requirement: Jest runs ECharts under jsdom

`apps/web/jest.config.cjs` SHALL transform `echarts` and `zrender` (ESM-only) despite `next/jest` ignoring `node_modules`, `jest.setup.ts` SHALL inject an approximate `measureText` through zrender's platform API, and chart tests SHALL initialise with explicit width and height and assert on SVG output. The setup SHALL import only zrender's platform module so tests that do not render charts are not slowed down.

#### Scenario: ECharts imports under Jest

- **WHEN** a unit test imports `echarts/core` and renders a chart
- **THEN** it runs without "Cannot use import statement outside a module" errors

#### Scenario: Text measurement works without canvas

- **WHEN** a chart with axis labels is rendered in jsdom
- **THEN** no canvas-related error or warning is printed

### Requirement: The token guard recognizes chart tokens

`apps/web/__tests__/designTokens.test.ts` SHALL treat `--chart-*` and `--energy-*` as separate chart-token groups: they MUST have a light and a dark value, MUST NOT be required in `@theme inline` or as Tailwind utilities, and MUST equal the names exported by the adapter (`CHART_COLOR_TOKENS` for `--chart-*`, `CHART_ENERGY_TOKENS` for `--energy-*`). All other tokens keep the existing checks, and the palette-utility check SHALL keep failing on palette colors in `src/app` and `src/components`.

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

#### Scenario: Declared energy tokens pass

- **WHEN** the eight `--energy-*` tokens are declared with both values and `CHART_ENERGY_TOKENS` lists exactly those names
- **THEN** the token tests pass

#### Scenario: An energy token the adapter does not read fails

- **GIVEN** an `--energy-geothermal` declared in `globals.css` but absent from `CHART_ENERGY_TOKENS`
- **WHEN** the token tests run
- **THEN** they fail naming the token

#### Scenario: Energy tokens need no Tailwind mapping

- **WHEN** the energy tokens are declared but not mapped in `@theme inline`
- **THEN** the suite passes, while an unmapped or unused non-chart token still fails it

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

### Requirement: An energy mix palette is declared and read by the theme adapter

`apps/web/src/app/globals.css` SHALL declare eight tokens `--energy-coal`, `--energy-gas`, `--energy-oil`, `--energy-nuclear`, `--energy-hydro`, `--energy-wind`, `--energy-solar` and `--energy-bio` on `:root` (light) and `.dark` (dark) with the hex values recorded in `docs/design-system.md` (Color Palettes, Energy mix), and SHALL NOT map them in `@theme inline`. `chartTokens.ts` SHALL export `CHART_ENERGY_TOKENS`, the eight names in the order of the shared `ENERGY_SOURCE_IDS` (coal, gas, oil, nuclear, hydro, wind, solar, bioenergy & other renewables). The palette is separate from `--chart-1…8` and SHALL NOT change them. The values SHALL have been validated with the method recorded in the design system: OKLCH lightness band and a chroma floor (neutral coal excepted, recorded), adjacent-pair OKLab ΔE×100 of at least 8 under protanopia, deuteranopia and tritanopia simulation and at least 15 unsimulated, including the wrap-around pair (bioenergy & other renewables next to coal, as the donut draws it), and WCAG contrast against the surface (white in light mode, black in dark mode).

#### Scenario: Tokens in both themes

- **WHEN** `globals.css` is read
- **THEN** each of the eight `--energy-*` tokens has a hex value on `:root` and another under `.dark`, equal to the design-system table

#### Scenario: Order matches the sources

- **WHEN** `CHART_ENERGY_TOKENS` is compared with `ENERGY_SOURCE_IDS`
- **THEN** both have eight entries and the token at index `i` belongs to the source at index `i`

#### Scenario: Categorical palette untouched

- **WHEN** `globals.css` is read
- **THEN** `--chart-1` to `--chart-8` have the same values as before this change

#### Scenario: No Tailwind utilities for energy tokens

- **WHEN** the `@theme inline` block is read
- **THEN** it contains no `--color-energy-*` entry

#### Scenario: The recorded values pass the validator

- **WHEN** the adjacent pairs of the stacking order (and the bioenergy-to-coal wrap pair) are measured with the recorded method
- **THEN** every pair is at least 8 under each simulated deficiency and at least 15 unsimulated, in light and in dark

### Requirement: Charts choose a palette by name

`buildChartTheme` SHALL accept an optional palette name, `'categorical'` (default, the 8 `--chart-*` colours) or `'energyMix'` (the 8 `--energy-*` colours), and put the chosen colours in the theme's `color` array; every other part of the theme (axes, tooltip, legend, reference line) SHALL be unchanged. `EChart`, `LazyEChart` and `ChartPanel` SHALL accept an optional `palette` prop and pass it through; `EChart` SHALL re-apply the theme with the same palette when the `dark` class on `<html>` changes. Chart options SHALL still name no colour: a series takes the palette colour at its index, so a chart that always lists its series in the same order always paints the same entity with the same colour.

#### Scenario: Default palette is categorical

- **WHEN** `buildChartTheme` runs without a palette
- **THEN** the theme's `color` entries resolve `--chart-1…8`

#### Scenario: Energy palette resolves the energy tokens

- **GIVEN** a canvas stub returning known pixel data
- **WHEN** `buildChartTheme` runs with `'energyMix'`
- **THEN** the theme's `color` array has eight entries matching `--energy-coal` … `--energy-bio` and the axis, tooltip and legend colours equal those of the categorical theme

#### Scenario: Palette survives a theme switch

- **GIVEN** a mounted `EChart` with `palette="energyMix"`
- **WHEN** the `dark` class is added to `<html>`
- **THEN** `setTheme` is called with the dark energy colours, not the categorical ones

#### Scenario: Existing charts are unchanged

- **WHEN** the CO2 and global temperature charts render without a `palette` prop
- **THEN** they use the categorical palette exactly as before

### Requirement: The pie chart registers where it is used

The shared setup (`echartsSetup.ts`) SHALL NOT register `PieChart`. A dedicated lazy entry for pie charts SHALL register `PieChart` on the shared `echarts` instance as a side effect of its own module and reuse the `EChart` wrapper, and a `LazyPieEChart` Client Component SHALL load that entry on demand through `lazyChart`, on the client only, with the same same-height skeleton as `LazyEChart`. Routes without a donut SHALL NOT download the pie code.

#### Scenario: Pie renders in jsdom

- **GIVEN** the pie entry mounted with an explicit size and a donut option
- **WHEN** it renders
- **THEN** the SVG contains the slice paths

#### Scenario: The cartesian setup stays pie-free

- **WHEN** `echartsSetup.ts` is read
- **THEN** it does not import `PieChart`

#### Scenario: Skeleton then pie

- **WHEN** `LazyPieEChart` renders before the chunk resolves
- **THEN** the skeleton is shown with the same height classes as the loaded chart

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
