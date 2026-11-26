import { act, render, screen } from '@testing-library/react';

import { ChartPanel } from '@/components/charts/ChartPanel';

const received: unknown[] = [];
const palettes: unknown[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option, palette }: { option: unknown; palette?: string }) => {
    received.push(option);
    palettes.push(palette);
    return <div data-testid="chart-stub" />;
  },
}));

describe('ChartPanel', () => {
  beforeEach(() => {
    received.length = 0;
    palettes.length = 0;
  });

  it('should render the title as an h3 above the chart', () => {
    render(<ChartPanel title="World: a thing" option={{ marker: 1 }} announcement="Showing it" />);

    expect(screen.getByRole('heading', { level: 3, name: 'World: a thing' })).toBeInTheDocument();
    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
  });

  it('should hand the option to the lazy chart', () => {
    const option = { marker: 1 };

    render(<ChartPanel title="t" option={option} announcement="a" />);

    expect(received).toEqual([option]);
  });

  it('should announce the selection in a polite live region', () => {
    render(<ChartPanel title="t" option={{}} announcement="Showing it for Argentina" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Showing it for Argentina');
    expect(status).toHaveClass('sr-only');
  });

  it('should pass the palette through to the chart, and leave it unset by default', () => {
    const { rerender } = render(<ChartPanel title="t" option={{}} announcement="a" />);
    rerender(<ChartPanel title="t" option={{}} announcement="a" palette="energyMix" />);

    expect(palettes).toEqual([undefined, 'energyMix']);
  });

  it('should remount the chart only when its key changes', () => {
    const mounts: number[] = [];
    const { rerender } = render(
      <ChartPanel title="t" option={{}} announcement="a" chartKey="one" />,
    );
    mounts.push(document.querySelectorAll('[data-testid="chart-stub"]').length);
    const first = screen.getByTestId('chart-stub');

    rerender(<ChartPanel title="t" option={{ x: 1 }} announcement="a" chartKey="one" />);
    expect(screen.getByTestId('chart-stub')).toBe(first);

    rerender(<ChartPanel title="t" option={{ x: 1 }} announcement="a" chartKey="two" />);
    expect(screen.getByTestId('chart-stub')).not.toBe(first);
    expect(mounts).toEqual([1]);
  });

  describe('deferred', () => {
    const originalObserver = global.IntersectionObserver;
    let callback: ((entries: { isIntersecting: boolean }[]) => void) | undefined;

    beforeEach(() => {
      callback = undefined;
      global.IntersectionObserver = class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return [];
        }
      } as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
      global.IntersectionObserver = originalObserver;
    });

    it('should render the title and the announcement at once and the chart on the first intersection', () => {
      render(<ChartPanel title="Below the fold" option={{}} announcement="Shown" deferred />);

      expect(screen.getByRole('heading', { name: 'Below the fold' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Shown');
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-stub')).not.toBeInTheDocument();

      act(() => callback?.([{ isIntersecting: true }]));

      expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
    });

    it('should not defer the chart by default', () => {
      render(<ChartPanel title="t" option={{}} announcement="a" />);

      expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
      expect(callback).toBeUndefined();
    });
  });
});
