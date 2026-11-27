import { fireEvent, render, screen, within } from '@testing-library/react';

import { ForestAreaSection } from '@/components/deforestation/ForestAreaSection';
import { ForestChangeSection } from '@/components/deforestation/ForestChangeSection';
import { ForestKeyFigures } from '@/components/deforestation/ForestKeyFigures';
import { rankingThresholdNote } from '@/components/deforestation/ForestRankingTable';
import { TreeCoverLossSection } from '@/components/deforestation/TreeCoverLossSection';
import { scrollRowIntoRegion } from '@/lib/scrollRowIntoRegion';
import type { WorldRegion } from '@/lib/worldGeometry';

import { FOREST_FIXTURE, TREE_COVER_LOSS_FIXTURE } from '../../fixtures/deforestation';

jest.mock('@/lib/scrollRowIntoRegion', () => ({ scrollRowIntoRegion: jest.fn() }));

const lineOptions: { series: { data: (number | null)[] }[] }[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: { series: { data: (number | null)[] }[] } }) => {
    lineOptions.push(option);
    return <div data-testid="line-chart-stub" />;
  },
}));
jest.mock('@/components/charts/LazyColumnEChart', () => ({
  LazyColumnEChart: ({ palette }: { palette?: string }) => (
    <div data-testid="column-chart-stub" data-palette={palette} />
  ),
}));

interface MapItem {
  name: string;
  selected?: boolean;
}

/** The map draws nothing in jsdom: the stub exposes the option it would draw and a click. */
jest.mock('@/components/charts/ChoroplethMap', () => ({
  ChoroplethMap: ({
    buildOption,
    onRegionClick,
    ramp,
  }: {
    buildOption: (regions: readonly WorldRegion[]) => { series: { data: MapItem[] }[] };
    onRegionClick: (code: string) => void;
    ramp?: string;
  }) => {
    const selected = buildOption([
      { key: 'BRA', code: 'BRA', name: 'Brazil' },
      { key: 'CHN', code: 'CHN', name: 'China' },
    ])
      .series[0].data.filter((item) => item.selected)
      .map((item) => item.name);
    return (
      <div data-testid="map-stub" data-ramp={ramp} data-selected={selected.join(',')}>
        <button type="button" onClick={() => onRegionClick('CHN')}>
          Map region CHN
        </button>
      </div>
    );
  },
}));

