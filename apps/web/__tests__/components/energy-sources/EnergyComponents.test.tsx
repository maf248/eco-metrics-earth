import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { EnergyDonut } from '@/components/energy-sources/EnergyDonut';
import { EnergyExplorer } from '@/components/energy-sources/EnergyExplorer';
import { EnergyKeyFigures } from '@/components/energy-sources/EnergyKeyFigures';
import { EnergyLatestTable } from '@/components/energy-sources/EnergyLatestTable';
import { EnergySourcesContent } from '@/components/energy-sources/EnergySourcesContent';
import { EnergyYearTable } from '@/components/energy-sources/EnergyYearTable';

import {
  ENERGY_FIXTURE,
  ENERGY_META,
  energyEntity,
  entityWith,
} from '../../fixtures/energySources';

const areaCalls: { option: Record<string, unknown>; palette?: string }[] = [];
const pieCalls: { option: Record<string, unknown>; palette?: string }[] = [];

jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option, palette }: { option: Record<string, unknown>; palette?: string }) => {
    areaCalls.push({ option, palette });
    return <div data-testid="chart-stub" />;
  },
}));

jest.mock('@/components/charts/LazyPieEChart', () => ({
  LazyPieEChart: ({ option, palette }: { option: Record<string, unknown>; palette?: string }) => {
    pieCalls.push({ option, palette });
    return <div data-testid="pie-stub" />;
  },
}));

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

