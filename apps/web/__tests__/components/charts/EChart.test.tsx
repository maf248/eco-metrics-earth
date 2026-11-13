import { act, cleanup, render, waitFor } from '@testing-library/react';
import type { EChartsType } from 'echarts/core';

import { EChart } from '../../../src/components/charts/EChart';

import { clearTokens, declareTokens, stubCanvasContext } from './canvasStub';

const calls: string[] = [];
let chartInstance: EChartsType | undefined;
let resizeCallback: (() => void) | undefined;

jest.mock('../../../src/components/charts/echartsSetup', () => {
  const actual = jest.requireActual('../../../src/components/charts/echartsSetup');
  return {
    echarts: {
      ...actual.echarts,
      init: (...args: unknown[]) => {
        const chart = actual.echarts.init(...args) as EChartsType;
        for (const method of ['setOption', 'setTheme', 'resize', 'dispose'] as const) {
          const original = chart[method].bind(chart) as (...a: unknown[]) => unknown;
          (chart as unknown as Record<string, unknown>)[method] = (...a: unknown[]) => {
            calls.push(method);
            return original(...a);
          };
        }
        chartInstance = chart;
        return chart;
      },
    },
  };
});

const OPTION = {
  xAxis: { type: 'category', data: ['1950', '1951'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [1, 2] }],
};

