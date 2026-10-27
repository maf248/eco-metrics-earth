import type { EChartsCoreOption } from 'echarts/core';

import { buildEnergyAreaOption, buildEnergyDonutOption } from '@/lib/energyChartOption';
import { ENERGY_SOURCE_LABELS } from '@/lib/energyMix';
import { ENERGY_SOURCE_IDS } from '@eco-metrics/shared';

import { ENERGY_FIXTURE, energyEntity } from '../fixtures/energySources';

interface AreaSeries {
  type: string;
  name: string;
  stack: string;
  areaStyle: { opacity: number };
  data: (number | null)[];
}

interface Axis {
  min?: number;
  max?: number;
  axisLabel: { formatter: (value: number) => string };
}

const range = ENERGY_FIXTURE;
interface OptionShape {
  series: unknown[];
  yAxis: Axis;
  xAxis: { data: string[] };
  legend: Record<string, unknown>;
  grid: Record<string, unknown>;
  aria: { enabled: boolean; label: { description: string } };
  tooltip: {
    trigger: string;
    confine: boolean;
    formatter: (params: unknown) => string;
  };
}

const asRecord = (option: EChartsCoreOption) => option as unknown as OptionShape;
const labels = ENERGY_SOURCE_IDS.map((id) => ENERGY_SOURCE_LABELS[id]);

describe('buildEnergyAreaOption', () => {
  const world = energyEntity('OWID_WRL');

  it.each(['share', 'generation'] as const)(
    'should emit eight stacked opaque area series in the fixed order (%s)',
    (metric) => {
      const series = asRecord(buildEnergyAreaOption(world, metric, range)).series as AreaSeries[];

      expect(series).toHaveLength(8);
      expect(series.map(({ name }) => name)).toEqual(labels);
      expect(new Set(series.map(({ stack }) => stack)).size).toBe(1);
      for (const item of series) {
        expect(item.type).toBe('line');
        expect(item.areaStyle.opacity).toBe(1);
      }
    },
  );

  it('should fix the share axis to 0-100 with percent labels', () => {
    const { yAxis } = asRecord(buildEnergyAreaOption(world, 'share', range)) as { yAxis: Axis };

    expect(yAxis.min).toBe(0);
    expect(yAxis.max).toBe(100);
    expect(yAxis.axisLabel.formatter(50)).toBe('50%');
  });

  it('should start the generation axis at zero and clear the share max so it fits the data', () => {
    const option = asRecord(buildEnergyAreaOption(world, 'generation', range));

    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBeNull();
    expect(option.yAxis.axisLabel.formatter(1500)).toBe('1.5K');
    expect((option.series as AreaSeries[])[0].data).toEqual(world.generation.coal);
  });

  it('should use the derived shares as share-mode data', () => {
    const series = asRecord(buildEnergyAreaOption(energyEntity('ARG'), 'share', range))
      .series as AreaSeries[];

    const total = series.reduce((sum, item) => sum + (item.data[2] ?? 0), 0);
    expect(total).toBeCloseTo(100, 10);
  });

  it('should leave missing values as gaps', () => {
    const option = asRecord(buildEnergyAreaOption(energyEntity('BIH'), 'share', range));

    expect((option.series as AreaSeries[])[1].data).toEqual([null, null, null]);
  });

  it('should list only the sources that generated something in the tooltip', () => {
    const option = asRecord(buildEnergyAreaOption(world, 'share', range));
    const param = (seriesName: string, value: unknown) => ({
      axisValueLabel: '2025',
      marker: '<m/>',
      seriesName,
      value,
    });

    const text = option.tooltip.formatter([
      param('Coal', 32.957),
      param('Gas', 0),
      param('Wind', null),
    ]);

    expect(text).toBe('2025<br/><m/>Coal: <strong>33.0%</strong>');
    expect(option.tooltip.formatter([param('Gas', 0), param('Wind', null)])).toBe(
      '2025<br/>No data',
    );
  });

  it('should print TWh in the generation tooltip', () => {
    const option = asRecord(buildEnergyAreaOption(world, 'generation', range));

    expect(
      option.tooltip.formatter([
        { axisValueLabel: '2025', marker: '', seriesName: 'Coal', value: 10471.53 },
      ]),
    ).toBe('2025<br/>Coal: <strong>10,472 TWh</strong>');
  });

  it('should draw no outlines and no hover emphasis on the opaque stack', () => {
    const series = asRecord(buildEnergyAreaOption(world, 'share', range)).series as Record<
      string,
      unknown
    >[];

    for (const item of series) {
      expect(item.lineStyle).toEqual({ width: 0 });
      expect(item.emphasis).toEqual({ disabled: true });
    }
  });

  it('should show a scrollable legend under the axis with room in the grid, and an axis tooltip', () => {
    const option = asRecord(buildEnergyAreaOption(world, 'share', range));

    expect(option.legend).toMatchObject({
      type: 'scroll',
      show: true,
      bottom: 0,
      icon: 'roundRect',
    });
    expect(option.grid).toMatchObject({ bottom: 40, containLabel: true });
    expect(option.tooltip).toMatchObject({ trigger: 'axis', confine: true });
    expect(option.xAxis.data).toEqual(['2023', '2024', '2025']);
  });
});

