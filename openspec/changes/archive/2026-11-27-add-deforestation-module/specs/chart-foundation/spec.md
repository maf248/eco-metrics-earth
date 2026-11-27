## ADDED Requirements

### Requirement: A divergent palette is declared and themed

`globals.css` SHALL declare `--chart-div-1` … `--chart-div-7` with light values on `:root` and dark values under `.dark`, in hex, not mapped in `@theme inline`, ordered from the loss end to the gain end with `--chart-div-4` as the neutral middle class. The two arms SHALL have equal step counts and the middle SHALL NOT be a hue; it SHALL be separated from `--chart-no-data` by an OKLab ΔE×100 of at least 15 in both themes. Lightness SHALL be monotonic towards the middle on each arm with every adjacent gap at least 0.06 OKLCH L, rising towards the middle in the light theme and falling towards it in the dark theme (the dark middle is the darkest class, the outer classes the brightest), and adjacent classes SHALL be separated by an OKLab ΔE×100 of at least 8 under protanopia, deuteranopia and tritanopia simulation. The theme adapter SHALL read the tokens by name; `chartTokens.ts` SHALL list them as the ramp `divergent` in `CHART_RAMP_TOKENS`; `ChoroplethMap`, `MapLegend` and the chart theme SHALL accept `ramp: 'divergent'` alongside `good` and `heat`; and the token guard SHALL recognise them as used. Map options SHALL NOT name a color. The validation results and any recorded exception SHALL be written in `docs/design-system.md`.

#### Scenario: Tokens are declared in both themes

- **WHEN** `globals.css` is parsed
- **THEN** `--chart-div-1` to `--chart-div-7` exist on `:root` and under `.dark`

#### Scenario: Theme carries the divergent colors

- **WHEN** the theme is built and the ramp `divergent` is selected
- **THEN** the visual map `inRange.color` has seven resolved colors in token order, and `map.itemStyle.areaColor` is still resolved from `--chart-no-data`

#### Scenario: Palette checks

- **WHEN** the palette validator is run on the seven classes in each theme
- **THEN** the lightness, adjacent-separation, CVD and middle-versus-no-data checks listed above pass, or each exception is recorded in `docs/design-system.md`

#### Scenario: Legend follows the ramp

- **WHEN** `MapLegend` is rendered with `ramp: 'divergent'` and seven class labels
- **THEN** it paints seven swatches from the divergent tokens in order, then a "No data" swatch from `--chart-no-data`

### Requirement: Bar series stack by name and keep their palette slot

An option builder SHALL be able to draw stacked bars: one `bar` series per entity in the fixed palette order, `stack` shared, every entity always present in the option (so a color follows its entity when values are `null`), a `null` value drawing no segment, and the value axis starting at zero. `bar` SHALL register where it is used.

#### Scenario: Stack with a null value

- **GIVEN** a builder input where one series has `null` in a year
- **WHEN** the option is built
- **THEN** all series are present with the same `stack` value, the `null` produces no segment and the other series keep their palette positions

### Requirement: A semantic tree cover loss palette is selectable

`chartTokens.ts` SHALL export `CHART_TREE_COVER_LOSS_TOKENS`, an ordered list of seven existing tokens (no new CSS custom property) in the stacking order of the tree cover loss drivers, selectable with the chart `palette` value `treeCoverLoss` and listed in `CHART_PALETTE_TOKENS`. No token SHALL be green and Wildfire SHALL be red. Every pair of the palette SHALL be checked in both themes, unsimulated and under protanopia, deuteranopia and tritanopia, and the results and exceptions SHALL be written in `docs/design-system.md`. Option builders SHALL NOT name a color.

#### Scenario: Palette resolved in stacking order

- **WHEN** the chart theme is built with the palette `treeCoverLoss`
- **THEN** its series colors are the seven resolved tokens in the order of `CHART_TREE_COVER_LOSS_TOKENS`