describe('ForestKeyFigures', () => {
  it('should render nothing when the World has no value', () => {
    const { container } = render(<ForestKeyFigures data={{ ...FOREST_FIXTURE, entities: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('ForestAreaSection', () => {
  beforeEach(() => {
    lineOptions.length = 0;
  });

  it('should open on World in hectares with the caveats in the subtitle', () => {
    render(<ForestAreaSection data={FOREST_FIXTURE} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Forest area' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('World');
    expect(screen.getByRole('radio', { name: 'Hectares' })).toBeChecked();
    expect(
      screen.getByRole('heading', { level: 3, name: 'World: forest area (million hectares)' }),
    ).toBeInTheDocument();
    const subtitle = screen.getByText(/FAO reports at intervals of 5 to 10 years/);
    expect(subtitle).toHaveTextContent('the years in between are interpolated');
    expect(subtitle).toHaveTextContent('plantations included');
    expect(subtitle).toHaveTextContent('does not start at zero');
  });

  it('should switch the chart and the table to the share without a request', () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    render(<ForestAreaSection data={FOREST_FIXTURE} />);

    fireEvent.click(screen.getByRole('radio', { name: '% of land' }));

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'World: forest area as a share of land (% of land area)',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Showing forest area as a share of land (% of land area) for World'),
    ).toHaveAttribute('role', 'status');
    expect(
      screen.getByRole('columnheader', { name: 'Forest area (% of land area)' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '31.9' })[0]).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    global.fetch = originalFetch;
  });

  it('should list the years newest first with the hectares in thousand hectares', () => {
    render(<ForestAreaSection data={FOREST_FIXTURE} />);

    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: 'Forest area (thousand hectares)' }),
    ).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('2025');
    expect(within(rows[1]).getByRole('cell')).toHaveTextContent('4,140,215');
  });

  it('should draw a small country in thousand hectares and remount when the unit changes', async () => {
    render(<ForestAreaSection data={FOREST_FIXTURE} />);
    const combobox = screen.getByRole('combobox');

    fireEvent.change(combobox, { target: { value: 'Ireland' } });
    fireEvent.click(await screen.findByRole('option', { name: /Ireland/ }));

    expect(
      screen.getByRole('heading', { level: 3, name: 'Ireland: forest area (thousand hectares)' }),
    ).toBeInTheDocument();
  });
});

describe('ForestChangeSection', () => {
  const rowNames = (): (string | null)[] =>
    within(screen.getByTestId('forest-ranking-region'))
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);

  it('should title the card, the map and name every class with its signed range', () => {
    render(<ForestChangeSection data={FOREST_FIXTURE} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Forest change since 1990' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Change in forest area since 1990' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-ramp', 'divergent');
    const legend = screen.getByRole('list', {
      name: 'Legend: percentage change in forest area since 1990',
    });
    expect(legend.textContent).toBe(
      '< −50%−50 to −25%−25 to −5%−5 to +5%+5 to +25%+25 to +50%≥ +50%No data',
    );
  });

  it('should rank by net change, largest loss first, and mark the sorted header', () => {
    render(<ForestChangeSection data={FOREST_FIXTURE} />);

    expect(rowNames()).toEqual(['Brazil', 'Burkina Faso', 'Nauru', 'Ireland', 'Russia', 'China']);
    const rows = within(screen.getByTestId('forest-ranking-region')).getAllByRole('row');
    expect(within(rows[1]).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(within(rows[1]).getAllByRole('cell')[1]).toHaveTextContent('−132,357');
    expect(within(rows[1]).getAllByRole('cell')[2]).toHaveTextContent('−21.4%');
    expect(screen.getByRole('button', { name: /^Net change/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('should sort by percentage, ranking only the eligible countries, then reverse it', () => {
    render(<ForestChangeSection data={FOREST_FIXTURE} />);

    fireEvent.click(screen.getByRole('button', { name: /^Change/ }));
    expect(rowNames()).toEqual(['Burkina Faso', 'Brazil', 'Russia', 'China', 'Ireland', 'Nauru']);
    const rank = (name: string): string | null | undefined =>
      screen.getByRole('button', { name }).closest('tr')?.querySelector('td')?.textContent;
    expect(rank('Burkina Faso')).toBe('1');
    expect(rank('Ireland')).toBe('—');
    expect(rank('Nauru')).toBe('—');
    expect(screen.getByRole('button', { name: 'Ireland' }).closest('tr')).toHaveTextContent(
      '+80.4%',
    );
    expect(screen.getByRole('button', { name: 'Nauru' }).closest('tr')).toHaveTextContent('—');

    fireEvent.click(screen.getByRole('button', { name: /^Change/ }));
    expect(rowNames()).toEqual(['China', 'Russia', 'Brazil', 'Burkina Faso', 'Ireland', 'Nauru']);
    expect(screen.getByRole('button', { name: /^Change/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('should state the threshold and how many countries follow the ranked ones', () => {
    render(<ForestChangeSection data={FOREST_FIXTURE} />);

    expect(screen.getByTestId('forest-ranking-note')).toHaveTextContent(
      'Percentage change is ranked only for countries with at least 1 million hectares of forest in 1990 (2 countries are listed after the ranked ones).',
    );
  });

  it('should share the selection between the table and the map, and clear it on a second press', () => {
    render(<ForestChangeSection data={FOREST_FIXTURE} />);
    const button = screen.getByRole('button', { name: 'Brazil' });

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.closest('tr')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', 'BRA');
    expect(scrollRowIntoRegion).toHaveBeenCalledWith(
      screen.getByRole('region', { name: /Countries ranked by net change/ }),
      button.closest('tr'),
    );

    fireEvent.click(button);
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', '');

    fireEvent.click(screen.getByRole('button', { name: 'Map region CHN' }));
    expect(screen.getByRole('button', { name: 'China' }).closest('tr')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('should name its scrollable region and caption the table by the sort measure', () => {
    render(<ForestChangeSection data={FOREST_FIXTURE} />);

    const region = screen.getByRole('region', {
      name: /Countries ranked by net change in forest area/,
    });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('tabindex', '0');
    fireEvent.click(screen.getByRole('button', { name: /^Change/ }));
    expect(
      screen.getByText('Countries ranked by percentage change in forest area, 1990 to 2025'),
    ).toBeInTheDocument();
  });
});

describe('rankingThresholdNote', () => {
  it('should read singular for one country and omit the count when none follow', () => {
    expect(rankingThresholdNote(1990, 1)).toContain('(1 country is listed after the ranked ones)');
    expect(rankingThresholdNote(1990, 0)).toMatch(/in 1990\.$/);
  });
});

describe('TreeCoverLossSection', () => {
  it('should title the card, say it is not deforestation and note the approximation', () => {
    render(<TreeCoverLossSection data={TREE_COVER_LOSS_FIXTURE} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Tree cover loss by cause' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tree cover loss detected by satellite each year, by dominant cause, in million hectares. It is not the same as deforestation: loss from fires and logging is often followed by regrowth.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tree-cover-loss-note')).toHaveTextContent(
      'Each cause is the dominant one for a patch of about 1 km, so the split is approximate. Detection methods improved between 2011 and 2015, which may make recent years look higher than earlier ones.',
    );
    expect(screen.getByTestId('column-chart-stub')).toHaveAttribute(
      'data-palette',
      'treeCoverLoss',
    );
  });

  it('should list a column per driver and a total, newest first, with a dash for a blank driver', async () => {
    render(<TreeCoverLossSection data={TREE_COVER_LOSS_FIXTURE} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Russia' } });
    fireEvent.click(await screen.findByRole('option', { name: /Russia/ }));

    const table = screen.getByRole('table');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);
    expect(headers).toEqual([
      'Year',
      'Permanent agriculture',
      'Hard commodities (mining and energy)',
      'Settlements and infrastructure',
      'Shifting cultivation',
      'Logging',
      'Wildfire',
      'Other natural disturbances',
      'Total',
    ]);
    const row2020 = within(table)
      .getAllByRole('row')
      .find((row) => within(row).queryByRole('rowheader', { name: '2020' }));
    const cells = within(row2020 as HTMLElement)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    // Shifting cultivation and wildfire have no value in 2020: dashes, and a total of the rest.
    expect(cells).toEqual(['3', '40', '4', '—', '800', '—', '45', '892']);
    expect(screen.getByTestId('tree-cover-loss-table-note')).toHaveTextContent(
      'A dash means the source lists no loss for that cause.',
    );
  });

  it('should follow another country with no request and announce it in a live region', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    try {
      render(<TreeCoverLossSection data={TREE_COVER_LOSS_FIXTURE} />);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Russia' } });
      fireEvent.click(await screen.findByRole('option', { name: /Russia/ }));

      const announcement = screen.getByText('Showing tree cover loss by cause for Russia');
      expect(announcement).toHaveAttribute('role', 'status');
      expect(
        screen.getByRole('heading', {
          level: 3,
          name: 'Russia: tree cover loss by cause (million hectares per year)',
        }),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should show a dash total when every driver of a year is blank', async () => {
    render(<TreeCoverLossSection data={TREE_COVER_LOSS_FIXTURE} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nauru' } });
    fireEvent.click(await screen.findByRole('option', { name: /Nauru/ }));

    const row2024 = within(screen.getByRole('table'))
      .getAllByRole('row')
      .find((row) => within(row).queryByRole('rowheader', { name: '2024' }));
    expect(
      within(row2024 as HTMLElement)
        .getAllByRole('cell')
        .every((cell) => cell.textContent === '—'),
    ).toBe(true);
  });
});
