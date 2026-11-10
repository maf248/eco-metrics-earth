import { fireEvent, render, screen, within } from '@testing-library/react';

import { Co2WorldMap, co2WorldMapTitle } from '@/components/co2-emissions/Co2WorldMap';
import type { WorldRegion } from '@/lib/worldGeometry';

import { CO2_FIXTURE } from '../../fixtures/co2Emissions';

const REGIONS: WorldRegion[] = [
  { key: 'ARG', code: 'ARG', name: 'Argentina' },
  { key: 'USA', code: 'USA', name: 'United States of America' },
];

interface MapItem {
  name: string;
  selected?: boolean;
}

/** The map draws nothing in jsdom: the stub exposes the option it would draw and a click. */
jest.mock('@/components/charts/ChoroplethMap', () => ({
  ChoroplethMap: ({
    buildOption,
    onRegionClick,
  }: {
    buildOption: (regions: readonly WorldRegion[]) => { series: { data: MapItem[] }[] };
    onRegionClick: (code: string) => void;
  }) => {
    const selected = buildOption(REGIONS)
      .series[0].data.filter((item) => item.selected)
      .map((item) => item.name);
    return (
      <div data-testid="map-stub" data-selected={selected.join(',')}>
        <button type="button" onClick={() => onRegionClick('USA')}>
          Map region USA
        </button>
      </div>
    );
  },
}));

const region = () => screen.getByTestId('co2-ranking-region');
const rowNames = () =>
  within(region())
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent);

describe('Co2WorldMap', () => {
  it('should title the card with the latest year and rank countries highest first', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    expect(screen.getByRole('heading', { level: 2, name: co2WorldMapTitle(2024) })).toBeVisible();
    expect(screen.getByRole('region', { name: co2WorldMapTitle(2024) })).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveValue('2024');
    expect(rowNames()).toEqual(['United States', 'Argentina', "Côte d'Ivoire", 'Kosovo']);
  });

  it('should show another year on the map and in the ranking when the slider moves', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2022' } });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(co2WorldMapTitle(2022));
    expect(
      screen.getByText('Countries ranked by CO2 emissions per capita, 2022'),
    ).toBeInTheDocument();
    expect(rowNames()).not.toContain('Argentina');
    expect(screen.getByRole('status')).toHaveTextContent('2022');
  });

  it('should reverse the order from the per-capita header', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    fireEvent.click(screen.getByRole('button', { name: /^Per capita/ }));
    expect(rowNames()[0]).toBe('Kosovo');
    expect(screen.getByRole('button', { name: /^Per capita/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('should select a country from the table on the map, and clear it on a second press', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    const button = screen.getByRole('button', { name: 'Argentina' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.closest('tr')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', 'ARG');

    fireEvent.click(button);
    expect(button.closest('tr')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', '');
  });

  it('should sort the ranking by total from its header', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    fireEvent.click(screen.getByRole('button', { name: /^Total/ }));
    expect(rowNames()).toEqual(['United States', 'Argentina', "Côte d'Ivoire", 'Kosovo']);
    expect(screen.getByText('Countries ranked by total CO2 emissions, 2024')).toBeInTheDocument();
  });

  it('should select a country clicked on the map in the table', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    fireEvent.click(screen.getByRole('button', { name: 'Map region USA' }));
    expect(screen.getByRole('button', { name: 'United States' }).closest('tr')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('should drop the selection in a year where the country has no value', () => {
    render(<Co2WorldMap data={CO2_FIXTURE} />);
    fireEvent.click(screen.getByRole('button', { name: 'Argentina' }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2022' } });
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', '');
    expect(within(region()).queryByRole('row', { current: true })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider'), { target: { value: '2024' } });
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', '');
    expect(screen.getByRole('button', { name: 'Argentina' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
