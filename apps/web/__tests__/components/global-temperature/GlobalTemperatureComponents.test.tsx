import { fireEvent, render, screen, within } from '@testing-library/react';

import { GlobalTemperatureContent } from '@/components/global-temperature/GlobalTemperatureContent';
import { GlobalTemperatureExplorer } from '@/components/global-temperature/GlobalTemperatureExplorer';
import {
  GlobalTemperatureKeyFigures,
  worldTemperatureFigures,
} from '@/components/global-temperature/GlobalTemperatureKeyFigures';

import {
  TEMPERATURE_FIXTURE,
  TEMPERATURE_META,
  temperatureEntity,
} from '../../fixtures/globalTemperature';

const chartOptions: unknown[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: unknown }) => {
    chartOptions.push(option);
    return <div data-testid="chart-stub" />;
  },
}));

const withWorld = (anomaly: (number | null)[], overrides = {}) => ({
  ...TEMPERATURE_FIXTURE,
  ...overrides,
  entities: [{ ...temperatureEntity('OWID_WRL'), anomaly }],
});

describe('worldTemperatureFigures', () => {
  it('should skip a trailing null for the latest year and find the warmest year', () => {
    expect(worldTemperatureFigures(TEMPERATURE_FIXTURE)).toEqual({
      latest: { year: 2023, anomaly: 0.6 },
      warmest: { year: 2022, anomaly: 0.72 },
    });
  });

  it('should name the most recent year when the maximum is tied', () => {
    const figures = worldTemperatureFigures(withWorld([0.5, 0.8, 0.2, 0.8, 0.1]));

    expect(figures?.warmest).toEqual({ year: 2023, anomaly: 0.8 });
  });

  it('should return undefined without World or without any World value', () => {
    expect(worldTemperatureFigures({ ...TEMPERATURE_FIXTURE, entities: [] })).toBeUndefined();
    expect(worldTemperatureFigures(withWorld([null, null, null, null, null]))).toBeUndefined();
  });
});

