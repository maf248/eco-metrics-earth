import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption } from '@/components/charts/baseChartOption';
import { formatAnomaly, formatAnomalyAxis } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { GlobalTemperatureData, GlobalTemperatureEntity } from '@eco-metrics/shared';

type ChartData = Pick<GlobalTemperatureData, 'startYear' | 'endYear' | 'baseline' | 'unit'>;

/** Label of the zero reference line, e.g. `1991–2020 average`. */
export function baselineLabel({ baseline }: Pick<ChartData, 'baseline'>): string {
  return `${baseline.startYear}–${baseline.endYear} average`;
}

/**
 * Line chart of one entity's temperature anomaly. Pure and color-free: the line
 * takes the first palette color and the reference line its colors from the chart
 * theme. A dashed line at zero, labelled with the baseline, shows which years
 * are above and below it. Missing years stay `null` and are drawn as gaps, never
 * as zeros.
 */
export function buildGlobalTemperatureChartOption(
  entity: GlobalTemperatureEntity,
  data: ChartData,
): EChartsCoreOption {
  const base = baseChartOption();
  const baseTooltip =
    typeof base.tooltip === 'object' && base.tooltip !== null && !Array.isArray(base.tooltip)
      ? base.tooltip
      : {};

  return {
    ...base,
    legend: { show: false },
    tooltip: {
      ...baseTooltip,
      valueFormatter: (value: unknown): string =>
        typeof value === 'number' ? `${formatAnomaly(value)} ${data.unit}` : 'No data',
    },
    xAxis: buildYearAxis(data),
    yAxis: {
      type: 'value',
      // Always include zero: the sign of the anomaly is the story.
      scale: false,
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string => formatAnomalyAxis(value),
      },
    },
    series: [
      {
        type: 'line',
        name: entity.name,
        data: entity.anomaly,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          label: { formatter: baselineLabel(data), position: 'insideStartTop' },
          data: [{ yAxis: 0 }],
        },
      },
    ],
  };
}
