import {
  buildForestAreaChartOption,
  buildForestAxisFormatter,
  forestAreaUnit,
  FOREST_AREA_UNIT_LABELS,
} from '@/lib/forestAreaChartOption';
import {
  buildForestChangeMapOption,
  formatForestChangeTooltip,
  FOREST_CHANGE_CLASS_LABELS,
} from '@/lib/forestChangeMapOption';
import { buildTreeCoverLossOption, treeCoverLossTotal } from '@/lib/treeCoverLossChartOption';
import { WORLD_MAP_NAME, type WorldRegion } from '@/lib/worldGeometry';
import type { ForestAreaData } from '@eco-metrics/shared';

import {
  DRIVERS,
  FOREST_FIXTURE,
  forestEntityByCode,
  TREE_COVER_LOSS_FIXTURE,
} from '../fixtures/deforestation';

interface Series {
  type: string;
  name: string;
  stack?: string;
  data: (number | null)[];
}

interface ChartOption {
  aria: { label: { description: string } };
  yAxis: { min?: number; scale?: boolean; axisLabel: { formatter: (value: number) => string } };
  xAxis: { data: string[] };
  tooltip: {
    valueFormatter?: (value: unknown) => string;
    formatter?: (params: unknown) => string;
  };
  series: Series[];
}

const build = (option: unknown): ChartOption => option as ChartOption;

describe('buildForestAreaChartOption', () => {
  const world = forestEntityByCode('OWID_WRL');

  it('should draw one line in million hectares with an axis that follows the data', () => {
    const option = build(buildForestAreaChartOption(world, 'area', FOREST_FIXTURE, 'million'));

    expect(option.series).toHaveLength(1);
    expect(option.series[0]).toMatchObject({ type: 'line', name: 'World' });
    expect(option.series[0].data[0]).toBeCloseTo(4343.5325, 4);
    expect(option.yAxis.scale).toBe(true);
    expect(option.yAxis.min).toBeUndefined();
    expect(option.xAxis.data[0]).toBe('1990');
    expect(option.xAxis.data).toHaveLength(36);
  });

  it('should draw the share as it is, with percent labels', () => {
    const option = build(buildForestAreaChartOption(world, 'share', FOREST_FIXTURE, 'million'));

    expect(option.series[0].data[35]).toBe(31.91);
    expect(option.yAxis.axisLabel.formatter(32)).toBe('32.0%');
    expect(option.tooltip.valueFormatter?.(31.91)).toBe('31.9%');
  });

  it('should scale a small forest to thousand hectares', () => {
    const ireland = forestEntityByCode('IRL');
    const option = build(buildForestAreaChartOption(ireland, 'area', FOREST_FIXTURE, 'thousand'));

    expect(option.series[0].data[0]).toBeCloseTo(461.64, 2);
    expect(option.tooltip.valueFormatter?.(461.64)).toBe(`462 ${FOREST_AREA_UNIT_LABELS.thousand}`);
  });

  it('should keep a missing year as a gap, say so in the tooltip and set its own aria text', () => {
    const entity = {
      ...world,
      area: world.area.map((value, index) => (index === 3 ? null : value)),
    };
    const option = build(buildForestAreaChartOption(entity, 'area', FOREST_FIXTURE, 'million'));

    expect(option.series[0].data[3]).toBeNull();
    expect(option.tooltip.valueFormatter?.(null)).toBe('No data');
    expect(option.aria.label.description).toContain('does not start at zero');
    expect(option.aria.label.description).not.toContain('NaN');
  });
});

describe('forestAreaUnit', () => {
  it('should use million hectares from one million up and thousand below', () => {
    expect(forestAreaUnit(forestEntityByCode('BRA'))).toBe('million');
    expect(forestAreaUnit(forestEntityByCode('IRL'))).toBe('thousand');
    expect(forestAreaUnit({ area: [999_999, null] })).toBe('thousand');
    expect(forestAreaUnit({ area: [null, null] })).toBe('thousand');
  });
});

