import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

import { WasteComparison } from '@/components/waste-recycling/WasteComparison';
import { WasteCountryTable } from '@/components/waste-recycling/WasteCountryTable';
import { WasteKeyFigures } from '@/components/waste-recycling/WasteKeyFigures';
import { WasteProjectionChart } from '@/components/waste-recycling/WasteProjectionChart';
import { WasteRecyclingContent } from '@/components/waste-recycling/WasteRecyclingContent';
import { WasteWorldMap } from '@/components/waste-recycling/WasteWorldMap';
import type { WasteMeasure, WasteSort } from '@/lib/wasteMeasures';
import type { WorldRegion } from '@/lib/worldGeometry';

import {
  WASTE_COUNTRIES,
  WASTE_FIXTURE,
  WASTE_META,
  wasteCountry,
} from '../../fixtures/wasteRecycling';

const REGIONS: WorldRegion[] = [
  { key: 'DEU', code: 'DEU', name: 'Germany' },
  { key: 'CHN', code: 'CHN', name: 'China' },
  { key: 'BRA', code: 'BRA', name: 'Brazil' },
  { key: 'ARG', code: 'ARG', name: 'Argentina' },
];

interface MapItem {
  name: string;
  value: number;
}
interface BarOption {
  yAxis: { data: string[] };
}

const barOptions: BarOption[] = [];

jest.mock('@/components/charts/ChoroplethMap', () => ({
  ChoroplethMap: ({
    buildOption,
    onRegionClick,
    ramp,
  }: {
    buildOption: (regions: readonly WorldRegion[]) => {
      series: { data: (MapItem & { selected?: boolean })[] }[];
    };
    onRegionClick: (code: string) => void;
    ramp?: string;
  }) => {
    const data = buildOption(REGIONS).series[0].data;
    return (
      <div
        data-testid="map-stub"
        data-ramp={ramp}
        data-selected={data
          .filter((item) => item.selected)
          .map((item) => item.name)
          .join(',')}
        data-values={data.map((item) => `${item.name}=${item.value}`).join(',')}
      >
        <button type="button" onClick={() => onRegionClick('DEU')}>
          Map region DEU
        </button>
      </div>
    );
  },
}));
jest.mock('@/components/charts/LazyBarEChart', () => ({
  LazyBarEChart: ({ option, palette }: { option: BarOption; palette: string }) => {
    barOptions.push(option);
    return <div data-testid="bars-stub" data-palette={palette} />;
  },
}));
jest.mock('@/components/charts/LazyEChart', () => ({
  LazyEChart: ({ option }: { option: unknown }) => (
    <div data-testid="line-stub" data-option={JSON.stringify(option)} />
  ),
}));

describe('WasteKeyFigures', () => {
  it('should state the 2022 total, the 2050 projection and the recycling coverage', () => {
    render(<WasteKeyFigures data={WASTE_FIXTURE} />);

    const text = screen.getByTestId('waste-key-figures').textContent;
    expect(text).toContain('2.33 billion tonnes');
    expect(text).toContain('0.80 kg');
    expect(text).toContain('3.49 billion tonnes');
    expect(text).toContain('Among the 130 countries that report recycling');
    expect(text).toContain('about 46% of the world');
    // The exact values are 46.47 and 17.63: each is rounded once, here.
    expect(text).toContain('about 18%');
  });
});

