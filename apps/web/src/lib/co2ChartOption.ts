import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { formatCompact, formatPerCapita, formatTotal } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { Co2EmissionsData, Co2EmissionsEntity, Co2EmissionsMetric } from '@eco-metrics/shared';

/** Short unit shown in the tooltip, per metric. */
export const CO2_TOOLTIP_UNITS: Record<Co2EmissionsMetric, string> = {
  total: 'million tonnes',
  perCapita: 'tonnes per person',
};

/**
 * Line chart of one entity's metric over time. Pure and color-free: the series
 * takes the first palette color of the chart theme. Missing years stay `null`
 * and are drawn as gaps, never as zeros.
 */
export function buildCo2ChartOption(
  entity: Co2EmissionsEntity,
  metric: Co2EmissionsMetric,
  data: Pick<Co2EmissionsData, 'startYear' | 'endYear'>,
): EChartsCoreOption {
  const base = baseChartOption();
  const format = metric === 'total' ? formatTotal : formatPerCapita;
  const unit = CO2_TOOLTIP_UNITS[metric];

  return {
    ...base,
    legend: { show: false },
    tooltip: {
      ...baseTooltipOption(),
      valueFormatter: (value: unknown): string =>
        typeof value === 'number' ? `${format(value)} ${unit}` : 'No data',
    },
    xAxis: buildYearAxis(data),
    yAxis: {
      type: 'value',
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string => formatCompact(value),
      },
    },
    series: [
      {
        type: 'line',
        name: entity.name,
        data: metric === 'total' ? entity.total : entity.perCapita,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
      },
    ],
  };
}
