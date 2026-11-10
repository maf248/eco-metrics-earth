import {
  buildChartTheme,
  createCanvasColorResolver,
} from '../../../src/components/charts/chartTheme';
import {
  CHART_COLOR_TOKENS,
  CHART_ENERGY_TOKENS,
} from '../../../src/components/charts/chartTokens';

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

  it('should not leak the previous colour when a colour is empty or invalid', () => {
    const resolve = createCanvasColorResolver();

    expect(resolve('#2a78d6')).toBe('rgba(42, 120, 214, 1)');
    expect(resolve('')).toBe('rgba(0, 0, 0, 0)');
    expect(resolve('not-a-colour')).toBe('rgba(0, 0, 0, 0)');
  });

  it('should warn in development when a token is not declared', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    document.documentElement.style.removeProperty('--energy-coal');

    buildChartTheme(undefined, 'energyMix');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('--energy-coal'));
    warn.mockRestore();
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

  it('should give the visual map the five sequential tokens, low to high', () => {
    expect(buildChartTheme().visualMap.inRange.color).toEqual([
      'rgba(245, 175, 32, 1)',
      'rgba(236, 131, 0, 1)',
      'rgba(222, 83, 0, 1)',
      'rgba(193, 41, 27, 1)',
      'rgba(138, 22, 27, 1)',
    ]);
  });

  it('should fill map regions with the no-data token and outline them', () => {
    const { map } = buildChartTheme();
    expect(map.itemStyle).toEqual({
      areaColor: 'rgba(229, 229, 229, 1)',
      borderColor: 'rgba(229, 231, 235, 1)',
      borderWidth: 0.5,
    });
  });

  it('should keep the region fill on hover and selection, with a stronger outline only', () => {
    const { map } = buildChartTheme();
    for (const state of [map.emphasis, map.select]) {
      expect(state.label.show).toBe(false);
      expect(state.itemStyle).toMatchObject({ areaColor: null, color: null, borderWidth: 1.5 });
      expect(state.itemStyle.borderColor).toBe('rgba(17, 24, 39, 1)');
    }
  });

  it('should accept an injected resolver', () => {
    const theme = buildChartTheme((value) => `resolved(${value})`);

    expect(theme.color[0]).toBe('resolved(#2a78d6)');
  });

  it('should resolve the categorical colors when no palette is given', () => {
    const theme = buildChartTheme();

    expect(theme.color).toEqual(buildChartTheme(undefined, 'categorical').color);
    expect(theme.color[0]).toBe('rgba(42, 120, 214, 1)');
  });

  it('should resolve the eight energy tokens in order for the energy mix palette', () => {
    const theme = buildChartTheme(undefined, 'energyMix');

    expect(CHART_ENERGY_TOKENS).toHaveLength(8);
    expect(theme.color).toEqual([
      'rgba(37, 41, 51, 1)',
      'rgba(202, 172, 124, 1)',
      'rgba(151, 84, 28, 1)',
      'rgba(109, 2, 141, 1)',
      'rgba(4, 117, 213, 1)',
      'rgba(0, 196, 198, 1)',
      'rgba(233, 164, 0, 1)',
      'rgba(38, 119, 30, 1)',
    ]);
  });

  it('should leave axes, tooltip, legend and reference line unchanged by the palette', () => {
    const { color: categorical, ...categoricalRest } = buildChartTheme(undefined, 'categorical');
    const { color: energy, ...energyRest } = buildChartTheme(undefined, 'energyMix');

    expect(energy).not.toEqual(categorical);
    expect(energyRest).toEqual(categoricalRest);
  });
});
