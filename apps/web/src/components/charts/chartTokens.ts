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

/** Which colour palette a chart takes its series colours from. */
export type ChartPalette = 'categorical' | 'energyMix';

export const CHART_PALETTE_TOKENS: Record<ChartPalette, readonly string[]> = {
  categorical: CHART_COLOR_TOKENS,
  energyMix: CHART_ENERGY_TOKENS,
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
} as const;

export type ChartUiTokenRole = keyof typeof CHART_UI_TOKENS;
