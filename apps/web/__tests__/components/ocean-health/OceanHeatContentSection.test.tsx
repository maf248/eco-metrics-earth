import { fireEvent, render, screen, within } from '@testing-library/react';

import { OceanHeatContentSection } from '@/components/ocean-health/OceanHeatContentSection';

import { OCEAN_HEAT_FIXTURE, OWID_OCEAN_META } from '../../fixtures/oceanHealth';

const chartOptions: { series: { name: string }[] }[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: { series: { name: string }[] } }) => {
    chartOptions.push(option);
    return <div data-testid="chart-stub" />;
  },
}));

const renderSection = (data = OCEAN_HEAT_FIXTURE) =>
  render(<OceanHeatContentSection data={{ data, meta: OWID_OCEAN_META }} />);

const tableHeaders = (): (string | null)[] =>
  screen.getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent);

describe('OceanHeatContentSection', () => {
  beforeEach(() => {
    chartOptions.length = 0;
  });

  it('should open on 0–700 m with four sources, a Depth toggle and a legend-bearing chart', () => {
    renderSection();

    expect(screen.getByRole('radio', { name: '0–700 m' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Depth' })).toBeInTheDocument();
    expect(chartOptions.at(-1)?.series.map(({ name }) => name)).toEqual([
      'IAP',
      'NOAA',
      'MRI/JMA',
      'CSIRO',
    ]);
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'World: ocean heat content, 0–700 m (10²² J)',
      }),
    ).toBeInTheDocument();
  });

  it('should switch to three sources and the matching table at 0–2000 m, without fetching', () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    renderSection();

    fireEvent.click(screen.getByRole('radio', { name: '0–2000 m' }));

    expect(chartOptions.at(-1)?.series.map(({ name }) => name)).toEqual(['IAP', 'NOAA', 'MRI/JMA']);
    expect(tableHeaders()).toEqual([
      'Year',
      'IAP, 2020–2024',
      'NOAA, 2020–2024',
      'MRI/JMA, 2020–2022',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('Showing ocean heat content for 0–2000 m');
    expect(fetchMock).not.toHaveBeenCalled();
    global.fetch = originalFetch;
  });

  it('should carry each source span in the table header and an em dash after it ends', () => {
    renderSection();

    expect(tableHeaders()).toEqual([
      'Year',
      'IAP, 2020–2024',
      'NOAA, 2020–2023',
      'MRI/JMA, 2020–2022',
      'CSIRO, no data',
    ]);
    const [newest] = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(newest).toHaveTextContent('202414.0———');
  });

  it('should state the unit, the different spans and the reference periods, and name the groups', () => {
    renderSection();

    expect(screen.getByTestId('ocean-heat-caveat')).toHaveTextContent(
      'Each source covers a different period and uses its own reference period, so compare the shape and the trend of the lines, not their level.',
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('10²² J');
    for (const group of ['IAP', 'NOAA', 'MRI/JMA', 'CSIRO']) {
      expect(text).toContain(group);
    }
  });

  it('should credit NOAA NCEI and the EPA from the payload', () => {
    renderSection();

    const attribution = screen.getByTestId('ocean-heat-attribution');
    expect(
      within(attribution).getByRole('link', { name: 'Our World in Data' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('ocean-heat-origin-0')).toHaveTextContent(
      'NOAA National Centers for Environmental Information',
    );
    expect(screen.getByTestId('ocean-heat-origin-1')).toHaveTextContent(
      'United States Environmental Protection Agency',
    );
  });

  it('should name the table region for the selected depth', () => {
    renderSection();

    expect(
      screen.getByRole('region', {
        hidden: true,
        name: 'Data table for ocean heat content, 0–700 m, scrollable',
      }),
    ).toBeInTheDocument();
  });
});