describe('energy sources components', () => {
  const originalObserver = global.IntersectionObserver;
  let intersect: ObserverCallback | undefined;

  beforeEach(() => {
    areaCalls.length = 0;
    pieCalls.length = 0;
    intersect = undefined;
    global.IntersectionObserver = class {
      constructor(cb: ObserverCallback) {
        intersect = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    global.IntersectionObserver = originalObserver;
  });

  const scrollIntoView = () => act(() => intersect?.([{ isIntersecting: true }]));

  describe('EnergyKeyFigures', () => {
    it('should state the renewables share and the largest source of the latest World year', () => {
      render(<EnergyKeyFigures data={ENERGY_FIXTURE} />);

      const figures = screen.getByTestId('energy-key-figures');
      expect(figures).toHaveTextContent(
        "In 2025, renewables generated 33.8% of the world's electricity.",
      );
      expect(figures).toHaveTextContent('The largest single source was coal, at 33.0%.');
    });

    it('should contain exactly two figures', () => {
      render(<EnergyKeyFigures data={ENERGY_FIXTURE} />);

      const figures = screen.getByTestId('energy-key-figures');
      expect(figures.querySelectorAll('strong')).toHaveLength(2);
      expect(figures.textContent?.match(/\d+\.\d%/g)).toHaveLength(2);
    });

    it('should use the latest year with generation when the last year is empty', () => {
      const world = entityWith({
        coal: [60, 70, null],
        gas: [40, 20, null],
        hydro: [0, 10, null],
      });
      render(
        <EnergyKeyFigures
          data={{
            startYear: 2023,
            entities: [{ code: 'OWID_WRL', iso2: null, name: 'World', ...world }],
          }}
        />,
      );

      expect(screen.getByTestId('energy-key-figures')).toHaveTextContent(
        'In 2024, renewables generated 10.0%',
      );
      expect(screen.getByTestId('energy-key-figures')).toHaveTextContent('coal, at 70.0%');
    });

    it('should name the combined source in lower case', () => {
      const world = entityWith({ bioenergyOther: [5], coal: [1] });
      render(
        <EnergyKeyFigures
          data={{
            startYear: 2023,
            entities: [{ code: 'OWID_WRL', iso2: null, name: 'World', ...world }],
          }}
        />,
      );

      expect(screen.getByTestId('energy-key-figures')).toHaveTextContent(
        'bioenergy & other renewables, at 83.3%',
      );
    });

    it('should not fabricate a renewables share when no renewable has generation', () => {
      const { container } = render(
        <EnergyKeyFigures
          data={{
            startYear: 2023,
            entities: [
              {
                code: 'OWID_WRL',
                iso2: null,
                name: 'World',
                ...entityWith({ coal: [60], gas: [40] }),
              },
            ],
          }}
        />,
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('should render nothing without World or without generation', () => {
      const { container, rerender } = render(
        <EnergyKeyFigures data={{ startYear: 2023, entities: [] }} />,
      );
      expect(container).toBeEmptyDOMElement();

      rerender(
        <EnergyKeyFigures
          data={{
            startYear: 2023,
            entities: [
              { code: 'OWID_WRL', iso2: null, name: 'World', ...entityWith({ coal: [null] }) },
            ],
          }}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('EnergyYearTable', () => {
    const renderTable = (metric: 'share' | 'generation', code = 'OWID_WRL') =>
      render(<EnergyYearTable entity={energyEntity(code)} data={ENERGY_FIXTURE} metric={metric} />);

    it('should be a collapsed, labelled wide table with nine headers', () => {
      const { container } = renderTable('share');

      expect(container.querySelector('details')).not.toHaveAttribute('open');
      expect(
        screen.getByRole('region', { hidden: true, name: 'Data table for World, scrollable' }),
      ).toHaveAttribute('tabindex', '0');
      const headers = screen
        .getAllByRole('columnheader', { hidden: true })
        .map((header) => header.textContent);
      expect(headers).toEqual([
        'Year',
        'Coal (%)',
        'Gas (%)',
        'Oil (%)',
        'Nuclear (%)',
        'Hydro (%)',
        'Wind (%)',
        'Solar (%)',
        'Bioenergy & other renewables (%)',
      ]);
      expect(container.querySelector('table')).toHaveClass('min-w-3xl');
    });

    it('should show generation with TWh headers when the measure is generation', () => {
      renderTable('generation');

      expect(
        screen.getByRole('columnheader', { hidden: true, name: 'Coal (TWh)' }),
      ).toBeInTheDocument();
      expect(screen.getAllByText('10,472').length).toBeGreaterThan(0);
    });

    it('should list years newest first with em dashes for missing values', () => {
      renderTable('share', 'BIH');

      const rows = screen.getAllByRole('row', { hidden: true });
      expect(within(rows[1]).getByRole('rowheader', { hidden: true })).toHaveTextContent('2025');
      expect(within(rows[1]).getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  describe('EnergyLatestTable', () => {
    it('should list eight sources with share and generation in a captioned visible table', () => {
      render(<EnergyLatestTable entity={energyEntity('OWID_WRL')} data={ENERGY_FIXTURE} />);

      expect(screen.getByText('World: electricity mix in 2025')).toBeInTheDocument();
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(8);
      expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Coal');
      expect(rows[0]).toHaveTextContent('33.0');
      expect(rows[0]).toHaveTextContent('10,472');
      for (const header of screen.getAllByRole('columnheader')) {
        expect(header).toHaveAttribute('scope', 'col');
      }
    });

    it('should show em dashes where a source has no value', () => {
      render(<EnergyLatestTable entity={energyEntity('BIH')} data={ENERGY_FIXTURE} />);

      const nuclear = screen.getByRole('rowheader', { name: 'Nuclear' }).closest('tr');
      expect(within(nuclear as HTMLElement).getAllByText('—')).toHaveLength(2);
    });

    it("should use the entity's own latest year", () => {
      render(<EnergyLatestTable entity={energyEntity('DZA')} data={ENERGY_FIXTURE} />);

      expect(screen.getByText('Algeria: electricity mix in 2024')).toBeInTheDocument();
    });

    it('should render nothing for an entity without generation', () => {
      const { container } = render(
        <EnergyLatestTable
          entity={{ code: 'XXX', iso2: null, name: 'Nowhere', ...entityWith({ coal: [null] }) }}
          data={ENERGY_FIXTURE}
        />,
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('EnergyDonut', () => {
    it('should name the latest year of the selected entity, not the payload end year', () => {
      render(<EnergyDonut entity={energyEntity('DZA')} data={ENERGY_FIXTURE} />);

      expect(
        screen.getByRole('heading', { level: 3, name: 'Algeria: electricity mix in 2024' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Algeria in 2024');
    });

    it('should show a skeleton until it scrolls into view, then mount the pie with the palette', () => {
      render(<EnergyDonut entity={energyEntity('OWID_WRL')} data={ENERGY_FIXTURE} />);

      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('pie-stub')).not.toBeInTheDocument();

      scrollIntoView();

      expect(screen.getByTestId('pie-stub')).toBeInTheDocument();
      expect(pieCalls[0].palette).toBe('energyMix');
      expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
    });

    it('should render nothing for an entity without generation', () => {
      const { container } = render(
        <EnergyDonut
          entity={{ code: 'XXX', iso2: null, name: 'Nowhere', ...entityWith({ coal: [null] }) }}
          data={ENERGY_FIXTURE}
        />,
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('EnergyExplorer', () => {
    const select = (name: string) => {
      const input = screen.getByRole('combobox', { name: 'Country' });
      fireEvent.change(input, { target: { value: name } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    it('should default to World and share, with the energy palette and a live announcement', () => {
      render(<EnergyExplorer data={ENERGY_FIXTURE} />);

      expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
      expect(screen.getByRole('radio', { name: 'Share (%)' })).toBeChecked();
      expect(
        screen.getByRole('heading', {
          level: 3,
          name: 'World: share of electricity by source (%)',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Showing share of electricity by source for World'),
      ).toBeInTheDocument();
      expect(areaCalls[0].palette).toBe('energyMix');
    });

    it('should rebuild title, axis and table headers when the measure changes, without a request', () => {
      const fetchSpy = jest.fn();
      const originalFetch = global.fetch;
      global.fetch = fetchSpy as unknown as typeof global.fetch;
      render(<EnergyExplorer data={ENERGY_FIXTURE} />);

      fireEvent.click(screen.getByRole('radio', { name: 'Generation (TWh)' }));

      expect(
        screen.getByRole('heading', {
          level: 3,
          name: 'World: electricity generation by source (TWh)',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Showing electricity generation by source for World'),
      ).toBeInTheDocument();
      const last = areaCalls[areaCalls.length - 1].option as { yAxis: { max?: number | null } };
      expect(last.yAxis.max).toBeNull();
      expect(
        screen.getByRole('columnheader', { hidden: true, name: 'Coal (TWh)' }),
      ).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
      global.fetch = originalFetch;
    });

    it('should update the chart title, donut and both tables when another country is selected', () => {
      render(<EnergyExplorer data={ENERGY_FIXTURE} />);

      select('alg');

      expect(
        screen.getByRole('heading', {
          level: 3,
          name: 'Algeria: share of electricity by source (%)',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Algeria: electricity mix in 2024', { selector: 'h3' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Algeria: electricity mix in 2024', { selector: 'caption' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { hidden: true, name: 'Data table for Algeria, scrollable' }),
      ).toBeInTheDocument();
    });

    it('should not touch the URL or history on interaction', () => {
      const pushState = jest.spyOn(window.history, 'pushState');
      const replaceState = jest.spyOn(window.history, 'replaceState');
      render(<EnergyExplorer data={ENERGY_FIXTURE} />);

      select('arg');
      fireEvent.click(screen.getByRole('radio', { name: 'Generation (TWh)' }));

      expect(pushState).not.toHaveBeenCalled();
      expect(replaceState).not.toHaveBeenCalled();
      pushState.mockRestore();
      replaceState.mockRestore();
    });
  });

  describe('EnergySourcesContent', () => {
    const renderContent = (data = ENERGY_FIXTURE) =>
      render(<EnergySourcesContent data={{ data, meta: ENERGY_META }} />);

    it('should render the key figures, the explorer and one Dataset JSON-LD block', () => {
      const { container } = renderContent();

      expect(screen.getByTestId('energy-key-figures')).toHaveTextContent('In 2025');
      expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('World');
      expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    });

    it('should attribute the data to OWID from the meta and credit Ember from the payload', () => {
      renderContent();

      const attribution = screen.getByTestId('energy-attribution');
      expect(within(attribution).getByRole('link', { name: 'Our World in Data' })).toHaveAttribute(
        'href',
        'https://ourworldindata.org',
      );
      expect(attribution).toHaveTextContent('(CC BY 4.0)');
      expect(within(attribution).getByRole('link', { name: 'All data sources' })).toHaveAttribute(
        'href',
        '/data-sources',
      );
      const origin = screen.getByTestId('energy-origin');
      expect(origin).toHaveTextContent('Ember');
      expect(within(origin).getByRole('link', { name: 'Yearly Electricity Data' })).toHaveAttribute(
        'href',
        'https://ember-energy.org/data/yearly-electricity-data/',
      );
      expect(within(origin).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
        'href',
        'https://ember-energy.org/creative-commons/',
      );
    });

    it('should show a producer changed in the payload', () => {
      renderContent({
        ...ENERGY_FIXTURE,
        origin: { ...ENERGY_FIXTURE.origin, producer: 'Someone Else' },
      });

      expect(screen.getByTestId('energy-origin')).toHaveTextContent('Someone Else');
    });

    it('should explain electricity only, the grouping and the start year in the footnote', () => {
      renderContent();

      const note = screen.getByTestId('energy-methodology');
      expect(note).toHaveTextContent('electricity generation only, not total (primary) energy');
      expect(note).toHaveTextContent('geothermal, wave and tidal');
      expect(note).toHaveTextContent('starts in 2023');
      expect(note).toHaveTextContent('blank value means the source reported no generation');
    });
  });
});
