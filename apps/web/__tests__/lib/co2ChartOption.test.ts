import { buildCo2ChartOption } from '@/lib/co2ChartOption';
import { listYears } from '@/lib/yearRange';

import { CO2_FIXTURE, entityByCode } from '../fixtures/co2Emissions';

type Option = {
  tooltip: { valueFormatter: (value: unknown) => string; confine: boolean };
  xAxis: { data: string[] };
  series: { data: (number | null)[]; connectNulls: boolean; showSymbol: boolean }[];
  legend: { show: boolean };
  aria: { enabled: boolean };
};

const build = (code: string, metric: 'total' | 'perCapita') =>
  buildCo2ChartOption(entityByCode(code), metric, CO2_FIXTURE) as unknown as Option;

describe('listYears', () => {
  it('should list every year of the range', () => {
    expect(listYears(CO2_FIXTURE)).toEqual([2020, 2021, 2022, 2023, 2024]);
  });
});

describe('buildCo2ChartOption', () => {
  it('should chart the total series for the total metric', () => {
    expect(build('ARG', 'total').series[0].data).toEqual(entityByCode('ARG').total);
  });

  it('should chart the per-capita series for the per-capita metric', () => {
    expect(build('ARG', 'perCapita').series[0].data).toEqual(entityByCode('ARG').perCapita);
  });

  it('should keep missing years as null gaps instead of connecting them', () => {
    const [series] = build('ARG', 'total').series;

    expect(series.data[2]).toBeNull();
    expect(series.connectNulls).toBe(false);
    expect(series.showSymbol).toBe(false);
  });

  it('should use years as the category axis', () => {
    expect(build('ARG', 'total').xAxis.data).toEqual(['2020', '2021', '2022', '2023', '2024']);
  });

  it('should start from the mobile-safe, accessible defaults and hide the single-series legend', () => {
    const option = build('ARG', 'total');

    expect(option.tooltip.confine).toBe(true);
    expect(option.aria.enabled).toBe(true);
    expect(option.legend.show).toBe(false);
  });

  it('should format tooltip values with their unit', () => {
    const { valueFormatter } = build('ARG', 'total').tooltip;

    expect(valueFormatter(170.123)).toBe('170 million tonnes');
    expect(valueFormatter(null)).toBe('No data');
  });

  it('should format tiny per-capita tooltip values as "< 0.01"', () => {
    const { valueFormatter } = build('OWID_KOS', 'perCapita').tooltip;

    expect(valueFormatter(0)).toBe('< 0.01 tonnes per person');
    expect(valueFormatter(3.85)).toBe('3.85 tonnes per person');
  });

  it('should not contain any color', () => {
    const serialized = JSON.stringify(build('ARG', 'total'), (_key, value: unknown) =>
      typeof value === 'function' ? 'fn' : value,
    );

    expect(serialized).not.toMatch(/color|var\(|oklch|#[0-9a-f]{3,8}|rgb/i);
  });
});
