import {
  baselineLabel,
  buildGlobalTemperatureChartOption,
} from '@/lib/globalTemperatureChartOption';

import { TEMPERATURE_FIXTURE, temperatureEntity } from '../fixtures/globalTemperature';

type Option = {
  tooltip: { valueFormatter: (value: unknown) => string; confine: boolean };
  xAxis: { data: string[] };
  yAxis: { scale: boolean; axisLabel: { formatter: (value: number) => string } };
  series: {
    data: (number | null)[];
    connectNulls: boolean;
    showSymbol: boolean;
    markLine: { data: { yAxis: number }[]; label: { formatter: string }; silent: boolean };
  }[];
  legend: { show: boolean };
  aria: { enabled: boolean };
};

const build = (code: string, data = TEMPERATURE_FIXTURE) =>
  buildGlobalTemperatureChartOption(temperatureEntity(code), data) as unknown as Option;

describe('buildGlobalTemperatureChartOption', () => {
  it('should chart the anomaly series of the entity', () => {
    expect(build('ARG').series[0].data).toEqual(temperatureEntity('ARG').anomaly);
  });

  it('should keep missing years as null gaps instead of connecting them', () => {
    const [series] = build('ARG').series;

    expect(series.data[2]).toBeNull();
    expect(series.connectNulls).toBe(false);
    expect(series.showSymbol).toBe(false);
  });

  it('should use years as the category axis', () => {
    expect(build('ARG').xAxis.data).toEqual(['2020', '2021', '2022', '2023', '2024']);
  });

  it('should draw a reference line at zero labelled with the baseline from the payload', () => {
    const { markLine } = build('ARG').series[0];

    expect(markLine.data).toEqual([{ yAxis: 0 }]);
    expect(markLine.label.formatter).toBe('1991–2020 average');
    expect(markLine.silent).toBe(true);
  });

  it('should take the label from another baseline', () => {
    const data = { ...TEMPERATURE_FIXTURE, baseline: { startYear: 1981, endYear: 2010 } };

    expect(build('ARG', data).series[0].markLine.label.formatter).toBe('1981–2010 average');
    expect(baselineLabel(data)).toBe('1981–2010 average');
  });

  it('should include zero on the value axis and sign the axis labels', () => {
    const { yAxis } = build('ARG');

    expect(yAxis.scale).toBe(false);
    expect(yAxis.axisLabel.formatter(0.5)).toBe('+0.5');
    expect(yAxis.axisLabel.formatter(-1)).toBe('−1');
  });

  it('should format the tooltip with the sign, the unit and a no-data fallback', () => {
    const { valueFormatter } = build('ARG').tooltip;

    expect(valueFormatter(-0.45)).toBe('−0.45 °C');
    expect(valueFormatter(0.59)).toBe('+0.59 °C');
    expect(valueFormatter(null)).toBe('No data');
  });

  it('should hide the legend and enable the aria description', () => {
    const option = build('ARG');

    expect(option.legend.show).toBe(false);
    expect(option.aria.enabled).toBe(true);
    expect(option.tooltip.confine).toBe(true);
  });

  it('should name no color anywhere in the option', () => {
    const serialized = JSON.stringify(build('ARG'), (_key, value: unknown) =>
      typeof value === 'function' ? 'fn' : value,
    );

    expect(serialized).not.toMatch(/color|var\(|oklch\(|#[0-9a-f]{3,8}|rgb/i);
  });
});
