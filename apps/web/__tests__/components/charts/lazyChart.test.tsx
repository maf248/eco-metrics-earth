import { act, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { lazyChart, type LazyChartProps } from '@/components/charts/lazyChart';

type Loaded = ComponentType<LazyChartProps>;

const LoadedChart: Loaded = () => <div data-testid="chart-loaded" />;

describe('lazyChart', () => {
  it('should draw at once when the chunk was preloaded', async () => {
    const load = jest.fn().mockResolvedValue(LoadedChart);
    const { Chart, preload } = lazyChart(load, 'series');

    await act(async () => preload());
    render(<Chart option={{}} />);

    expect(screen.getByTestId('chart-loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('should hydrate the skeleton of the HTML even when the chunk arrived first', async () => {
    const onRecoverableError = jest.fn();
    const { Chart, preload } = lazyChart(jest.fn().mockResolvedValue(LoadedChart), 'series');
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = renderToString(<Chart option={{}} />);

    await act(async () => preload());
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <Chart option={{}} />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(screen.getByTestId('chart-loaded')).toBeInTheDocument();
    act(() => root?.unmount());
    container.remove();
  });

  it('should fetch the chunk once for several charts', async () => {
    const load = jest.fn().mockResolvedValue(LoadedChart);
    const { Chart } = lazyChart(load, 'series');

    render(
      <>
        <Chart option={{}} />
        <Chart option={{}} />
      </>,
    );

    expect(await screen.findAllByTestId('chart-loaded')).toHaveLength(2);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('should keep the skeleton of its variant after a failed import, and retry on the next mount', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('chunk')).mockResolvedValue(LoadedChart);
    const { Chart } = lazyChart(load, 'donut');

    const { unmount } = render(<Chart option={{}} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    unmount();

    render(<Chart option={{}} />);

    expect(await screen.findByTestId('chart-loaded')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('should ignore a chunk that arrives after the chart unmounted', async () => {
    let resolve: (chart: Loaded) => void = () => undefined;
    const { Chart } = lazyChart(
      () =>
        new Promise<Loaded>((done) => {
          resolve = done;
        }),
      'series',
    );

    const { unmount } = render(<Chart option={{}} />);
    unmount();
    await act(async () => resolve(LoadedChart));

    expect(screen.queryByTestId('chart-loaded')).not.toBeInTheDocument();
  });
});