describe('EChart', () => {
  let getContextSpy: jest.SpyInstance;
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    calls.length = 0;
    chartInstance = undefined;
    resizeCallback = undefined;
    getContextSpy = stubCanvasContext();
    declareTokens();
    global.ResizeObserver = class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = () => callback([], this);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        calls.push('disconnect-resize');
      }
    };
  });

  afterEach(() => {
    // Unmount first: a live chart would re-theme on the cleanup below and find no tokens.
    cleanup();
    getContextSpy.mockRestore();
    clearTokens();
    global.ResizeObserver = originalResizeObserver;
    document.documentElement.classList.remove('dark');
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('should render an SVG chart in a container with an explicit size', () => {
    const { container } = render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should call setOption before setTheme', () => {
    render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    expect(calls.indexOf('setOption')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('setTheme')).toBeGreaterThan(calls.indexOf('setOption'));
  });

  it('should hand the instance to onReady once, after the option and theme', () => {
    const onReady = jest.fn(() => calls.push('ready'));
    const { rerender } = render(
      <EChart option={OPTION} onReady={onReady} initSize={{ width: 400, height: 300 }} />,
    );
    rerender(
      <EChart
        option={{ ...OPTION, series: [{ type: 'line', data: [3, 4] }] }}
        onReady={onReady}
        initSize={{ width: 400, height: 300 }}
      />,
    );

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(chartInstance);
    expect(calls.indexOf('ready')).toBeGreaterThan(calls.indexOf('setTheme'));
  });

  it('should re-apply the theme when the dark class is added to the html element', async () => {
    render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);
    const before = calls.filter((call) => call === 'setTheme').length;

    declareTokens({ 'chart-1': '#3987e5' });
    act(() => {
      document.documentElement.classList.add('dark');
    });

    await waitFor(() =>
      expect(calls.filter((call) => call === 'setTheme').length).toBeGreaterThan(before),
    );
  });

  describe('reference line', () => {
    const REFERENCE_OPTION = {
      ...OPTION,
      series: [
        {
          type: 'line',
          data: [-1, 2],
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: 0 }],
            label: { formatter: '1991–2020 average' },
          },
        },
      ],
    };

    const referencePaints = (container: HTMLElement) => {
      const label = Array.from(container.querySelectorAll('text')).find(
        (node) => node.textContent === '1991–2020 average',
      );
      const line = Array.from(container.querySelectorAll('path')).find(
        (node) => node.getAttribute('stroke-dasharray') !== null,
      );
      return { label, line };
    };

    it('should draw the reference line and its label with the themed colors', async () => {
      const { container } = render(
        <EChart option={REFERENCE_OPTION} initSize={{ width: 400, height: 300 }} />,
      );

      await waitFor(() => {
        const { label, line } = referencePaints(container);
        expect(label?.getAttribute('fill')).toBe('rgb(75,85,99)');
        expect(line?.getAttribute('stroke')).toBe('rgb(107,114,128)');
      });
    });

    it('should repaint the reference line and its label when the dark class is added', async () => {
      const { container } = render(
        <EChart option={REFERENCE_OPTION} initSize={{ width: 400, height: 300 }} />,
      );
      await waitFor(() =>
        expect(referencePaints(container).label?.getAttribute('fill')).toBe('rgb(75,85,99)'),
      );

      declareTokens({ 'fg-muted': '#9ca3af', 'fg-secondary': '#d1d5db' });
      act(() => {
        document.documentElement.classList.add('dark');
      });

      await waitFor(() => {
        const after = referencePaints(container);
        expect(after.label?.getAttribute('fill')).toBe('rgb(209,213,219)');
        expect(after.line?.getAttribute('stroke')).toBe('rgb(156,163,175)');
      });
    });
  });

  describe('palette', () => {
    it('should color the series with the energy mix palette when asked', async () => {
      const { container } = render(
        <EChart option={OPTION} palette="energyMix" initSize={{ width: 400, height: 300 }} />,
      );

      await waitFor(() => {
        const stroke = container.querySelector('path[stroke]:not([stroke="none"])');
        expect(container.innerHTML).toContain('rgb(37,41,51)');
        expect(stroke).toBeInTheDocument();
      });
    });

    it('should keep the categorical palette by default', async () => {
      const { container } = render(
        <EChart option={OPTION} initSize={{ width: 400, height: 300 }} />,
      );

      await waitFor(() => expect(container.innerHTML).toContain('rgb(42,120,214)'));
      expect(container.innerHTML).not.toContain('rgb(37,41,51)');
    });

    it('should re-apply the energy palette, not the categorical one, on a theme switch', async () => {
      const { container } = render(
        <EChart option={OPTION} palette="energyMix" initSize={{ width: 400, height: 300 }} />,
      );
      await waitFor(() => expect(container.innerHTML).toContain('rgb(37,41,51)'));

      declareTokens({ 'energy-coal': '#5c5c69' });
      act(() => {
        document.documentElement.classList.add('dark');
      });

      await waitFor(() => expect(container.innerHTML).toContain('rgb(92,92,105)'));
      expect(container.innerHTML).not.toContain('rgb(42,120,214)');
    });
  });

  describe('ramp', () => {
    const MAP_LIKE = { ...OPTION };

    it('should re-apply the theme when the ramp changes while mounted, and only then', async () => {
      const { rerender } = render(
        <EChart option={MAP_LIKE} ramp="heat" initSize={{ width: 400, height: 300 }} />,
      );
      await waitFor(() => expect(calls).toContain('setTheme'));

      calls.length = 0;
      rerender(<EChart option={MAP_LIKE} ramp="heat" initSize={{ width: 400, height: 300 }} />);
      expect(calls).not.toContain('setTheme');

      rerender(<EChart option={MAP_LIKE} ramp="good" initSize={{ width: 400, height: 300 }} />);
      await waitFor(() => expect(calls).toContain('setTheme'));
    });
  });

  it('should resize the chart when the container is resized', () => {
    render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    act(() => resizeCallback?.());

    expect(calls).toContain('resize');
  });

  it('should apply only the new option, not the theme, when the option changes', () => {
    const { rerender } = render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);
    const before = calls.filter((call) => call === 'setOption').length;

    rerender(
      <EChart
        option={{ ...OPTION, series: [{ type: 'line', data: [3, 4] }] }}
        initSize={{ width: 400, height: 300 }}
      />,
    );

    expect(calls.filter((call) => call === 'setOption').length).toBe(before + 1);
    expect(calls.filter((call) => call === 'setTheme')).toHaveLength(1);
  });

  it('should set the option and the theme once on mount', () => {
    render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    expect(calls.filter((call) => call === 'setOption')).toHaveLength(1);
    expect(calls.filter((call) => call === 'setTheme')).toHaveLength(1);
  });

  it('should dispose the instance and disconnect the observers on unmount', () => {
    const { unmount } = render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    unmount();

    expect(calls).toContain('dispose');
    expect(calls).toContain('disconnect-resize');
    expect(chartInstance?.isDisposed()).toBe(true);
  });

  it('should disable animation under prefers-reduced-motion', () => {
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;

    render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    expect((chartInstance?.getOption() as { animation?: boolean }).animation).toBe(false);
  });

  it('should keep animation when reduced motion is not requested', () => {
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;

    render(<EChart option={OPTION} initSize={{ width: 400, height: 300 }} />);

    expect((chartInstance?.getOption() as { animation?: boolean }).animation).toBe(true);
  });
});
