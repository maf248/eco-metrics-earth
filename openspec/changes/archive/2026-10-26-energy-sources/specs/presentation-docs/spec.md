## ADDED Requirements

### Requirement: The energy mix palette and composition-chart conventions are recorded

`docs/design-system.md` SHALL record, in the same change that introduces them: (1) under Color Palettes, a new "Energy mix (light / dark)" table listing the eight `--energy-*` tokens in stacking order (coal, gas, oil, nuclear, hydro, wind, solar, bioenergy & other renewables) with their hue, semantic role and light and dark hex values, and the statement that the palette is semantic, separate from `--chart-1…8`, used for electricity sources only, read by the theme adapter by name (`palette="energyMix"`), not mapped in `@theme inline`, and assigned in this fixed order, never cycled or reordered; (2) the validation method and its results: the same checks as the categorical palette (OKLCH lightness band and chroma floor, adjacent-pair OKLab ΔE×100 under protanopia/deuteranopia/tritanopia simulation and unsimulated, WCAG contrast against the real surfaces), the thresholds used, the measured worst adjacent-pair values per theme, the deliberate exceptions (the neutral chroma of coal, the wider lightness band that charcoal and amber need, contrast below 3:1 for gas, wind and solar on white) and the known limitation that non-adjacent pairs are not separated by colour alone; (3) under Presentation Stack, the composition-chart conventions: a stacked area and a donut share one palette and one source order; every source is always present in the option so colour follows the entity; stacked areas are opaque so rendered colours equal the validated ones; the percentage axis is fixed to 0-100; the donut shows the selected country's latest year with no year selector, is deferred with `RenderWhenVisible` and registers the pie chart where it is used; a text table accompanies each chart (the year table follows the measure toggle); a missing value is `null`, shown as a gap, a dash or "No data" and never as zero; the measure toggle is the generic `MeasureToggle`; and the wrap-around neighbour of a donut (last source next to first) is part of the palette validation. The "few charts per page" rule SHALL be restated with this page as an example of two charts, one deferred.

#### Scenario: The energy palette table matches the stylesheet

- **WHEN** the "Energy mix" table in `docs/design-system.md` is compared with the `--energy-*` declarations in `globals.css`
- **THEN** both contain the same eight names with the same light and dark values, in the same order

#### Scenario: Validation results are recorded

- **WHEN** the Color Palettes section is read
- **THEN** it states the thresholds, the worst adjacent-pair ΔE under each simulated deficiency and unsimulated, in light and dark, and the recorded exceptions

#### Scenario: Composition conventions are findable

- **WHEN** the Presentation Stack section is read
- **THEN** it states that stacked areas are opaque, that the percentage axis is 0-100, that every source is always present in the option, that the donut registers `PieChart` where it is used, and that missing values are never drawn as zero

#### Scenario: The doc stays the single source of truth

- **WHEN** the design-system doc is read after this change
- **THEN** it does not mark the energy mix palette as pending and does not contradict the categorical palette section
