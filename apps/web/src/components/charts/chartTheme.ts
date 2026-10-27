import { CHART_PALETTE_TOKENS, CHART_UI_TOKENS, type ChartPalette } from './chartTokens';

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
}

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
 * Builds the ECharts theme from the design tokens currently in effect (light or
 * dark, whichever the `dark` class on `<html>` selects). Chart options never
 * name a color: they inherit everything from this theme. `palette` swaps only the
 * series colours; axes, tooltip, legend and reference lines are the same.
 */
export function buildChartTheme(
  resolve: ColorResolver = createCanvasColorResolver(),
  palette: ChartPalette = 'categorical',
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
  };
}
