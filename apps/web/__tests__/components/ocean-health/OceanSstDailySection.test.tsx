import { render, screen, within } from '@testing-library/react';

import { OceanSstDailySection } from '@/components/ocean-health/OceanSstDailySection';
import type { OceanSstDailyData, OceanSstDailyPoint } from '@eco-metrics/shared';

import { COPERNICUS_META, OCEAN_SST_DAILY_FIXTURE as FIXTURE } from '../../fixtures/oceanHealth';

const chartOptions: unknown[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: unknown }) => {
    chartOptions.push(option);
    return <div data-testid="chart-stub" />;
  },
}));

const day = (index: number): OceanSstDailyPoint => {
  const date = new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10);
  return {
    date,
    sst: 20 + index / 1000,
    climatology: 19.9,
    anomaly: 0.1 + index / 1000,
    status: index === 89 ? 'preliminary' : 'final',
  };
};

const NINETY: OceanSstDailyPoint[] = Array.from({ length: 90 }, (_, index) => day(index));

function renderSection(overrides: Partial<OceanSstDailyData> = {}) {
  render(
    <OceanSstDailySection data={{ data: { ...FIXTURE, ...overrides }, meta: COPERNICUS_META }} />,
  );
}

describe('OceanSstDailySection', () => {
  beforeEach(() => {
    chartOptions.length = 0;
  });

  it('should render the section heading and no key figures of its own', () => {
    renderSection();

    expect(screen.queryByTestId('ocean-key-figures')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Daily sea surface temperature since 2022' }),
    ).toBeInTheDocument();
  });

  it('should draw the chart at once, not behind a skeleton', () => {
    renderSection();

    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
    expect(chartOptions).toHaveLength(1);
  });

  it('should explain the grey lines in a sentence under the chart', () => {
    renderSection();

    expect(screen.getByTestId('ocean-sst-daily-key')).toHaveTextContent(
      'Each grey line is one earlier year since 2022. The highlighted lines are 2024, the latest year, and 2023, the year of the highest daily value, and the dashed line is the 1991–2020 average.',
    );
  });

  it('should say so when the latest year is also the record year', () => {
    renderSection({ record: { ...FIXTURE.record, date: '2024-03-20' } });

    expect(screen.getByTestId('ocean-sst-daily-key')).toHaveTextContent(
      'The highlighted line is 2024, the latest year and also the year of the highest daily value',
    );
  });

  it('should credit Copernicus Climate Pulse with the producer notice and disclaimer from the payload', () => {
    renderSection({ origin: { ...FIXTURE.origin, notice: 'Changed notice text' } });

    const attribution = screen.getByTestId('ocean-sst-daily-attribution');
    expect(
      within(attribution).getByRole('link', { name: 'Copernicus Climate Pulse' }),
    ).toHaveAttribute('href', 'https://pulse.climate.copernicus.eu');
    expect(within(attribution).getByRole('link', { name: 'All data sources' })).toHaveAttribute(
      'href',
      '/data-sources',
    );
    const origin = screen.getByTestId('ocean-sst-daily-origin');
    expect(origin).toHaveTextContent('Changed notice text.');
    expect(origin).toHaveTextContent('Neither the European Commission nor ECMWF');
    expect(within(origin).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });

  describe('data table', () => {
    it('should list the 90 recent days newest first with a note, collapsed by default', () => {
      renderSection({ recent: NINETY });

      expect(screen.getByText('View data table')).toBeInTheDocument();
      expect(screen.getByText('Showing the most recent 90 days')).toBeInTheDocument();
      const rows = screen.getAllByRole('row', { hidden: true }).slice(1);
      expect(rows).toHaveLength(90);
      expect(within(rows[0]).getByRole('rowheader', { hidden: true })).toHaveTextContent(
        NINETY[89].date,
      );
      expect(within(rows[89]).getByRole('rowheader', { hidden: true })).toHaveTextContent(
        NINETY[0].date,
      );
    });

    it('should have the columns Date, SST, Anomaly, average and Status', () => {
      renderSection({ recent: NINETY });

      expect(
        screen.getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent),
      ).toEqual(['Date', 'SST (°C)', 'Anomaly (°C)', '1991–2020 average (°C)', 'Status']);
    });

    it('should format each cell and flag a preliminary row', () => {
      renderSection({ recent: NINETY });

      const [newest] = screen.getAllByRole('row', { hidden: true }).slice(1);
      expect(newest).toHaveTextContent('20.09');
      expect(newest).toHaveTextContent('+0.19');
      expect(newest).toHaveTextContent('Preliminary');
      expect(screen.getAllByRole('row', { hidden: true })[2]).toHaveTextContent('Final');
    });

    it('should name its scroll region for assistive technology', () => {
      renderSection();

      expect(
        screen.getByRole('region', {
          hidden: true,
          name: 'Data table for daily sea surface temperature, scrollable',
        }),
      ).toHaveAttribute('tabindex', '0');
    });
  });

  it('should keep the payload it was given untouched when reversing the rows', () => {
    const recent = [...FIXTURE.recent];

    renderSection({ recent });

    expect(recent.map(({ date }) => date)).toEqual(FIXTURE.recent.map(({ date }) => date));
  });
});