describe('WasteWorldMap', () => {
  it('should open on share recycled, with China as no data', () => {
    render(<WasteWorldMap countries={WASTE_COUNTRIES} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Share of municipal waste recycled' }),
    ).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Recycled' })).toBeChecked();
    expect(screen.getByTestId('map-stub')).toHaveAttribute(
      'data-values',
      'DEU=47,CHN=NaN,BRA=1.6,ARG=NaN',
    );
    expect(screen.getByRole('list', { name: 'Legend: share of waste recycled' })).toBeVisible();
  });

  it('should color the recycling measures with the good-is-high ramp and the others with heat', () => {
    render(<WasteWorldMap countries={WASTE_COUNTRIES} />);
    const swatches = (): (string | null)[] =>
      [...document.querySelectorAll('[data-token]')].map((el) => el.getAttribute('data-token'));
    const ramps: Record<string, string> = {
      Recycled: 'good',
      'Recycled or composted': 'good',
      Uncollected: 'heat',
      'Per person': 'heat',
    };

    for (const [label, ramp] of Object.entries(ramps)) {
      fireEvent.click(screen.getByRole('radio', { name: label }));
      expect(screen.getByTestId('map-stub')).toHaveAttribute('data-ramp', ramp);
      expect(swatches()[0]).toBe(ramp === 'good' ? 'chart-seq-good-1' : 'chart-seq-1');
    }
  });

  it('should share the selected country between the map and the table', () => {
    render(<WasteWorldMap countries={WASTE_COUNTRIES} />);

    fireEvent.click(screen.getByRole('button', { name: 'Map region DEU' }));
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', 'DEU');
    expect(screen.getByRole('button', { name: 'Germany' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Brazil' }));
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', 'BRA');
  });

  it('should clear a selection that has no value in the newly chosen measure', () => {
    render(<WasteWorldMap countries={WASTE_COUNTRIES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Germany' }));
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', 'DEU');

    fireEvent.click(screen.getByRole('radio', { name: 'Recycled or composted' }));
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', 'DEU');

    fireEvent.click(screen.getByRole('radio', { name: 'Uncollected' }));
    expect(screen.getByTestId('map-stub')).toHaveAttribute('data-selected', '');
  });

  it('should follow the selected measure in the table sort until a header says otherwise', () => {
    render(<WasteWorldMap countries={WASTE_COUNTRIES} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Per person' }));

    expect(screen.getByRole('button', { name: /^Per person/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('should switch to waste per person, colouring every country', () => {
    render(<WasteWorldMap countries={WASTE_COUNTRIES} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Per person' }));

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('per person per day');
    expect(screen.getByTestId('map-stub')).toHaveAttribute(
      'data-values',
      'DEU=1.63,CHN=0.97,BRA=1.07,ARG=1.17',
    );
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(
      'Showing Municipal waste per person',
    );
  });
});

function TableHarness({
  mapMeasure = 'recycled',
  initial = { measure: 'recycled', order: 'descending' },
}: {
  mapMeasure?: WasteMeasure;
  initial?: WasteSort;
}) {
  const [sort, setSort] = useState<WasteSort>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <WasteCountryTable
      countries={WASTE_COUNTRIES}
      mapMeasure={mapMeasure}
      sort={sort}
      onSortChange={setSort}
      selectedCode={selected}
      onSelect={(code) => setSelected((current) => (current === code ? null : code))}
    />
  );
}

describe('WasteCountryTable', () => {
  const rowNames = (): (string | null)[] =>
    within(screen.getByTestId('waste-country-region'))
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);

  it('should sort by the selected measure, countries without it last and unranked', () => {
    render(<TableHarness />);

    expect(rowNames().slice(0, 2)).toEqual(['Germany', 'Brazil']);
    expect(rowNames().slice(2)).toEqual(['Argentina', 'China', 'India', 'Nigeria', 'Tuvalu']);
    expect(screen.getByRole('row', { name: /Germany/ }).firstElementChild).toHaveTextContent('1');
    expect(screen.getByRole('row', { name: /Brazil/ }).firstElementChild).toHaveTextContent('2');
    expect(screen.getByRole('row', { name: /China/ }).firstElementChild).toHaveTextContent('—');
  });

  it('should mark the sorted column with aria-sort and reverse it on a second press', () => {
    render(<TableHarness />);
    const header = screen.getByRole('button', { name: /^Recycled\s*,/ }).closest('th');
    expect(header).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(screen.getByRole('button', { name: /^Recycled\s*,/ }));

    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(rowNames().slice(0, 2)).toEqual(['Brazil', 'Germany']);
    expect(rowNames().slice(2)).toEqual(['Argentina', 'China', 'India', 'Nigeria', 'Tuvalu']);
    expect(screen.getByRole('row', { name: /Germany/ }).firstElementChild).toHaveTextContent('1');
  });

  it('should separate the label from the sort hint of an inactive header', () => {
    render(<TableHarness />);

    const inactive = screen.getByRole('button', { name: /^Per person/ });
    expect(inactive).toHaveAccessibleName('Per person . Sort highest first');
    expect(screen.getByRole('button', { name: /^Recycled\s*,/ })).toHaveAccessibleName(
      'Recycled , highest first. Sort lowest first',
    );
  });

  it('should sort by another column highest first when its header is pressed', () => {
    render(<TableHarness />);

    fireEvent.click(screen.getByRole('button', { name: /^Per person/ }));

    expect(rowNames().slice(0, 3)).toEqual(['Germany', 'Argentina', 'Brazil']);
    expect(screen.getByRole('button', { name: /^Per person/ }).closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('should give equal values the same competition rank', () => {
    render(<TableHarness initial={{ measure: 'uncollected', order: 'descending' }} />);

    const ranks = ['Brazil', 'India', 'China'].map(
      (name) => screen.getByRole('row', { name: new RegExp(name) }).firstElementChild?.textContent,
    );
    expect(ranks).toEqual(['1', '2', '3']);
  });

  it('should show a flag beside each country that has one, and none for the others', () => {
    const channel = { ...wasteCountry('DEU'), code: 'CHI', iso2: null, name: 'Channel Islands' };
    const { container } = render(
      <WasteCountryTable
        countries={[wasteCountry('DEU'), channel]}
        mapMeasure="recycled"
        sort={{ measure: 'recycled', order: 'descending' }}
        onSortChange={jest.fn()}
        selectedCode={null}
        onSelect={jest.fn()}
      />,
    );

    const flags = (name: string): number =>
      screen.getByRole('rowheader', { name }).querySelectorAll('.fi, svg').length;
    expect(container.querySelectorAll('.fi')).toHaveLength(1);
    expect(flags('Germany')).toBe(1);
    expect(flags('Channel Islands')).toBe(0);
    expect(
      screen
        .getByRole('rowheader', { name: 'Channel Islands' })
        .querySelector('.w-\\[1\\.3333rem\\]'),
    ).toBeInTheDocument();
  });

  it('should select a country that has a map value, and clear it on a second press', () => {
    render(<TableHarness />);

    const button = screen.getByRole('button', { name: 'Germany' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.closest('tr')).toHaveClass('bg-well');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('should offer no selection for a country that does not report the map measure', () => {
    render(<TableHarness />);

    expect(screen.queryByRole('button', { name: 'China' })).not.toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'China' })).toBeInTheDocument();
  });

  it('should show a dash for what is not reported and name the unreported part', () => {
    render(<TableHarness />);

    const china = screen.getByRole('row', { name: /China/ });
    expect(within(china).getAllByText('—')).toHaveLength(3);
    const brazil = screen.getByRole('row', { name: /Brazil/ });
    expect(brazil).toHaveTextContent('Composting is not reported');
    expect(brazil).toHaveTextContent('2022 estimate');
  });

  it('should show the Brazil recycling share and name composting as not reported', () => {
    render(<TableHarness mapMeasure="recycledOrComposted" />);

    const brazil = screen.getByRole('row', { name: /Brazil/ });
    expect(brazil).toHaveTextContent('1.6%');
    expect(brazil).toHaveTextContent('Composting is not reported');
  });

  it('should list only the matching country when searching, keeping its rank', () => {
    render(<TableHarness />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search countries in the table' }), {
      target: { value: 'bra' },
    });

    expect(rowNames()).toEqual(['Brazil']);
    expect(screen.getByRole('row', { name: /Brazil/ }).firstElementChild).toHaveTextContent('2');
    expect(screen.getByRole('status')).toHaveTextContent('1 country listed');
  });

  it('should say when nothing matches', () => {
    render(<TableHarness />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

    expect(screen.getByText('No countries found')).toBeInTheDocument();
  });
});

describe('WasteComparison', () => {
  beforeEach(() => {
    barOptions.length = 0;
  });

  const lastTreatmentRows = (): string[] => barOptions[barOptions.length - 2].yAxis.data;

  it('should start with the most populous countries that report treatment', () => {
    render(<WasteComparison countries={WASTE_COUNTRIES} />);

    expect(lastTreatmentRows()).toEqual(['China', 'India', 'Brazil', 'Germany', 'Argentina']);
    expect(screen.getAllByTestId('bars-stub').map((el) => el.dataset.palette)).toEqual([
      'wasteTreatment',
      'wasteComposition',
    ]);
  });

  it('should list a selected country without composition below the chart', () => {
    render(<WasteComparison countries={WASTE_COUNTRIES} />);
    expect(screen.queryByTestId('waste-no-composition')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Germany' }));
    expect(lastTreatmentRows()).not.toContain('Germany');
  });

  it('should draw the composition bars for each default country that has composition data', () => {
    render(<WasteComparison countries={WASTE_COUNTRIES} />);

    const composition = barOptions[barOptions.length - 1];
    expect(composition.yAxis.data).toEqual(['China', 'India', 'Brazil', 'Germany', 'Argentina']);
  });

  it('should name a selected country without composition data instead of omitting it', () => {
    const testland = {
      ...wasteCountry('ARG'),
      code: 'XTL',
      iso2: null,
      name: 'Testland',
      population: 2_000_000_000,
      composition: undefined,
    };
    render(<WasteComparison countries={[...WASTE_COUNTRIES, testland]} />);

    expect(screen.getByTestId('waste-no-composition')).toHaveTextContent(
      'No composition data: Testland.',
    );
    const composition = barOptions[barOptions.length - 1];
    expect(composition.yAxis.data).not.toContain('Testland');
  });

  it('should add a country from the search and remove it again by choosing it', () => {
    render(<WasteComparison countries={WASTE_COUNTRIES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Germany' }));

    const input = screen.getByRole('combobox', { name: 'Add or remove a country' });
    fireEvent.change(input, { target: { value: 'germ' } });
    fireEvent.click(screen.getByRole('option', { name: /Germany/ }));

    expect(lastTreatmentRows()).toContain('Germany');
  });

  it('should offer only countries with treatment data', () => {
    render(<WasteComparison countries={WASTE_COUNTRIES} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'nig' } });

    expect(screen.queryByRole('option', { name: /Nigeria/ })).not.toBeInTheDocument();
  });

  describe('at the maximum', () => {
    const clones = Array.from({ length: 12 }, (_, index) => ({
      ...wasteCountry('DEU'),
      code: `C${String(index).padStart(2, '0')}`,
      name: `Cloneland ${String(index).padStart(2, '0')}`,
      population: 2_000_000_000 - index,
    }));
    const many = [...WASTE_COUNTRIES, ...clones];
    const chips = (): HTMLElement[] =>
      within(screen.getByRole('list', { name: 'Selected countries' })).getAllByRole('listitem');

    const fillToTen = (): void => {
      for (let index = 0; index < 5; index += 1) {
        const input = screen.getByRole('combobox');
        fireEvent.change(input, {
          target: { value: `Cloneland ${String(index + 5).padStart(2, '0')}` },
        });
        fireEvent.click(screen.getByRole('option', { name: /Cloneland/ }));
      }
    };

    it('should start with five, leaving the search available', () => {
      render(<WasteComparison countries={many} />);

      expect(chips()).toHaveLength(5);
      const input = screen.getByRole('combobox', { name: 'Add or remove a country' });
      expect(input).not.toHaveAttribute('aria-disabled');
      expect(input).not.toHaveAttribute('readonly');
      expect(input).toHaveAttribute('placeholder', 'Search countries');
      expect(screen.getByText(/Compare up to 10 countries/)).toHaveTextContent(
        'The five most populous ones that report what happens to their waste come first.',
      );
    });

    it('should make the search unavailable at ten and say why in the field', () => {
      render(<WasteComparison countries={many} />);
      fillToTen();

      expect(chips()).toHaveLength(10);
      const input = screen.getByRole('combobox', { name: 'Add or remove a country' });
      expect(input).toHaveAttribute('aria-disabled', 'true');
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveAttribute('placeholder', 'Limit of 10 reached');
      expect(input).toHaveAttribute('aria-describedby', 'waste-comparison-limit');
      expect(document.getElementById('waste-comparison-limit')).toHaveTextContent(
        'Up to 10 countries. Remove one to add another.',
      );
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
      // One live region announces the count and the full limit sentence.
      const announcing = screen
        .getAllByRole('status')
        .filter(({ textContent }) => textContent?.includes('Up to 10'));
      expect(announcing).toHaveLength(1);
      expect(announcing[0]).toHaveTextContent(
        'Comparing 10 countries. Up to 10 countries. Remove one to add another.',
      );
    });

    it('should not open the list or change the selection at ten', () => {
      render(<WasteComparison countries={many} />);
      fillToTen();
      const input = screen.getByRole('combobox');

      fireEvent.click(input);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.change(input, { target: { value: 'Cloneland 11' } });

      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      expect(screen.queryByText('No countries found')).not.toBeInTheDocument();
      expect(chips()).toHaveLength(10);
    });

    it('should let one be removed, which makes the search available again', () => {
      render(<WasteComparison countries={many} />);
      fillToTen();

      fireEvent.click(screen.getByRole('button', { name: 'Remove Cloneland 00' }));
      const input = screen.getByRole('combobox');
      expect(input).not.toHaveAttribute('aria-disabled');
      expect(input).not.toHaveAttribute('aria-describedby');
      expect(document.getElementById('waste-comparison-limit')).toBeNull();
      expect(input).toHaveAttribute('placeholder', 'Search countries');

      fireEvent.change(input, { target: { value: 'Cloneland 11' } });
      fireEvent.click(screen.getByRole('option', { name: /Cloneland 11/ }));

      expect(chips()).toHaveLength(10);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should keep compact chips whose remove buttons have a 44 px touch target', () => {
      render(<WasteComparison countries={many} />);

      expect(chips()[0]).toHaveClass('h-8');
      const remove = screen.getAllByRole('button', { name: /^Remove / })[0];
      expect(remove).toHaveClass('size-7', 'before:-inset-2');
    });

    describe('focus after removing a chip', () => {
      const removeButton = (name: string): HTMLElement =>
        screen.getByRole('button', { name: `Remove ${name}` });

      it('should move to the next chip, or the previous one for the last', () => {
        render(<WasteComparison countries={many} />);

        fireEvent.click(removeButton('Cloneland 02'));
        expect(removeButton('Cloneland 03')).toHaveFocus();

        fireEvent.click(removeButton('Cloneland 04'));
        expect(removeButton('Cloneland 03')).toHaveFocus();
      });

      it('should move to the search when the only chip is removed', () => {
        render(<WasteComparison countries={many} />);
        for (const index of [1, 2, 3, 4]) {
          fireEvent.click(removeButton(`Cloneland 0${index}`));
        }

        fireEvent.click(removeButton('Cloneland 00'));

        expect(screen.getByRole('combobox')).toHaveFocus();
      });
    });
  });

  it('should ask to select a country once all are removed', () => {
    render(<WasteComparison countries={WASTE_COUNTRIES} />);

    for (const { name } of WASTE_COUNTRIES.filter(({ treatment }) => treatment)) {
      fireEvent.click(screen.getByRole('button', { name: `Remove ${name}` }));
    }

    expect(screen.getByText('Select a country to compare.')).toBeInTheDocument();
  });
});

describe('WasteProjectionChart', () => {
  const chartOption = (): { series: { name: string; data: number[] }[] } =>
    JSON.parse(screen.getByTestId('line-stub').getAttribute('data-option') ?? '{}');

  it('should chart the world from 2.33 to 3.49 billion tonnes and say 2030 to 2050 are projections', () => {
    render(
      <WasteProjectionChart world={WASTE_FIXTURE.world.generation} countries={WASTE_COUNTRIES} />,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'World: municipal waste generated (billion tonnes)',
    );
    expect(screen.getByText(/2030, 2040 and 2050 are World Bank projections/)).toBeVisible();
    const [first, , , last] = chartOption().series[0].data;
    expect(first).toBeCloseTo(2.33, 2);
    expect(last).toBeCloseTo(3.49, 2);
    const table = screen.getByRole('table', { name: 'World: municipal waste generated' });
    expect(within(table).getByRole('rowheader', { name: '2050 (projection)' })).toBeInTheDocument();
    expect(within(table).getByText('3.49')).toBeInTheDocument();
  });

  it('should chart a chosen country in its own unit', () => {
    render(
      <WasteProjectionChart world={WASTE_FIXTURE.world.generation} countries={WASTE_COUNTRIES} />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Country or world' }), {
      target: { value: 'germ' },
    });
    fireEvent.click(screen.getByRole('option', { name: /Germany/ }));

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Germany: municipal waste generated (million tonnes)',
    );
    expect(chartOption().series[0].name).toBe('Germany');
  });
});

describe('WasteRecyclingContent', () => {
  it('should embed one Dataset and credit the World Bank with its license and date', () => {
    const { container } = render(
      <WasteRecyclingContent data={{ data: WASTE_FIXTURE, meta: WASTE_META }} />,
    );

    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].textContent ?? '{}')).toMatchObject({
      '@type': 'Dataset',
      creator: { name: 'World Bank' },
    });
    const attribution = screen.getByTestId('waste-attribution');
    expect(attribution).toHaveTextContent('World Bank (CC BY 4.0)');
    expect(attribution).toHaveTextContent('Mar 11, 2026');
    expect(screen.getByTestId('waste-key-figures')).toBeVisible();
    expect(screen.getByTestId('waste-methodology')).toHaveTextContent('own data year');
    expect(screen.getByTestId('waste-methodology')).toHaveTextContent('never as 0');
    expect(screen.getByTestId('waste-methodology').textContent?.length).toBeLessThan(280);
  });
});
