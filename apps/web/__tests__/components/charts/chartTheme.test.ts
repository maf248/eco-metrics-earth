import {
  buildChartTheme,
  createCanvasColorResolver,
} from '../../../src/components/charts/chartTheme';
import { CHART_COLOR_TOKENS } from '../../../src/components/charts/chartTokens';

import { clearTokens, declareTokens, stubCanvasContext } from './canvasStub';

describe('chart theme adapter', () => {
  let getContextSpy: jest.SpyInstance;

  beforeEach(() => {
    getContextSpy = stubCanvasContext();
    declareTokens();
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    clearTokens();
    document.documentElement.classList.remove('dark');
  });

  it('should resolve a CSS color to an rgba string through the canvas', () => {
    expect(createCanvasColorResolver()('#2a78d6')).toBe('rgba(42, 120, 214, 1)');
  });

  it('should fall back to the raw value when no 2D context is available', () => {
    getContextSpy.mockReturnValue(null);

    expect(createCanvasColorResolver()('#2a78d6')).toBe('#2a78d6');
  });

  it('should build the palette from the eight categorical tokens in order', () => {
    const theme = buildChartTheme();

    expect(theme.color).toHaveLength(CHART_COLOR_TOKENS.length);
    expect(theme.color[0]).toBe('rgba(42, 120, 214, 1)');
    expect(theme.color[1]).toBe('rgba(235, 104, 52, 1)');
  });

  it('should take axis, tooltip and legend colors from the UI tokens', () => {
    const theme = buildChartTheme();

    expect(theme.categoryAxis.axisLine.lineStyle.color).toBe('rgba(229, 231, 235, 1)');
    expect(theme.valueAxis.axisLabel.color).toBe('rgba(107, 114, 128, 1)');
    expect(theme.valueAxis.splitLine.lineStyle.color).toBe('rgba(243, 244, 246, 1)');
    expect(theme.tooltip.backgroundColor).toBe('rgba(255, 255, 255, 1)');
    expect(theme.tooltip.textStyle.color).toBe('rgba(17, 24, 39, 1)');
    expect(theme.legend.textStyle.color).toBe('rgba(75, 85, 99, 1)');
  });

  it('should differ once the dark values are declared', () => {
    const light = buildChartTheme();

    declareTokens({ 'chart-1': '#3987e5', 'surface-raised': '#1f2937' });
    const dark = buildChartTheme();

    expect(dark.color[0]).not.toBe(light.color[0]);
    expect(dark.tooltip.backgroundColor).not.toBe(light.tooltip.backgroundColor);
  });

  it('should take the reference line and label colors from the muted and secondary tokens', () => {
    const { markLine } = buildChartTheme();

    expect(markLine.lineStyle.color).toBe('rgba(107, 114, 128, 1)');
    expect(markLine.label.color).toBe('rgba(75, 85, 99, 1)');
  });

  it('should resolve different reference line colors in dark mode', () => {
    const light = buildChartTheme();

    declareTokens({ 'fg-muted': '#9ca3af', 'fg-secondary': '#d1d5db' });
    const dark = buildChartTheme();

    expect(dark.markLine.lineStyle.color).not.toBe(light.markLine.lineStyle.color);
    expect(dark.markLine.label.color).not.toBe(light.markLine.label.color);
  });

  it('should accept an injected resolver', () => {
    const theme = buildChartTheme((value) => `resolved(${value})`);

    expect(theme.color[0]).toBe('resolved(#2a78d6)');
  });
});
