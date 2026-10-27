## ADDED Requirements

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

The shared setup (`echartsSetup.ts`) SHALL NOT register `PieChart`. A dedicated lazy entry for pie charts SHALL register `PieChart` on the shared `echarts` instance as a side effect of its own module and reuse the `EChart` wrapper, and a `LazyPieEChart` Client Component SHALL load that entry with `next/dynamic` (`ssr: false`) and the same same-height skeleton as `LazyEChart`. Routes without a donut SHALL NOT download the pie code.

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

## MODIFIED Requirements

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
