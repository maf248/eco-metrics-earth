import { fireEvent, render, screen, within } from '@testing-library/react';

import { OceanSstAnomalySection } from '@/components/ocean-health/OceanSstAnomalySection';

import { OCEAN_SST_ANOMALY_FIXTURE, OWID_OCEAN_META } from '../../fixtures/oceanHealth';

const chartOptions: { series: { name: string }[] }[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: { series: { name: string }[] } }) => {
    chartOptions.push(option);
    return <div data-testid="chart-stub" />;
  },
}));

const renderSection = (data = OCEAN_SST_ANOMALY_FIXTURE) =>
  render(<OceanSstAnomalySection data={{ data, meta: OWID_OCEAN_META }} />);

describe('OceanSstAnomalySection', () => {
  beforeEach(() => {
    chartOptions.length = 0;
  });

  it('should open on World, naming the region, the baseline and the unit in the chart title', () => {
    renderSection();

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'World: annual sea surface temperature anomaly (°C, relative to the 1861–1890 average)',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'World' })).toBeChecked();
  });

  it('should offer the region toggle with the three regions in a group named Region', () => {
    renderSection();

    const group = screen.getByRole('group', { name: 'Region' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.nextSibling?.textContent),
    ).toEqual(['World', 'Northern Hemisphere', 'Southern Hemisphere']);
  });

  it('should switch the chart, the table and the announcement to the selected region', () => {
    renderSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Southern Hemisphere' }));

    expect(
      screen.getByRole('heading', { level: 3, name: /^Southern Hemisphere: annual/ }),
    ).toBeInTheDocument();
    expect(chartOptions.at(-1)?.series.every(({ name }) => name === 'Southern Hemisphere')).toBe(
      true,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing the annual sea surface temperature anomaly for Southern Hemisphere',
    );
    expect(
      screen.getByRole('region', {
        hidden: true,
        name: 'Data table for sea surface temperature anomaly for Southern Hemisphere, scrollable',
      }),
    ).toBeInTheDocument();
    // 2022 is missing for the southern region: an em dash, never a zero.
    const row2022 = screen
      .getAllByRole('row', { hidden: true })
      .find((row) => row.textContent?.startsWith('2022'));
    expect(row2022).toHaveTextContent('2022———');
  });

  it('should not fetch when the region changes', () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    renderSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Northern Hemisphere' }));

    expect(fetchMock).not.toHaveBeenCalled();
    global.fetch = originalFetch;
  });

  it('should list the years of the region newest first with signed values', () => {
    renderSection();

    const [newest] = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(newest).toHaveTextContent('2024+1.20+1.15+1.25');
  });

  it('should credit OWID as the processor and the Met Office HadSST notice from the payload', () => {
    renderSection({
      ...OCEAN_SST_ANOMALY_FIXTURE,
      origin: { ...OCEAN_SST_ANOMALY_FIXTURE.origin, notice: 'Changed Met Office notice' },
    });

    const attribution = screen.getByTestId('ocean-sst-anomaly-attribution');
    expect(
      within(attribution).getByRole('link', { name: 'Our World in Data' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('ocean-sst-anomaly-origin')).toHaveTextContent(
      'Met Office Hadley Centre',
    );
    expect(screen.getByTestId('ocean-sst-anomaly-origin')).toHaveTextContent(
      'Changed Met Office notice.',
    );
  });

  it('should defer the chart until it scrolls into view', () => {
    const original = global.IntersectionObserver;
    global.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;

    renderSection();

    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-stub')).not.toBeInTheDocument();
    global.IntersectionObserver = original;
  });
});
