import { act, fireEvent, render, screen } from '@testing-library/react';

import { ChoroplethMap } from '@/components/charts/ChoroplethMap';
import type { WorldRegion } from '@/lib/worldGeometry';

const REGIONS: WorldRegion[] = [{ key: 'ARG', code: 'ARG', name: 'Argentina' }];

jest.mock('@/lib/worldGeometry', () => ({
  ...jest.requireActual('@/lib/worldGeometry'),
  loadWorldGeometry: jest.fn(() => Promise.resolve(REGIONS)),
}));

type Handler = (params: unknown) => void;

/** The parts of an ECharts instance the map uses, with its zoom kept in memory. */
function fakeChart() {
  const handlers = new Map<string, Handler>();
  let zoom = 1;
  return {
    handlers,
    on: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
    getOption: jest.fn(() => ({ series: [{ zoom }] })),
    setOption: jest.fn((option: { series: { zoom: number }[] }) => {
      zoom = option.series[0].zoom;
    }),
  };
}

let chart: ReturnType<typeof fakeChart>;

jest.mock('@/components/charts/LazyMapEChart', () => ({
  preloadMapEChart: jest.fn(),
  LazyMapEChart: ({ option, onReady }: { option: unknown; onReady: (c: unknown) => void }) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => onReady(chart), [onReady]);
    return <div data-testid="map-stub">{JSON.stringify(option)}</div>;
  },
}));

function mockNarrow(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn(() => ({
      matches,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

async function renderMap(onRegionClick = jest.fn()) {
  const buildOption = jest.fn((regions: readonly WorldRegion[]) => ({ regions: regions.length }));
  render(<ChoroplethMap buildOption={buildOption} onRegionClick={onRegionClick} />);
  await screen.findByTestId('map-stub');
  return { buildOption, onRegionClick };
}

describe('ChoroplethMap', () => {
  beforeEach(() => {
    chart = fakeChart();
    mockNarrow(false);
  });

  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('should show the map skeleton until the geometry loads, then the caller option', async () => {
    render(<ChoroplethMap buildOption={() => ({ built: true })} onRegionClick={jest.fn()} />);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(await screen.findByTestId('map-stub')).toHaveTextContent('{"built":true}');
  });

  it('should build the option from the loaded regions', async () => {
    const { buildOption } = await renderMap();
    expect(buildOption).toHaveBeenCalledWith(REGIONS);
  });

  it('should report a clicked region with data and ignore one without', async () => {
    const { onRegionClick } = await renderMap();
    act(() => chart.handlers.get('click')?.({ name: 'ARG', data: { value: 3 } }));
    act(() => chart.handlers.get('click')?.({ name: 'region:Somaliland' }));
    expect(onRegionClick).toHaveBeenCalledTimes(1);
    expect(onRegionClick).toHaveBeenCalledWith('ARG');
  });

  it('should zoom in and out within the scale limit, and reset the view', async () => {
    await renderMap();
    fireEvent.click(await screen.findByRole('button', { name: 'Zoom out' }));
    expect(chart.setOption).toHaveBeenLastCalledWith({ series: [{ zoom: 1 }] });

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    const [{ series }] = chart.setOption.mock.lastCall as [{ series: { zoom: number }[] }];
    expect(series[0].zoom).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(chart.setOption).toHaveBeenLastCalledWith({ series: [{ zoom: 1, center: null }] });
  });

  it('should offer only "Reset view" on narrow screens, once the view has moved', async () => {
    mockNarrow(true);
    await renderMap();
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset view' })).not.toBeInTheDocument();

    act(() => chart.handlers.get('georoam')?.({}));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(chart.setOption).toHaveBeenLastCalledWith({ series: [{ zoom: 1, center: null }] });
    expect(screen.queryByRole('button', { name: 'Reset view' })).not.toBeInTheDocument();
  });
});
