import { fireEvent, render, screen, within } from '@testing-library/react';

import { Co2DataTable } from '@/components/co2-emissions/Co2DataTable';
import { Co2EmissionsContent } from '@/components/co2-emissions/Co2EmissionsContent';
import { Co2Explorer } from '@/components/co2-emissions/Co2Explorer';
import { Co2KeyFigures, latestWorldFigures } from '@/components/co2-emissions/Co2KeyFigures';

import { CO2_FIXTURE, CO2_META, entityByCode } from '../../fixtures/co2Emissions';

const chartOptions: unknown[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: unknown }) => {
    chartOptions.push(option);
    return <div data-testid="chart-stub" />;
  },
}));

describe('latestWorldFigures', () => {
  it('should skip a trailing null and use the latest year with both values', () => {
    expect(latestWorldFigures(CO2_FIXTURE)).toEqual({ year: 2023, total: 37600.8, perCapita: 4.7 });
  });

  it('should return undefined without a World entity', () => {
    expect(latestWorldFigures({ ...CO2_FIXTURE, entities: [] })).toBeUndefined();
  });

  it('should return undefined when no year has both values', () => {
    const world = { ...entityByCode('OWID_WRL'), perCapita: [null, null, null, null, null] };

    expect(latestWorldFigures({ ...CO2_FIXTURE, entities: [world] })).toBeUndefined();
  });
});

