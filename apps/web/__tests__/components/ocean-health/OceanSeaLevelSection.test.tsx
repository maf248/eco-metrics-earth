import { render, screen, within } from '@testing-library/react';

import { OceanSeaLevelSection } from '@/components/ocean-health/OceanSeaLevelSection';
import type { OceanSeaLevelData } from '@eco-metrics/shared';

import { NOAA_LSA_META, OCEAN_SEA_LEVEL_FIXTURE } from '../../fixtures/oceanHealth';

const chartOptions: { series: { name: string }[] }[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: { series: { name: string }[] } }) => {
    chartOptions.push(option);
    return <div data-testid="chart-stub" />;
  },
}));

const renderSection = (overrides: Partial<OceanSeaLevelData> = {}) =>
  render(
    <OceanSeaLevelSection
      data={{ data: { ...OCEAN_SEA_LEVEL_FIXTURE, ...overrides }, meta: NOAA_LSA_META }}
    />,
  );

describe('OceanSeaLevelSection', () => {
  beforeEach(() => {
    chartOptions.length = 0;
  });

  it('should draw one line per mission', () => {
    renderSection();

    expect(chartOptions.at(-1)?.series).toHaveLength(3);
  });

  it('should show the trend, its unit and its note as text', () => {
    renderSection();

    expect(screen.getByTestId('ocean-sea-level-trend')).toHaveTextContent(
      '3.11 mm/year (no glacial isostatic adjustment correction)',
    );
  });

  it('should state the rise from the first to the latest observation under the trend', () => {
    renderSection();

    const rise = screen.getByTestId('ocean-sea-level-rise');
    expect(rise.textContent?.replace(/\u00a0/g, ' ')).toBe(
      'From the first measurement (17 Dec 1992) to the latest (15 Feb 2025), the global mean sea ' +
        'level rose 124 mm, about 12 cm, in 32 years.',
    );
    const trend = screen.getByTestId('ocean-sea-level-trend');
    expect(trend.compareDocumentPosition(rise) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should say the sea level fell when the latest observation is lower', () => {
    renderSection({
      missions: [{ id: 'a', name: 'A', dates: ['2000-01-01', '2010-01-01'], values: [30, 0] }],
    });

    expect(screen.getByTestId('ocean-sea-level-rise')).toHaveTextContent(
      /fell 30\smm, about 3\scm, in 10 years/,
    );
  });

  it('should say the file is not current and name the month the data end', () => {
    renderSection({ endDate: '2025-02-15' });

    const note = screen.getByTestId('ocean-sea-level-end-note');
    expect(note).toHaveTextContent('end in February 2025');
    expect(note).toHaveTextContent('not current');
  });

  it('should change the note with the end date of the payload', () => {
    renderSection({ endDate: '2025-03-01' });

    expect(screen.getByTestId('ocean-sea-level-end-note')).toHaveTextContent('end in March 2025');
  });

  it('should not call a recent series stale', () => {
    renderSection({ endDate: '2026-11-20' });

    const note = screen.getByTestId('ocean-sea-level-end-note');
    expect(note).toHaveTextContent('latest observation in this series is from November 2026');
    expect(note).not.toHaveTextContent('not current');
  });

  it('should credit NOAA with the verbatim acknowledgment and the experimental-use disclaimer', () => {
    renderSection();

    const attribution = screen.getByTestId('ocean-sea-level-attribution');
    expect(
      within(attribution).getByRole('link', { name: 'NOAA Laboratory for Satellite Altimetry' }),
    ).toHaveAttribute('href', 'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/');
    const origin = screen.getByTestId('ocean-sea-level-origin');
    expect(origin).toHaveTextContent(
      'Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.',
    );
    expect(origin).toHaveTextContent('experimental use only');
  });

  it('should list one row per year, newest first, with one column per mission', () => {
    renderSection();

    expect(
      screen.getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent),
    ).toEqual(['Year', 'TOPEX/Poseidon (mm)', 'Jason-3 (mm)', 'Sentinel-6MF (mm)']);
    const rows = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(rows).toHaveLength(2025 - 1992 + 1);
    expect(rows[0]).toHaveTextContent('2025—103.2103.95');
    expect(rows.at(-1)).toHaveTextContent('1992−19.33——');
    expect(
      screen.getByText(/only partly covered averages the observations it has/),
    ).toBeInTheDocument();
  });
});
