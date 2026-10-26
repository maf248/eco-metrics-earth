import {
  buildGlobalSeriesChartOption,
  PARIS_LIMIT_LABEL,
  preIndustrialLabel,
} from '@/lib/globalSeriesChartOption';

import { TEMPERATURE_FIXTURE } from '../fixtures/globalTemperature';

type Series = {
  data: (number | null)[];
  connectNulls?: boolean;
  name: string;
  areaStyle?: { opacity: number };
  markLine?: {
    data: {
      yAxis: number;
      lineStyle: { type: string };
      label: { formatter: string; position: string };
    }[];
  };
};

type Option = {
  tooltip: { formatter: (params: { dataIndex: number }[]) => string };
  xAxis: { data: string[] };
  yAxis: { max: (value: { max: number }) => number };
  series: Series[];
  legend: { show: boolean };
};

const { global } = TEMPERATURE_FIXTURE;
const build = (data = global) => buildGlobalSeriesChartOption(data, '°C') as unknown as Option;

describe('buildGlobalSeriesChartOption', () => {
  it('should chart the mean as a line with gaps and the band as a stacked pair', () => {
    const { series } = build();

    expect(series).toHaveLength(3);
    const mean = series[2];
    expect(mean.data).toEqual(global.mean);
    expect(mean.data[4]).toBeNull();
    expect(mean.connectNulls).toBe(false);
    expect(series[1].areaStyle?.opacity).toBeLessThan(0.5);
    expect(series.every((entry) => entry.name === mean.name)).toBe(true);
  });

  it('should leave the band open where a bound is missing', () => {
    const [base, interval] = build().series;

    expect(base.data[4]).toBeNull();
    expect(interval.data[4]).toBeNull();
    expect(interval.data[0]).toBeCloseTo(0.35);
  });

  it('should use years from the start year as categories', () => {
    expect(build().xAxis.data).toEqual(['1850', '1851', '1852', '1853', '1854']);
  });

  it('should draw dashed zero and dotted 1.5 reference lines with their labels', () => {
    const lines = build().series[2].markLine?.data ?? [];

    expect(lines.map(({ yAxis }) => yAxis)).toEqual([0, 1.5]);
    expect(lines[0].label.formatter).toBe('1861–1890 average');
    expect(lines[1].label.formatter).toBe('1.5 °C');
    expect(lines[0].lineStyle.type).toBe('dashed');
    expect(lines[1].lineStyle.type).toBe('dotted');
    expect(PARIS_LIMIT_LABEL).toBe(lines[1].label.formatter);
  });

  it('should place the labels away from the data line', () => {
    const lines = build().series[2].markLine?.data ?? [];

    expect(lines.map(({ label }) => label.position)).toEqual(['insideEndBottom', 'insideStartTop']);
  });

  it('should take the zero line label from another baseline', () => {
    const other = { ...global, baseline: { startYear: 1850, endYear: 1900 } };

    expect(build(other).series[2].markLine?.data[0].label.formatter).toBe('1850–1900 average');
    expect(preIndustrialLabel(other)).toBe('1850–1900 average');
  });

  it('should keep the 1.5 line inside the value axis', () => {
    const { max } = build().yAxis;

    expect(max({ max: 0.6 })).toBe(1.5);
    expect(max({ max: 1.9 })).toBe(1.9);
  });

  it('should print the year, the signed mean and the interval once in the tooltip', () => {
    const { formatter } = build().tooltip;

    expect(formatter([{ dataIndex: 2 }])).toBe('1852<br/>−0.10 °C<br/>95% range −0.20 to 0.00 °C');
    expect(formatter([{ dataIndex: 3 }])).toBe('1853<br/>+0.50 °C<br/>95% range +0.40 to +0.60 °C');
  });

  it('should say there is no data for a missing year and omit a missing interval', () => {
    const { formatter } = build().tooltip;
    const noInterval = build({ ...global, lower: [null, null, null, null, null] }).tooltip;

    expect(formatter([{ dataIndex: 4 }])).toBe('1854<br/>No data');
    expect(noInterval.formatter([{ dataIndex: 0 }])).toBe('1850<br/>−0.06 °C');
  });

  it('should hide the legend and name no color anywhere in the option', () => {
    const option = build();
    const serialized = JSON.stringify(option, (_key, value: unknown) =>
      typeof value === 'function' ? 'fn' : value,
    );

    expect(option.legend.show).toBe(false);
    expect(serialized).not.toMatch(/color|var\(|oklch\(|#[0-9a-f]{3,8}|rgb/i);
  });
});
