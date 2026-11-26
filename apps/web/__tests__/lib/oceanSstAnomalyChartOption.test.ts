import { anomalyBaselineLabel, buildOceanSstAnomalyOption } from '@/lib/oceanSstAnomalyChartOption';

import { findColorStrings } from '../fixtures/colorStrings';
import { OCEAN_SST_ANOMALY_FIXTURE } from '../fixtures/oceanHealth';

interface Series {
  name: string;
  data: (number | null)[];
  connectNulls?: boolean;
  areaStyle?: { opacity: number };
  markLine?: {
    data: { yAxis: number; lineStyle: { type: string }; label: { formatter: string } }[];
  };
}

interface Option {
  aria: { label: { description: string } };
  legend: { show: boolean };
  tooltip: { formatter: (params: { dataIndex: number }[]) => string };
  xAxis: { data: string[] };
  yAxis: { scale: boolean };
  series: Series[];
}

const [world, , south] = OCEAN_SST_ANOMALY_FIXTURE.regions;
const build = (region = world) =>
  buildOceanSstAnomalyOption(region, OCEAN_SST_ANOMALY_FIXTURE) as unknown as Option;

describe('buildOceanSstAnomalyOption', () => {
  it('should chart the mean as a line with gaps and the band as a stacked pair', () => {
    const { series } = build(south);

    expect(series).toHaveLength(3);
    const mean = series[2];
    expect(mean.data).toEqual(south.mean);
    expect(mean.data[2]).toBeNull();
    expect(mean.connectNulls).toBe(false);
    expect(series[1].areaStyle?.opacity).toBeLessThan(0.5);
    expect(series.every(({ name }) => name === 'Southern Hemisphere')).toBe(true);
  });

  it('should leave the band open where a bound is missing', () => {
    const [lowerBase, interval] = build(south).series;

    expect(lowerBase.data[2]).toBeNull();
    expect(interval.data[2]).toBeNull();
    expect(interval.data[0]).toBeCloseTo(0.1);
  });

  it('should draw a dashed zero line labelled with the baseline from the payload', () => {
    const [line] = build().series[2].markLine?.data ?? [];

    expect(line.yAxis).toBe(0);
    expect(line.lineStyle.type).toBe('dashed');
    expect(line.label.formatter).toBe('1861–1890 average');
    expect(anomalyBaselineLabel({ baseline: { startYear: 1850, endYear: 1900 } })).toBe(
      '1850–1900 average',
    );
  });

  it('should keep zero inside the value axis', () => {
    expect(build().yAxis.scale).toBe(false);
  });

  it('should use the years of the payload as categories', () => {
    expect(build().xAxis.data).toEqual(['2020', '2021', '2022', '2023', '2024']);
  });

  it('should print a signed value and the interval once in the tooltip', () => {
    const text = build(south).tooltip.formatter([{ dataIndex: 0 }]);

    expect(text).toBe('2020<br/>−0.05 °C<br/>95% range −0.10 to 0.00 °C');
  });

  it('should print No data for a missing year', () => {
    expect(build(south).tooltip.formatter([{ dataIndex: 2 }])).toBe('2022<br/>No data');
  });

  it('should print the value alone when a bound is missing', () => {
    const region = { ...world, upper: [null, ...world.upper.slice(1)] };

    expect(build(region).tooltip.formatter([{ dataIndex: 0 }])).toBe('2020<br/>+0.80 °C');
  });

  it('should hide the legend of a single series and set its own aria description', () => {
    const option = build(south);

    expect(option.legend.show).toBe(false);
    expect(option.aria.label.description).toContain('Southern Hemisphere');
    expect(option.aria.label.description).toContain('1861–1890 average');
    expect(option.aria.label.description).not.toContain('NaN');
  });

  it('should name no color', () => {
    expect(findColorStrings(build())).toEqual([]);
  });
});
