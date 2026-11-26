import { render, screen, within } from '@testing-library/react';

import { OceanPhSection } from '@/components/ocean-health/OceanPhSection';

import { OCEAN_PH_FIXTURE, OWID_OCEAN_META } from '../../fixtures/oceanHealth';

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: () => <div data-testid="chart-stub" />,
}));

const renderSection = (data = OCEAN_PH_FIXTURE) =>
  render(<OceanPhSection data={{ data, meta: OWID_OCEAN_META }} />);

describe('OceanPhSection', () => {
  it('should explain why one Hawaii station is the reference record', () => {
    renderSection();

    const note = screen.getByTestId('ocean-ph-note');
    expect(note).toHaveTextContent('open-ocean research station');
    expect(note).toHaveTextContent('far from coasts');
    expect(note).toHaveTextContent('since October 1988');
    expect(note).toHaveTextContent('falling pH there shows the ocean absorbing carbon dioxide');
    expect(note).toHaveTextContent('one site, not a global average');
  });

  it('should take the start month of the note from the data', () => {
    renderSection({
      ...OCEAN_PH_FIXTURE,
      dates: ['1990-03-05', ...OCEAN_PH_FIXTURE.dates.slice(1)],
    });

    expect(screen.getByTestId('ocean-ph-note')).toHaveTextContent('since March 1990');
  });

  it('should credit OWID as the processor and the Hawaii Ocean Time-series producer', () => {
    renderSection();

    const attribution = screen.getByTestId('ocean-ph-attribution');
    expect(
      within(attribution).getByRole('link', { name: 'Our World in Data' }),
    ).toBeInTheDocument();
    const origin = screen.getByTestId('ocean-ph-origin');
    expect(origin).toHaveTextContent('School of Ocean & Earth Science & Technology');
    expect(within(origin).getByRole('link', { name: 'Hawaii Ocean Time-series' })).toHaveAttribute(
      'href',
      'https://hahana.soest.hawaii.edu/hot/',
    );
  });

  it('should list every month newest first with the monthly and the rolling value', () => {
    renderSection();

    expect(
      screen.getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent),
    ).toEqual(['Date', 'Monthly', 'Yearly average']);
    const rows = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('2024-12-208.0398.039');
    expect(rows[3]).toHaveTextContent('1988-10-318.110—');
  });

  it('should show an em dash for a missing monthly value and for the blank first-year average', () => {
    renderSection();

    const rows = screen.getAllByRole('row', { hidden: true }).slice(1);
    expect(rows[1]).toHaveTextContent('1990-01-08—8.110');
    expect(within(rows[3]).getAllByRole('cell', { hidden: true })[1]).toHaveTextContent('—');
  });

  it('should draw the chart', () => {
    renderSection();

    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
  });
});
