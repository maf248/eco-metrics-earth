import {
  buildCo2MapOption,
  CO2_MAP_CLASS_BREAKS,
  CO2_MAP_CLASS_LABELS,
  formatCo2MapTooltip,
} from '@/lib/co2MapOption';
import { WORLD_MAP_NAME, WORLD_MAP_NAME_PROPERTY, type WorldRegion } from '@/lib/worldGeometry';

import { CO2_FIXTURE } from '../fixtures/co2Emissions';

const REGIONS: WorldRegion[] = [
  { key: 'USA', code: 'USA', name: 'United States of America' },
  { key: 'ARG', code: 'ARG', name: 'Argentina' },
  { key: 'FRA', code: 'FRA', name: 'France' },
  { key: 'region:Somaliland', code: null, name: 'Somaliland' },
];

interface MapItem {
  name: string;
  value: number;
  label?: string;
  total?: number | null;
  selected?: boolean;
  silent?: boolean;
  emphasis?: { disabled: boolean };
  tooltip?: { show: boolean };
}

interface MapOption {
  aria: { enabled: boolean; label: { description: string } };
  tooltip: { formatter: (params: { data?: Partial<MapItem> }) => string };
  visualMap: { type: string; show: boolean; pieces: { lt?: number; gte?: number }[] };
  series: {
    type: string;
    map: string;
    nameProperty: string;
    roam: boolean;
    selectedMode: string;
    data: MapItem[];
  }[];
}

function build(year: number, selectedCode: string | null = null): MapOption {
  return buildCo2MapOption({
    regions: REGIONS,
    data: CO2_FIXTURE,
    year,
    selectedCode,
  }) as unknown as MapOption;
}

const itemByName = (option: MapOption, name: string): MapItem | undefined =>
  option.series[0].data.find((item) => item.name === name);

describe('CO2 map classes', () => {
  it('should have five legend labels for four breaks', () => {
    expect(CO2_MAP_CLASS_BREAKS).toEqual([1, 3, 6, 10]);
    expect(CO2_MAP_CLASS_LABELS).toHaveLength(CO2_MAP_CLASS_BREAKS.length + 1);
  });

  it('should split the values into five contiguous hidden pieces', () => {
    const { visualMap } = build(2024);
    expect(visualMap).toEqual({
      type: 'piecewise',
      show: false,
      pieces: [{ lt: 1 }, { gte: 1, lt: 3 }, { gte: 3, lt: 6 }, { gte: 6, lt: 10 }, { gte: 10 }],
    });
  });
});

describe('buildCo2MapOption', () => {
  it('should draw the registered world map matched by region key, with zoom and selection', () => {
    const [series] = build(2024).series;
    expect(series).toMatchObject({
      type: 'map',
      map: WORLD_MAP_NAME,
      nameProperty: WORLD_MAP_NAME_PROPERTY,
      roam: true,
      selectedMode: 'single',
    });
  });

  it('should give every region one item', () => {
    expect(build(2024).series[0].data.map(({ name }) => name)).toEqual([
      'USA',
      'ARG',
      'FRA',
      'region:Somaliland',
    ]);
  });

  it('should carry the per-capita value, name and total of a country in that year', () => {
    expect(itemByName(build(2024), 'USA')).toEqual({
      name: 'USA',
      value: 13.8,
      label: 'United States',
      total: 4650,
    });
  });

  it.each([
    ['a country absent from the data', 'FRA', 2024],
    ['a region without an entity code', 'region:Somaliland', 2024],
    ['a country without a value in that year', 'ARG', 2022],
  ])('should make %s inert', (_label, name, year) => {
    const item = itemByName(build(year), name);
    expect(item).toMatchObject({
      silent: true,
      emphasis: { disabled: true },
      tooltip: { show: false },
    });
    expect(item?.value).toBeNaN();
  });

  it('should mark only the selected country as selected', () => {
    const option = build(2024, 'ARG');
    expect(itemByName(option, 'ARG')?.selected).toBe(true);
    expect(itemByName(option, 'USA')).not.toHaveProperty('selected');
  });

  it('should describe the map and year for assistive technology', () => {
    const { aria } = build(2021);
    expect(aria.enabled).toBe(true);
    expect(aria.label.description).toContain('CO2 emissions per capita in 2021');
  });

  it('should format the tooltip of a country item and stay empty for others', () => {
    const { formatter } = build(2024).tooltip;
    expect(formatter({ data: { label: 'Argentina', value: 3.85, total: 178.2 } })).toBe(
      formatCo2MapTooltip({ label: 'Argentina', value: 3.85, total: 178.2 }, 2024),
    );
    expect(formatter({ data: { name: 'FRA', value: Number.NaN } })).toBe('');
    expect(formatter({})).toBe('');
  });
});

describe('formatCo2MapTooltip', () => {
  it('should show the country, year, per-capita value and total', () => {
    const text = formatCo2MapTooltip({ label: 'Argentina', value: 3.85, total: 178.2 }, 2024);
    expect(text).toContain('<strong>Argentina</strong> · 2024');
    expect(text).toContain('t per person');
    expect(text).toContain('Mt total');
  });

  it('should escape the country name, which is HTML in the tooltip', () => {
    expect(
      formatCo2MapTooltip({ label: "Côte d'Ivoire <b>", value: 0.3, total: 9 }, 2024),
    ).toContain('<strong>Côte d&#39;Ivoire &lt;b&gt;</strong>');
  });

  it('should say a missing total instead of printing a number', () => {
    expect(formatCo2MapTooltip({ label: 'Argentina', value: 3.7, total: null }, 2022)).toContain(
      'Total: no data',
    );
  });
});
