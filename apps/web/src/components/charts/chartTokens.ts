/**
 * Categorical chart colors, in the fixed order they were validated in
 * (docs/design-system.md, Color Palettes). Declared as `--chart-N` in
 * `globals.css`; read by name by the theme adapter, never through Tailwind.
 */
export const CHART_COLOR_TOKENS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
] as const;

/**
 * Energy mix chart colors, in the order of `ENERGY_SOURCE_IDS`. Declared as `--energy-*` in `globals.css`; read by name by the theme adapter,
 * never through Tailwind. A semantic palette: the order is part of its validation.
 */
export const CHART_ENERGY_TOKENS = [
  'energy-coal',
  'energy-gas',
  'energy-oil',
  'energy-nuclear',
  'energy-hydro',
  'energy-wind',
  'energy-solar',
  'energy-bio',
] as const;

/**
 * Waste treatment colors, in the order of the treatment groups (recycling, composting,
 * incineration, sanitary landfill, other landfill, open dump, uncollected, other). A semantic
 * palette made of existing tokens only: green and teal for recovery, brown for incineration,
 * blue and violet for landfills, amber and red for mismanagement and charcoal for what the
 * source did not separate. The order is part of the palette: every pair, not only the adjacent
 * ones, was checked (docs/design-system.md, Waste treatment and composition).
 */
const CHART_WASTE_TREATMENT_TOKENS = [
  'energy-bio',
  'energy-wind',
  'energy-oil',
  'energy-hydro',
  'energy-nuclear',
  'energy-solar',
  'chart-8',
  'energy-coal',
] as const;

/**
 * Waste composition colors, in the order of the material groups (food and organic, paper and
 * cardboard, plastic, glass, metal, other). Existing tokens only, every pair checked.
 */
const CHART_WASTE_COMPOSITION_TOKENS = [
  'energy-bio',
  'energy-hydro',
  'energy-oil',
  'chart-5',
  'energy-nuclear',
  'energy-gas',
] as const;

/**
 * Sequential (choropleth) classes, low to high, in the order they were validated
 * (docs/design-system.md, Color Palettes). Declared as `--chart-seq-N` in `globals.css`;
 * the theme adapter gives them to the visual map, the map legend reads them with `var()`.
 */
export const CHART_SEQUENTIAL_TOKENS = [
  'chart-seq-1',
  'chart-seq-2',
  'chart-seq-3',
  'chart-seq-4',
  'chart-seq-5',
] as const;

/**
 * Good-is-high sequential classes (a share where more is better), low to high: one green
 * family, validated like the heat ramp. Declared as `--chart-seq-good-N` in `globals.css`.
 */
export const CHART_SEQUENTIAL_GOOD_TOKENS = [
  'chart-seq-good-1',
  'chart-seq-good-2',
  'chart-seq-good-3',
  'chart-seq-good-4',
  'chart-seq-good-5',
] as const;

/**
 * Which sequential ramp a choropleth uses: `heat` (yellow to dark red; more is worse or a
 * neutral quantity) or `good` (greens; more is better).
 */
export type ChartRamp = 'heat' | 'good';

export const CHART_RAMP_TOKENS: Record<ChartRamp, readonly string[]> = {
  heat: CHART_SEQUENTIAL_TOKENS,
  good: CHART_SEQUENTIAL_GOOD_TOKENS,
};

/** Fill of a map region without a value. Declared as `--chart-no-data` in `globals.css`. */
export const CHART_NO_DATA_TOKEN = 'chart-no-data';

/** Which colour palette a chart takes its series colours from. */
export type ChartPalette = 'categorical' | 'energyMix' | 'wasteTreatment' | 'wasteComposition';

export const CHART_PALETTE_TOKENS: Record<ChartPalette, readonly string[]> = {
  categorical: CHART_COLOR_TOKENS,
  energyMix: CHART_ENERGY_TOKENS,
  wasteTreatment: CHART_WASTE_TREATMENT_TOKENS,
  wasteComposition: CHART_WASTE_COMPOSITION_TOKENS,
};

export type ChartColorToken = (typeof CHART_COLOR_TOKENS)[number];

/** UI tokens the chart theme takes its axis, tooltip, legend and reference-line colors from. */
export const CHART_UI_TOKENS = {
  axisLine: 'line',
  axisLabel: 'fg-muted',
  splitLine: 'line-subtle',
  tooltipBackground: 'surface-raised',
  tooltipBorder: 'line-strong',
  tooltipText: 'fg',
  legendText: 'fg-secondary',
  referenceLine: 'fg-muted',
  referenceLabel: 'fg-secondary',
  mapBorder: 'line-strong',
  mapEmphasisBorder: 'fg',
} as const;

export type ChartUiTokenRole = keyof typeof CHART_UI_TOKENS;
