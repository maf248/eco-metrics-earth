import {
  CHART_NO_DATA_TOKEN,
  CHART_PALETTE_TOKENS,
  CHART_RAMP_TOKENS,
  CHART_UI_TOKENS,
  type ChartPalette,
  type ChartRamp,
} from './chartTokens';

/** Turns any CSS color (hex, `oklch()`, `var()`-free) into an `rgba()` string. */
export type ColorResolver = (cssColor: string) => string;

export interface ChartTheme {
  color: string[];
  backgroundColor: string;
  textStyle: { color: string };
  categoryAxis: AxisTheme;
  valueAxis: AxisTheme;
  tooltip: {
    backgroundColor: string;
    borderColor: string;
    textStyle: { color: string };
  };
  legend: { textStyle: { color: string } };
  markLine: { lineStyle: { color: string }; label: { color: string } };
  /** Choropleth classes, low to high: the default colors of every visual map. */
  visualMap: { inRange: { color: string[] } };
  /** Map series defaults: a region without a value keeps the no-data area color. */
  map: MapTheme;
}

interface MapRegionStyle {
  /** `null` (with `color: null`) keeps the region's own fill: ECharts' documented opt-out. */
  areaColor: string | null;
  color?: null;
  borderColor: string;
  borderWidth: number;
}

interface MapTheme {
  itemStyle: Omit<MapRegionStyle, 'color'> & { areaColor: string };
  emphasis: { label: { show: false }; itemStyle: MapRegionStyle };
  select: { label: { show: false }; itemStyle: MapRegionStyle };
}

/** Region outline: thin, so small countries keep their fill; hover and selection thicken it. */
const MAP_BORDER_WIDTH = 0.5;
const MAP_EMPHASIS_BORDER_WIDTH = 1.5;

interface AxisTheme {
  axisLine: { lineStyle: { color: string } };
  axisTick: { lineStyle: { color: string } };
  axisLabel: { color: string };
  splitLine: { lineStyle: { color: string } };
}

/**
 * ECharts parses neither `var(--x)` nor `oklch()`. This resolver paints the
 * color into a 1x1 canvas and reads the pixel back, which works for every CSS
 * color syntax the browser understands.
 */
export function createCanvasColorResolver(): ColorResolver {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  return (cssColor) => {
    if (!context) {
      return cssColor;
    }
    context.clearRect(0, 0, 1, 1);
    // An invalid colour is ignored by the canvas: reset first so the previous one never leaks.
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillStyle = cssColor;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    return `rgba(${red}, ${green}, ${blue}, ${Number((alpha / 255).toFixed(3))})`;
  };
}

function readToken(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  if (!value && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[chartTheme] Token --${name} is empty or not declared.`);
  }
  return value;
}

/**
 * Builds the ECharts theme from the design tokens in effect, so chart options never name a color.
 * `palette` swaps the series colours and `ramp` the choropleth classes.
 */
export function buildChartTheme(
  resolve: ColorResolver = createCanvasColorResolver(),
  palette: ChartPalette = 'categorical',
  ramp: ChartRamp = 'heat',
): ChartTheme {
  const ui = (role: keyof typeof CHART_UI_TOKENS): string =>
    resolve(readToken(CHART_UI_TOKENS[role]));

  const axis: AxisTheme = {
    axisLine: { lineStyle: { color: ui('axisLine') } },
    axisTick: { lineStyle: { color: ui('axisLine') } },
    axisLabel: { color: ui('axisLabel') },
    splitLine: { lineStyle: { color: ui('splitLine') } },
  };

  return {
    color: CHART_PALETTE_TOKENS[palette].map((token) => resolve(readToken(token))),
    backgroundColor: 'transparent',
    textStyle: { color: ui('axisLabel') },
    categoryAxis: axis,
    valueAxis: axis,
    tooltip: {
      backgroundColor: ui('tooltipBackground'),
      borderColor: ui('tooltipBorder'),
      textStyle: { color: ui('tooltipText') },
    },
    legend: { textStyle: { color: ui('legendText') } },
    markLine: {
      lineStyle: { color: ui('referenceLine') },
      label: { color: ui('referenceLabel') },
    },
    visualMap: {
      inRange: { color: CHART_RAMP_TOKENS[ramp].map((token) => resolve(readToken(token))) },
    },
    map: buildMapTheme(
      resolve(readToken(CHART_NO_DATA_TOKEN)),
      ui('mapBorder'),
      ui('mapEmphasisBorder'),
    ),
  };
}

/**
 * Hover and selection keep the region's own fill (the class color) and only draw a stronger
 * outline: ECharts' default emphasis and select fills would hide the value being pointed at.
 */
function buildMapTheme(noData: string, border: string, emphasisBorder: string): MapTheme {
  const highlighted: MapRegionStyle = {
    areaColor: null,
    color: null,
    borderColor: emphasisBorder,
    borderWidth: MAP_EMPHASIS_BORDER_WIDTH,
  };
  return {
    itemStyle: { areaColor: noData, borderColor: border, borderWidth: MAP_BORDER_WIDTH },
    emphasis: { label: { show: false }, itemStyle: highlighted },
    select: { label: { show: false }, itemStyle: highlighted },
  };
}