describe('buildForestAxisFormatter', () => {
  // ECharts-like ticks of the World line: 50 million hectares apart over about 4,140 to 4,344.
  const WORLD_TICKS = [4150, 4200, 4250, 4300, 4350];

  it('should print distinct, suffix-free labels for the World range in million hectares', () => {
    const format = buildForestAxisFormatter([4140.2, 4343.5], false);
    const labels = WORLD_TICKS.map(format);

    expect(labels).toEqual(['4,150', '4,200', '4,250', '4,300', '4,350']);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.join('')).not.toMatch(/[KM%]/);
  });

  it('should add decimals as the range shrinks so adjacent ticks stay distinct', () => {
    const format = buildForestAxisFormatter([1.2, 3.4], false);
    const labels = [1.5, 2, 2.5, 3].map(format);

    expect(labels).toEqual(['1.5', '2.0', '2.5', '3.0']);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('should print a share with one decimal and a percent sign', () => {
    const format = buildForestAxisFormatter([31.2, 32.6], true);

    expect(format(32)).toBe('32.0%');
    expect(format(31.5)).toBe('31.5%');
  });

  it('should skip null gaps and fall back to whole numbers for an empty series', () => {
    expect(buildForestAxisFormatter([null, null], false)(1200)).toBe('1,200');
  });
});

describe('buildTreeCoverLossOption', () => {
  const [world, russia, nauru] = TREE_COVER_LOSS_FIXTURE.entities;

  it('should stack seven bar series named as the drivers, from zero, in the payload order', () => {
    const option = build(buildTreeCoverLossOption(world, TREE_COVER_LOSS_FIXTURE));

    expect(option.series.map(({ name }) => name)).toEqual(DRIVERS.map(({ name }) => name));
    expect(new Set(option.series.map(({ type }) => type))).toEqual(new Set(['bar']));
    expect(new Set(option.series.map(({ stack }) => stack)).size).toBe(1);
    expect(option.yAxis.min).toBe(0);
    expect(option.xAxis.data[0]).toBe('2001');
    expect(option.xAxis.data[option.xAxis.data.length - 1]).toBe('2024');
    expect(option.series[0].data[0]).toBe(6);
  });

  it('should keep every driver present when some are blank, with null and not zero', () => {
    const option = build(buildTreeCoverLossOption(russia, TREE_COVER_LOSS_FIXTURE));

    expect(option.series).toHaveLength(7);
    expect(option.series[3].data.every((value) => value === null)).toBe(true);
    expect(option.series[5].data[19]).toBeNull();
    expect(option.series[5].data[18]).toBe(2);
  });

  it('should say "No value" for a blank driver and total the others in the tooltip', () => {
    const option = build(buildTreeCoverLossOption(russia, TREE_COVER_LOSS_FIXTURE));
    const html = option.tooltip.formatter?.([
      { axisValueLabel: '2020', dataIndex: 19, marker: '<i/>', seriesName: 'Logging' },
    ]);

    expect(html).toContain('2020');
    expect(html).toContain('Shifting cultivation: <strong>No value</strong>');
    expect(html).toContain('Wildfire: <strong>No value</strong>');
    expect(html).toContain('Logging: <strong>0.8 million ha</strong>');
    // 3,000 + 40,000 + 4,000 + 800,000 + 45,000 hectares.
    expect(html).toContain('Total: <strong>0.9 million ha</strong>');
  });

  it('should say the total has no value when every driver is blank', () => {
    const option = build(buildTreeCoverLossOption(nauru, TREE_COVER_LOSS_FIXTURE));

    expect(
      option.tooltip.formatter?.([
        { axisValueLabel: '2024', dataIndex: 23, marker: '', seriesName: 'Logging' },
      ]),
    ).toContain('Total: <strong>No value</strong>');
    expect(option.tooltip.formatter?.([])).toBe('');
  });

  it('should set an aria description that never prints NaN', () => {
    const option = build(buildTreeCoverLossOption(nauru, TREE_COVER_LOSS_FIXTURE));

    expect(option.aria.label.description).toContain('million hectares');
    expect(option.aria.label.description).not.toContain('NaN');
  });
});

describe('treeCoverLossTotal', () => {
  const [, russia, nauru] = TREE_COVER_LOSS_FIXTURE.entities;
  const { drivers } = TREE_COVER_LOSS_FIXTURE;

  it('should sum the drivers that have a value and be null only when none has', () => {
    expect(treeCoverLossTotal(russia, drivers, 0)).toBe(2892000);
    expect(treeCoverLossTotal(nauru, drivers, 23)).toBeNull();
  });
});

describe('buildForestChangeMapOption', () => {
  const REGIONS: WorldRegion[] = [
    { key: 'BRA', code: 'BRA', name: 'Brazil' },
    { key: 'CHN', code: 'CHN', name: 'China' },
    { key: 'NRU', code: 'NRU', name: 'Nauru' },
    { key: 'OWID_WRL', code: 'OWID_WRL', name: 'World' },
    { key: 'FRA', code: 'FRA', name: 'France' },
    { key: 'region:Somaliland', code: null, name: 'Somaliland' },
  ];

  interface Item {
    name: string;
    value: number;
    label?: string;
    hectares?: number;
    selected?: boolean;
    silent?: boolean;
  }

  const build2 = (selectedCode: string | null = null) =>
    buildForestChangeMapOption({
      regions: REGIONS,
      data: FOREST_FIXTURE,
      selectedCode,
    }) as unknown as {
      aria: { label: { description: string } };
      tooltip: { formatter: (params: { data?: Partial<Item> }) => string };
      visualMap: { pieces: { lt?: number; gte?: number }[] };
      series: { map: string; data: Item[] }[];
    };

  it('should have seven labels for the seven contiguous pieces centred on zero', () => {
    const { visualMap } = build2();

    expect(FOREST_CHANGE_CLASS_LABELS).toHaveLength(7);
    expect(visualMap.pieces).toEqual([
      { lt: -50 },
      { gte: -50, lt: -25 },
      { gte: -25, lt: -5 },
      { gte: -5, lt: 5 },
      { gte: 5, lt: 25 },
      { gte: 25, lt: 50 },
      { gte: 50 },
    ]);
  });

  it('should put Brazil in its loss class and China in its gain class, on opposite arms', () => {
    const { visualMap, series } = build2();
    const classOf = (value: number): number =>
      visualMap.pieces.findIndex(
        (piece) =>
          (piece.lt === undefined || value < piece.lt) &&
          (piece.gte === undefined || value >= piece.gte),
      );
    const brazil = series[0].data.find(({ name }) => name === 'BRA');
    const china = series[0].data.find(({ name }) => name === 'CHN');

    const brazilClass = classOf(brazil?.value ?? NaN);
    const chinaClass = classOf(china?.value ?? NaN);
    expect(FOREST_CHANGE_CLASS_LABELS[brazilClass]).toBe('−25 to −5%');
    expect(FOREST_CHANGE_CLASS_LABELS[chinaClass]).toBe('+25 to +50%');
    expect(brazilClass).toBeLessThan(3);
    expect(chinaClass).toBeGreaterThan(3);
  });

  it('should assign classes from the one-decimal value, as the map option builds them', () => {
    // Forest area in the first year 100 and in the last year 100 * (1 + percent / 100).
    const years = FOREST_FIXTURE.endYear - FOREST_FIXTURE.startYear + 1;
    const entity = (code: string, percent: number): ForestAreaData['entities'][number] => ({
      ...forestEntityByCode('BRA'),
      code,
      name: code,
      area: Array.from({ length: years }, (_, index) =>
        index === 0 ? 100 : index === years - 1 ? 100 * (1 + percent / 100) : null,
      ),
    });
    const cases: [string, number, string][] = [
      ['AAA', -4.96, '−5 to +5%'],
      ['BBB', -5.04, '−5 to +5%'],
      ['CCC', -5.06, '−25 to −5%'],
      ['DDD', -25, '−25 to −5%'],
      ['EEE', 49.96, '≥ +50%'],
    ];
    const { visualMap, series } = buildForestChangeMapOption({
      regions: cases.map(([code]) => ({ key: code, code, name: code })),
      data: {
        startYear: FOREST_FIXTURE.startYear,
        endYear: FOREST_FIXTURE.endYear,
        entities: cases.map(([code, percent]) => entity(code, percent)),
      },
      selectedCode: null,
    }) as unknown as {
      visualMap: { pieces: { lt?: number; gte?: number }[] };
      series: { data: Item[] }[];
    };
    const classOf = (value: number): number =>
      visualMap.pieces.findIndex(
        (piece) =>
          (piece.lt === undefined || value < piece.lt) &&
          (piece.gte === undefined || value >= piece.gte),
      );

    for (const [code, , label] of cases) {
      const item = series[0].data.find(({ name }) => name === code);
      expect(FOREST_CHANGE_CLASS_LABELS[classOf(item?.value ?? Number.NaN)]).toBe(label);
    }
  });

  it('should name no color in the option: the theme resolves the ramp', () => {
    expect(JSON.stringify(build2())).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|chart-div/);
  });

  it('should name signed ranges with the real minus sign in the legend labels', () => {
    expect(FOREST_CHANGE_CLASS_LABELS[0]).toBe('< −50%');
    expect(FOREST_CHANGE_CLASS_LABELS[3]).toBe('−5 to +5%');
    expect(FOREST_CHANGE_CLASS_LABELS.join('')).not.toContain('-');
  });

  it('should carry the one-decimal percentage and hectares of a country', () => {
    const { series } = build2();
    const brazil = series[0].data.find(({ name }) => name === 'BRA');

    expect(series[0].map).toBe(WORLD_MAP_NAME);
    expect(brazil).toMatchObject({ label: 'Brazil', value: -21.4, hectares: -132356640 });
  });

  it.each(['NRU', 'OWID_WRL', 'FRA', 'region:Somaliland'])('should make %s inert', (name) => {
    const item = build2().series[0].data.find((entry) => entry.name === name);

    expect(item).toMatchObject({ silent: true });
    expect(item?.value).toBeNaN();
  });

  it('should have no item for World or any aggregate', () => {
    const named = build2().series[0].data.filter(({ label }) => label);

    expect(named.map(({ label }) => label)).toEqual(['Brazil', 'China']);
  });

  it('should mark only the selected country', () => {
    const { series } = build2('CHN');

    expect(series[0].data.find(({ name }) => name === 'CHN')?.selected).toBe(true);
    expect(series[0].data.find(({ name }) => name === 'BRA')?.selected).toBe(false);
  });

  it('should format a signed tooltip and stay empty for inert regions', () => {
    const { tooltip, aria } = build2();
    const china = tooltip.formatter({ data: { label: 'China', value: 44.6, hectares: 70012410 } });

    expect(china).toContain('<strong>China</strong>');
    expect(china).toContain('+44.6% since 1990');
    expect(china).toContain('+70,012,410 hectares net change');
    expect(tooltip.formatter({})).toBe('');
    expect(aria.label.description).toContain('1990 and 2025');
  });
});

describe('formatForestChangeTooltip', () => {
  it('should sign a loss with the real minus sign and escape the name', () => {
    const html = formatForestChangeTooltip(
      { label: 'Côte <d>', value: -55, hectares: -1234567 },
      1990,
    );

    expect(html).toContain('−55.0% since 1990');
    expect(html).toContain('−1,234,567 hectares net change');
    expect(html).toContain('Côte &lt;d&gt;');
  });
});
