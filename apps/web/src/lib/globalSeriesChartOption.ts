import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { buildConfidenceBandSeries } from '@/components/charts/confidenceBand';
import { formatAnomaly, formatAnomalyAxis } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { GlobalTemperatureGlobal } from '@eco-metrics/shared';

/** The long-term warming limit of the Paris Agreement, in degrees Celsius above pre-industrial. */
export const PARIS_LIMIT_CELSIUS = 1.5;

const SERIES_NAME = 'Global average temperature';

type ChartData = Pick<
  GlobalTemperatureGlobal,
  'startYear' | 'endYear' | 'baseline' | 'mean' | 'lower' | 'upper'
>;

/** Short label of the zero line, e.g. `1861–1890 average`; the methodology sentence explains it. */
export function preIndustrialLabel({ baseline }: Pick<ChartData, 'baseline'>): string {
  return `${baseline.startYear}–${baseline.endYear} average`;
}

/** Short label of the threshold line; the Paris Agreement explanation is in the page text. */
export const PARIS_LIMIT_LABEL = `${PARIS_LIMIT_CELSIUS} °C`;

interface TooltipParam {
  dataIndex: number;
}

/**
 * Long-run line chart of the World's temperature against the pre-industrial
 * baseline: the mean, its 95% confidence band and two labelled reference lines
 * (zero, dashed, and 1.5 °C, dotted, so they differ without color; short labels
 * placed away from the data line). Pure and color-free: the line and the band
 * take the first palette color and the lines their colors from the chart theme.
 * Missing years are gaps, never zeros.
 */
export function buildGlobalSeriesChartOption(data: ChartData, unit: string): EChartsCoreOption {
  const base = baseChartOption();

  return {
    ...base,
    legend: { show: false },
    tooltip: {
      ...baseTooltipOption(),
      // One line per year with the interval printed once: the band is not a tooltip series.
      formatter: (params: TooltipParam | TooltipParam[]): string => {
        const [{ dataIndex }] = Array.isArray(params) ? params : [params];
        const year = data.startYear + dataIndex;
        const mean = data.mean[dataIndex];
        const lower = data.lower[dataIndex];
        const upper = data.upper[dataIndex];
        if (mean === null) {
          return `${year}<br/>No data`;
        }
        const interval =
          lower === null || upper === null
            ? ''
            : `<br/>95% range ${formatAnomaly(lower)} to ${formatAnomaly(upper)} ${unit}`;
        return `${year}<br/>${formatAnomaly(mean)} ${unit}${interval}`;
      },
    },
    xAxis: buildYearAxis(data),
    yAxis: {
      type: 'value',
      // Zero and the 1.5 line are always inside the axis.
      scale: false,
      max: (value: { max: number }): number => Math.max(value.max, PARIS_LIMIT_CELSIUS),
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string => formatAnomalyAxis(value),
      },
    },
    series: [
      ...buildConfidenceBandSeries({ name: SERIES_NAME, lower: data.lower, upper: data.upper }),
      {
        type: 'line',
        name: SERIES_NAME,
        data: data.mean,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { width: 1 },
          data: [
            {
              yAxis: 0,
              lineStyle: { type: 'dashed' },
              label: { formatter: preIndustrialLabel(data), position: 'insideEndBottom' },
            },
            {
              yAxis: PARIS_LIMIT_CELSIUS,
              lineStyle: { type: 'dotted' },
              label: { formatter: PARIS_LIMIT_LABEL, position: 'insideStartTop' },
            },
          ],
        },
      },
    ],
  };
}