describe('aria descriptions', () => {
  it('should describe the area chart by entity, measure and years instead of the data', () => {
    const share = asRecord(buildEnergyAreaOption(energyEntity('BIH'), 'share', range));
    const generation = asRecord(buildEnergyAreaOption(energyEntity('BIH'), 'generation', range));

    expect(share.aria.enabled).toBe(true);
    expect(share.aria.label.description).toBe(
      'Bosnia and Herzegovina: electricity share by source, 2023 to 2025. The data table below lists every year.',
    );
    expect(generation.aria.label.description).toContain('electricity generation by source');
    expect(share.aria.label.description).not.toContain('NaN');
  });

  it('should list every donut source with its share or no data', () => {
    const { aria } = asRecord(buildEnergyDonutOption(energyEntity('BIH'), 2025, 2023));

    expect(aria.enabled).toBe(true);
    expect(aria.label.description).toMatch(
      /^Bosnia and Herzegovina: electricity mix in 2025\. Coal \d+\.\d%; Gas no data;/,
    );
    const { aria: dza } = asRecord(buildEnergyDonutOption(energyEntity('DZA'), 2023, 2023));
    expect(dza.label.description).toContain('Nuclear no data');
    expect(dza.label.description).not.toContain('NaN');
  });
});

describe('buildEnergyDonutOption', () => {
  const series = (option: EChartsCoreOption) =>
    asRecord(option).series[0] as {
      type: string;
      radius: string[];
      label: { show: boolean };
      data: { name: string; value: number | null; generation: number | null }[];
    };

  it('should emit one pie series with an inner radius and eight items in the fixed order', () => {
    const pie = series(buildEnergyDonutOption(energyEntity('OWID_WRL'), 2025, 2023));

    expect(pie.type).toBe('pie');
    expect(parseInt(pie.radius[0], 10)).toBeGreaterThan(0);
    expect(pie.label.show).toBe(false);
    expect(pie.data.map(({ name }) => name)).toEqual(labels);
  });

  it('should keep a source without a value in its slot with a null value', () => {
    const pie = series(buildEnergyDonutOption(energyEntity('BIH'), 2025, 2023));

    expect(pie.data[1]).toEqual({ name: 'Gas', value: null, generation: null });
    expect(pie.data[0].value).toBeGreaterThan(0);
    expect(pie.data).toHaveLength(8);
  });

  it('should size slices by share and carry the generation for the tooltip', () => {
    const pie = series(buildEnergyDonutOption(energyEntity('OWID_WRL'), 2025, 2023));

    expect(pie.data[0].value).toBeCloseTo(32.96, 1);
    expect(pie.data[0].generation).toBe(10471.53);
  });

  it('should format the tooltip with source, percentage and TWh', () => {
    const raw = buildEnergyDonutOption(energyEntity('OWID_WRL'), 2025, 2023);
    const option = asRecord(raw);
    const [coal] = series(raw).data;

    const text = option.tooltip.formatter({ name: 'Coal', data: coal }) as string;

    expect(text).toBe('Coal: 33.0% (10,472 TWh)');
    expect(option.tooltip).toMatchObject({ trigger: 'item', confine: true });
    expect(option.legend).toMatchObject({ type: 'scroll', show: true });
  });

  it('should print No data for a source without a value', () => {
    const raw = buildEnergyDonutOption(energyEntity('BIH'), 2025, 2023);
    const option = asRecord(raw);
    const gas = series(raw).data[1];

    expect(option.tooltip.formatter({ name: 'Gas', data: gas })).toBe('Gas: No data');
  });

  it('should use the requested year, not the last one', () => {
    const pie = series(buildEnergyDonutOption(energyEntity('DZA'), 2024, 2023));

    expect(pie.data[1].generation).toBe(82);
  });
});

describe('options carry no colours', () => {
  const COLOR_LITERAL = /var\(|oklch\(|#[0-9a-fA-F]{3,8}\b|rgba?\(|"color"|"colou?r[A-Z]\w*"/;

  it.each([
    ['area share', () => buildEnergyAreaOption(energyEntity('OWID_WRL'), 'share', range)],
    ['area generation', () => buildEnergyAreaOption(energyEntity('OWID_WRL'), 'generation', range)],
    ['donut', () => buildEnergyDonutOption(energyEntity('OWID_WRL'), 2025, 2023)],
  ])('should not name a colour in the %s option', (_label, build) => {
    const serialized = JSON.stringify(build(), (_key, value: unknown) =>
      typeof value === 'function' ? value.toString() : value,
    );

    expect(serialized).not.toMatch(COLOR_LITERAL);
  });
});