describe('Co2KeyFigures', () => {
  it('should render the latest year and the formatted World figures as text', () => {
    render(<Co2KeyFigures data={CO2_FIXTURE} />);

    expect(screen.getByTestId('co2-key-figures')).toHaveTextContent(
      'In 2023 the world emitted 37,601 million tonnes of CO2, 4.70 tonnes per person.',
    );
  });

  it('should render nothing when there are no figures', () => {
    const { container } = render(<Co2KeyFigures data={{ ...CO2_FIXTURE, entities: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should show a tiny per-capita World value as "< 0.01"', () => {
    const world = { ...entityByCode('OWID_WRL'), perCapita: [0, 0, 0, 0.001, 0.001] };

    render(<Co2KeyFigures data={{ ...CO2_FIXTURE, entities: [world] }} />);

    expect(screen.getByTestId('co2-key-figures')).toHaveTextContent('< 0.01 tonnes per person');
    expect(screen.getByTestId('co2-key-figures')).not.toHaveTextContent('0.00');
  });
});

describe('Co2DataTable', () => {
  const renderTable = (code = 'ARG') =>
    render(<Co2DataTable entity={entityByCode(code)} data={CO2_FIXTURE} />);

  it('should be collapsed by default', () => {
    const { container } = renderTable();

    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByText('View data table')).toBeInTheDocument();
  });

  it('should caption the table with the entity and give columns a scope', () => {
    renderTable();

    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText(/Argentina: annual CO2 emissions, 2020–2024/)).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader', { hidden: true });
    expect(headers.map((header) => header.textContent)).toEqual([
      'Year',
      'Total (million tonnes of CO2)',
      'Per capita (tonnes of CO2 per person)',
    ]);
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'));
  });

  it('should list rows from the latest to the earliest year', () => {
    renderTable();

    const rows = screen.getAllByRole('row', { hidden: true });
    expect(within(rows[1]).getByRole('rowheader', { hidden: true })).toHaveTextContent('2024');
    expect(within(rows[5]).getByRole('rowheader', { hidden: true })).toHaveTextContent('2020');
  });

  it('should render an em dash for missing values', () => {
    renderTable();

    const row2022 = screen.getAllByRole('row', { hidden: true })[3];
    const cells = within(row2022).getAllByRole('cell', { hidden: true });
    expect(cells.map((cell) => cell.textContent)).toEqual(['—', '—']);
  });

  it('should format tiny per-capita values as "< 0.01" and never "0.00"', () => {
    renderTable('OWID_KOS');

    const rows = screen.getAllByRole('row', { hidden: true });
    expect(within(rows[5]).getAllByRole('cell', { hidden: true })[1]).toHaveTextContent('< 0.01');
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });

  it('should expose a focusable scrollable region', () => {
    renderTable();

    expect(screen.getByRole('region', { hidden: true })).toHaveAttribute('tabindex', '0');
  });
});

describe('Co2Explorer', () => {
  beforeEach(() => {
    chartOptions.length = 0;
  });

  it('should default to World and the total metric', () => {
    render(<Co2Explorer data={CO2_FIXTURE} />);

    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
    expect(screen.getByRole('radio', { name: 'Total' })).toBeChecked();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'World: total CO2 emissions (million tonnes per year)',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
  });

  it('should expose a radio group with a visible legend', () => {
    render(<Co2Explorer data={CO2_FIXTURE} />);

    const group = screen.getByRole('group', { name: 'Measure' });
    expect(within(group).getByText('Measure')).toBeVisible();
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
  });

  it('should switch the metric and redraw with the per-capita series of the same entity', () => {
    render(<Co2Explorer data={CO2_FIXTURE} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Per capita' }));

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'World: CO2 emissions per capita (tonnes per person per year)',
      }),
    ).toBeInTheDocument();
    const last = chartOptions[chartOptions.length - 1] as { series: { data: unknown[] }[] };
    expect(last.series[0].data).toEqual(entityByCode('OWID_WRL').perCapita);
  });

  it('should switch the country and announce the change', () => {
    render(<Co2Explorer data={CO2_FIXTURE} />);
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Argentina: total CO2 emissions',
    );
    expect(screen.getByText('Showing total CO2 emissions for Argentina')).toBeInTheDocument();
    const last = chartOptions[chartOptions.length - 1] as { series: { data: unknown[] }[] };
    expect(last.series[0].data).toEqual(entityByCode('ARG').total);
  });

  it('should announce the per-capita measure', () => {
    render(<Co2Explorer data={CO2_FIXTURE} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Per capita' }));

    expect(screen.getByText('Showing CO2 emissions per capita for World')).toBeInTheDocument();
  });

  it('should update the data table with the selection', () => {
    render(<Co2Explorer data={CO2_FIXTURE} />);
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'united' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText(/United States: annual CO2 emissions/)).toBeInTheDocument();
  });

  it('should never fetch or touch the URL, history or storage on interaction', () => {
    const fetchSpy = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchSpy as unknown as typeof global.fetch;
    const pushState = jest.spyOn(window.history, 'pushState');
    const replaceState = jest.spyOn(window.history, 'replaceState');
    render(<Co2Explorer data={CO2_FIXTURE} />);
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('radio', { name: 'Per capita' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(window.localStorage.length).toBe(0);
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should render the attribution slot under the chart and a collapsed table', () => {
    const { container } = render(
      <Co2Explorer data={CO2_FIXTURE} attribution={<p>attribution slot</p>} />,
    );

    expect(screen.getByText('attribution slot')).toBeInTheDocument();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('should fall back to the first entity for an unknown selection', () => {
    render(<Co2Explorer data={{ ...CO2_FIXTURE, entities: CO2_FIXTURE.entities.slice(1) }} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Argentina');
  });
});

describe('Co2EmissionsContent', () => {
  const renderContent = () =>
    render(<Co2EmissionsContent data={{ data: CO2_FIXTURE, meta: CO2_META }} />);

  it('should render the key figures and the explorer with World selected', () => {
    renderContent();

    expect(screen.getByTestId('co2-key-figures')).toHaveTextContent('In 2023');
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
  });

  it('should attribute the data to the provider from the API meta', () => {
    renderContent();

    const attribution = screen.getByTestId('co2-attribution');
    expect(attribution).toHaveTextContent(/^Data:/);
    const link = within(attribution).getByRole('link', { name: 'Our World in Data' });
    expect(link).toHaveAttribute('href', 'https://ourworldindata.org');
    expect(attribution).toHaveTextContent('(CC BY 4.0)');
  });

  it('should show the provider update date and no dataset version', () => {
    renderContent();

    const attribution = screen.getByTestId('co2-attribution');
    expect(attribution).not.toHaveTextContent('version 2025-11-13');
    const time = attribution.querySelector('time');
    expect(time).toHaveAttribute('datetime', '2026-10-22T21:47:04.000Z');
    expect(time).toHaveTextContent('Oct 22, 2026');
  });

  it('should link to all data sources exactly once in the attribution block', () => {
    renderContent();

    const links = within(screen.getByTestId('co2-attribution')).getAllByRole('link', {
      name: 'All data sources',
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/data-sources');
  });

  it('should state the methodology', () => {
    renderContent();

    expect(screen.getByText(/fossil fuels and industry/)).toHaveTextContent(
      /Land-use change is not included/,
    );
    expect(screen.getByText(/divide each country/)).toBeInTheDocument();
  });

  it('should credit the Global Carbon Project origin inside the attribution block', () => {
    renderContent();

    const attribution = screen.getByTestId('co2-attribution');
    const origin = within(attribution).getByTestId('co2-origin');
    expect(origin).toHaveTextContent('Global Carbon Project');
    expect(within(origin).getByRole('link', { name: 'Global Carbon Budget' })).toHaveAttribute(
      'href',
      'https://globalcarbonbudget.org/',
    );
    expect(within(origin).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
  });
});
