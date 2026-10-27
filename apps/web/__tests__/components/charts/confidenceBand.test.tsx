import { act, cleanup, render, waitFor } from '@testing-library/react';

import { BAND_OPACITY, buildConfidenceBandSeries } from '@/components/charts/confidenceBand';
import { EChart } from '@/components/charts/EChart';

import { clearTokens, declareTokens, stubCanvasContext } from './canvasStub';

const band = () =>
  buildConfidenceBandSeries({ name: 'World', lower: [-1, null, 0.5], upper: [-0.5, 1, 1] });

describe('buildConfidenceBandSeries', () => {
  it('should build an invisible base and an interval pair stacked together', () => {
    const [base, interval] = band();

    expect(base.stack).toBe(interval.stack);
    expect(base.stackStrategy).toBe('all');
    expect(base.lineStyle).toEqual({ opacity: 0 });
    expect('areaStyle' in base).toBe(false);
    expect(interval.areaStyle).toEqual({ opacity: BAND_OPACITY });
    expect(BAND_OPACITY).toBeLessThan(0.5);
  });

  it('should put the lower bound in the base and the width in the interval', () => {
    const [base, interval] = band();

    expect(base.data).toEqual([-1, null, 0.5]);
    expect(interval.data).toEqual([0.5, null, 0.5]);
  });

  it('should leave a gap where either bound is missing', () => {
    const [base, interval] = buildConfidenceBandSeries({
      name: 'World',
      lower: [null, 0],
      upper: [1, null],
    });

    expect(base.data).toEqual([null, null]);
    expect(interval.data).toEqual([null, null]);
  });

  it('should not leave floating point residue in the width', () => {
    const [, interval] = buildConfidenceBandSeries({
      name: 'World',
      lower: [0.1],
      upper: [0.3],
    });

    expect(interval.data).toEqual([0.2]);
  });

  it('should share the main series name and name no color', () => {
    const serialized = JSON.stringify(band());

    expect(band().every((series) => series.name === 'World')).toBe(true);
    expect(serialized).not.toMatch(/color|var\(|oklch\(|#[0-9a-f]{3,8}|rgb/i);
  });
});

describe('confidence band in a chart', () => {
  let getContextSpy: jest.SpyInstance;

  beforeEach(() => {
    getContextSpy = stubCanvasContext();
    declareTokens();
  });

  afterEach(() => {
    // Unmount first: a live chart would re-theme on the cleanup below and find no tokens.
    cleanup();
    getContextSpy.mockRestore();
    clearTokens();
    document.documentElement.classList.remove('dark');
  });

  const option = {
    xAxis: { type: 'category', data: ['1850', '1851', '1852'] },
    yAxis: { type: 'value' },
    series: [...band(), { type: 'line', name: 'World', data: [-0.7, 0.4, 0.8], showSymbol: false }],
  };

  const areaFills = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll('path'))
      .filter((node) => node.getAttribute('fill-opacity') !== null)
      .map((node) => `${node.getAttribute('fill')}|${node.getAttribute('fill-opacity')}`);

  it('should draw the band as an area with the series color and a low opacity', async () => {
    const { container } = render(<EChart option={option} initSize={{ width: 400, height: 300 }} />);

    await waitFor(() => {
      const fills = areaFills(container);
      expect(fills.length).toBeGreaterThan(0);
      expect(fills[0]).toBe('rgb(42,120,214)|0.2');
    });
  });

  it('should repaint the band when the dark class is added', async () => {
    const { container } = render(<EChart option={option} initSize={{ width: 400, height: 300 }} />);
    await waitFor(() => expect(areaFills(container)[0]).toBe('rgb(42,120,214)|0.2'));

    declareTokens({ 'chart-1': '#3987e5' });
    act(() => {
      document.documentElement.classList.add('dark');
    });

    await waitFor(() => expect(areaFills(container)[0]).toBe('rgb(57,135,229)|0.2'));
  });
});