describe('GlobalTemperatureKeyFigures', () => {
  it('should render both sentences as text with signed values', () => {
    render(<GlobalTemperatureKeyFigures data={TEMPERATURE_FIXTURE} />);

    const figures = screen.getByTestId('global-temperature-key-figures');
    expect(figures).toHaveTextContent(
      "In 2023 the world's average surface temperature was +0.60 °C relative to the 1991–2020 average.",
    );
    expect(figures).toHaveTextContent('The warmest year since 2020 was 2022, at +0.72 °C.');
  });

  it('should show a negative latest anomaly with the real minus sign', () => {
    render(<GlobalTemperatureKeyFigures data={withWorld([0.1, 0.2, 0.3, 0.4, -0.2])} />);

    const text = screen.getByTestId('global-temperature-key-figures').textContent ?? '';
    expect(text).toContain('was −0.20 °C relative');
    expect(text).not.toMatch(/-0\.20/);
  });

  it('should take the baseline and the first year from the payload', () => {
    render(
      <GlobalTemperatureKeyFigures
        data={withWorld([0.1, 0.2, 0.3, 0.4, 0.5], {
          baseline: { startYear: 1981, endYear: 2010 },
          startYear: 2020,
        })}
      />,
    );

    const text = screen.getByTestId('global-temperature-key-figures').textContent ?? '';
    expect(text).toContain('1981–2010 average');
    expect(text).toContain('since 2020');
  });

  it('should not call the 1991–2020 baseline pre-industrial', () => {
    render(<GlobalTemperatureKeyFigures data={TEMPERATURE_FIXTURE} />);

    const figures = screen.getByTestId('global-temperature-key-figures');
    const [first, second] = Array.from(figures.querySelectorAll('p')).map((p) => p.textContent);
    expect(first).not.toMatch(/pre-industrial/i);
    expect(second).not.toMatch(/pre-industrial/i);
  });

  it('should name both baselines in separate sentences', () => {
    render(<GlobalTemperatureKeyFigures data={TEMPERATURE_FIXTURE} />);

    const text = screen.getByTestId('global-temperature-key-figures').textContent ?? '';
    expect(text).toContain('relative to the 1991–2020 average');
    expect(text).toContain('the 1861–1890 (pre-industrial) average');
  });

  it('should render the pre-industrial figure with the latest year that has a value', () => {
    render(<GlobalTemperatureKeyFigures data={TEMPERATURE_FIXTURE} />);

    expect(screen.getByTestId('global-temperature-preindustrial-figure')).toHaveTextContent(
      'In 1853 the world was +0.50 °C warmer than the 1861–1890 (pre-industrial) average.',
    );
  });

  it('should word a non-positive pre-industrial value as relative to the baseline', () => {
    const data = {
      ...TEMPERATURE_FIXTURE,
      global: { ...TEMPERATURE_FIXTURE.global, mean: [0.1, 0.2, 0.3, -0.1, null] },
    };
    render(<GlobalTemperatureKeyFigures data={data} />);

    const text = screen.getByTestId('global-temperature-preindustrial-figure').textContent;
    expect(text).toBe(
      'In 1853 the world was \u22120.10 °C relative to the 1861–1890 (pre-industrial) average.',
    );
  });

  it('should take the pre-industrial baseline from the payload', () => {
    const data = {
      ...TEMPERATURE_FIXTURE,
      global: { ...TEMPERATURE_FIXTURE.global, baseline: { startYear: 1850, endYear: 1900 } },
    };
    render(<GlobalTemperatureKeyFigures data={data} />);

    expect(screen.getByTestId('global-temperature-preindustrial-figure')).toHaveTextContent(
      'the 1850–1900 (pre-industrial) average',
    );
  });

  it('should omit the pre-industrial figure when the global series has no value', () => {
    const data = {
      ...TEMPERATURE_FIXTURE,
      global: { ...TEMPERATURE_FIXTURE.global, mean: [null, null, null, null, null] },
    };
    render(<GlobalTemperatureKeyFigures data={data} />);

    expect(screen.queryByTestId('global-temperature-preindustrial-figure')).not.toBeInTheDocument();
  });

  it('should render nothing when there are no figures', () => {
    const { container } = render(
      <GlobalTemperatureKeyFigures data={{ ...TEMPERATURE_FIXTURE, entities: [] }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('GlobalTemperatureExplorer', () => {
  beforeEach(() => {
    chartOptions.length = 0;
  });

  it('should default to World with the baseline in the chart title', () => {
    render(<GlobalTemperatureExplorer data={TEMPERATURE_FIXTURE} />);

    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'World: annual temperature anomaly (°C, relative to the 1991–2020 average)',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Explore temperature by country',
    );
  });

  it('should have no measure toggle', () => {
    render(<GlobalTemperatureExplorer data={TEMPERATURE_FIXTURE} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Measure' })).not.toBeInTheDocument();
  });

  it('should switch the country, redraw and announce the change', () => {
    render(<GlobalTemperatureExplorer data={TEMPERATURE_FIXTURE} />);
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Argentina:');
    expect(screen.getByText('Showing temperature anomaly for Argentina')).toBeInTheDocument();
    const last = chartOptions[chartOptions.length - 1] as { series: { data: unknown[] }[] };
    expect(last.series[0].data).toEqual(temperatureEntity('ARG').anomaly);
  });

  it('should list the entity in a collapsed table with signed values and em dashes', () => {
    const { container } = render(<GlobalTemperatureExplorer data={TEMPERATURE_FIXTURE} />);
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(
      screen.getByText('Argentina: annual temperature anomaly relative to 1991–2020, 2020–2024'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { hidden: true, name: 'Anomaly (°C vs 1991–2020 average)' }),
    ).toBeInTheDocument();
    const cells = screen.getAllByRole('cell', { hidden: true }).map((cell) => cell.textContent);
    // Newest first: 2024 = 0 (no sign), 2023, 2022 = null, 2021, 2020 = negative.
    expect(cells).toEqual(['0.00', '+0.80', '—', '+0.20', '−0.45']);
  });

  it('should render the attribution slot under the chart', () => {
    render(
      <GlobalTemperatureExplorer
        data={TEMPERATURE_FIXTURE}
        attribution={<p>attribution slot</p>}
      />,
    );

    expect(screen.getByText('attribution slot')).toBeInTheDocument();
  });

  it('should never fetch or touch the URL, history or storage on interaction', () => {
    const fetchSpy = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchSpy as unknown as typeof global.fetch;
    const pushState = jest.spyOn(window.history, 'pushState');
    const replaceState = jest.spyOn(window.history, 'replaceState');
    render(<GlobalTemperatureExplorer data={TEMPERATURE_FIXTURE} />);
    const input = screen.getByRole('combobox', { name: 'Country' });

    fireEvent.change(input, { target: { value: 'arg' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(window.localStorage.length).toBe(0);
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });
});

describe('GlobalTemperatureContent', () => {
  const renderContent = () =>
    render(
      <GlobalTemperatureContent data={{ data: TEMPERATURE_FIXTURE, meta: TEMPERATURE_META }} />,
    );

  it('should render the key figures and the explorer with World selected', () => {
    renderContent();

    expect(screen.getByTestId('global-temperature-key-figures')).toHaveTextContent('In 2023');
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
  });

  it('should attribute the data to the provider from the API meta', () => {
    renderContent();

    const attribution = screen.getByTestId('global-temperature-attribution');
    expect(attribution).toHaveTextContent(/^Data:/);
    expect(within(attribution).getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
      'href',
      'https://ourworldindata.org',
    );
    expect(attribution).toHaveTextContent('(CC BY 4.0)');
    expect(attribution).not.toHaveTextContent('version 2026-10-12');
    expect(attribution).not.toHaveTextContent('Hersbach');
    expect(attribution.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-10-13T08:42:32.000Z',
    );
  });

  it('should credit Copernicus with the notice, the dataset link, the licence and the disclaimer', () => {
    renderContent();

    const credit = screen.getByTestId('global-temperature-origin');
    expect(credit).toHaveTextContent(
      'Contains modified Copernicus Climate Change Service information (2026)',
    );
    expect(
      within(credit).getByRole('link', { name: /ERA5 monthly averaged data/ }),
    ).toHaveAttribute('href', TEMPERATURE_FIXTURE.origin.url);
    expect(within(credit).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
    expect(credit).toHaveTextContent('(CC BY 4.0)');
    expect(credit).toHaveTextContent('Neither the European Commission nor ECMWF');
    expect(screen.getByTestId('global-temperature-attribution')).toContainElement(credit);
  });

  it('should link to all data sources exactly once per attribution block', () => {
    renderContent();

    for (const id of ['global-temperature-attribution', 'global-temperature-global-attribution']) {
      const links = within(screen.getByTestId(id)).getAllByRole('link', {
        name: 'All data sources',
      });
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', '/data-sources');
    }
  });

  it('should state the four methodology points', () => {
    renderContent();

    const note = screen.getByTestId('global-temperature-methodology');
    expect(note).toHaveTextContent(/how far a year.s average surface/);
    expect(note).toHaveTextContent('1991–2020 baseline period for the same place');
    expect(note).toHaveTextContent('not warming since pre-industrial times');
    expect(note).toHaveTextContent('land inside the borders only');
    expect(note).toHaveTextContent('land and ocean');
    expect(note).toHaveTextContent('Very small countries are less reliable');
  });

  it('should render exactly one schema.org Dataset block', () => {
    const { container } = renderContent();

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].textContent ?? '')['@type']).toBe('Dataset');
  });
});

describe('GlobalTemperatureLongRun section', () => {
  const renderContent = () =>
    render(
      <GlobalTemperatureContent data={{ data: TEMPERATURE_FIXTURE, meta: TEMPERATURE_META }} />,
    );

  it('should render a second h2 naming the series and the baseline, with no combobox inside', () => {
    renderContent();

    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Global temperature since 1850, relative to 1861–1890',
    });
    const section = heading.closest('section') as HTMLElement;
    expect(within(section).queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it('should pass a chart option with the band and both reference lines to the lazy chart', () => {
    chartOptions.length = 0;
    renderContent();

    const long = chartOptions.find(
      (option) => (option as { series: unknown[] }).series.length === 3,
    ) as { series: { markLine?: { data: unknown[] } }[] };
    expect(long.series[2].markLine?.data).toHaveLength(2);
  });

  it('should have its own collapsed table, newest year first, with signed bounds and dashes', () => {
    const { container } = renderContent();

    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(2);
    const table = within(details[1] as HTMLElement).getByRole('table', { hidden: true });
    expect(
      within(table).getByRole('columnheader', { hidden: true, name: 'Mean (°C vs 1861–1890)' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { hidden: true, name: 'Lower bound (95%)' }),
    ).toBeInTheDocument();
    const rows = within(table).getAllByRole('row', { hidden: true });
    // Newest first: 1854 has no value in the fixture, 1853 is the latest year with one.
    expect(rows[1].textContent).toBe('1854———');
    expect(rows[2].textContent).toBe('1853+0.50+0.40+0.60');
    expect(details[1]).not.toHaveAttribute('open');
  });

  it('should credit OWID, the HadCRUT5 dataset version and the Met Office origin', () => {
    renderContent();

    const attribution = screen.getByTestId('global-temperature-global-attribution');
    expect(attribution).toHaveTextContent('Data: Our World in Data (CC BY 4.0)');
    expect(attribution).not.toHaveTextContent('version 2026-10-12');
    const credit = screen.getByTestId('global-temperature-global-origin');
    expect(within(credit).getByRole('link', { name: 'HadCRUT5' })).toHaveAttribute(
      'href',
      'https://www.metoffice.gov.uk/hadobs/hadcrut5/',
    );
    expect(
      within(credit).getByRole('link', { name: 'Open Government Licence v3.0' }),
    ).toHaveAttribute(
      'href',
      'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    );
    expect(credit).toHaveTextContent('© British Crown Copyright, Met Office');
    expect(credit).not.toHaveTextContent('Morice et al. (2021)');
  });

  it('should explain that single years above 1.5 °C do not breach the long-term limit', () => {
    renderContent();

    expect(screen.getByTestId('global-temperature-paris-note')).toHaveTextContent(
      'single year above 1.5 °C does not by itself mean the limit has been breached',
    );
  });

  it('should point the country methodology note to the section below', () => {
    renderContent();

    expect(screen.getByTestId('global-temperature-methodology')).toHaveTextContent(
      'the pre-industrial figures are in the section below',
    );
  });
});
