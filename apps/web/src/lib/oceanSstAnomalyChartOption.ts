import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { buildConfidenceBandSeries } from '@/components/charts/confidenceBand';
import { formatAnomaly, formatAnomalyAxis } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { OceanSstAnomalyData, OceanSstAnomalyRegion } from '@eco-metrics/shared';

type ChartData = Pick<OceanSstAnomalyData, 'startYear' | 'endYear' | 'baseline' | 'unit'>;

/** Short label of the zero line, e.g. `1861–1890 average`; the intro sentence explains it. */
export function anomalyBaselineLabel({ baseline }: Pick<ChartData, 'baseline'>): string {
  return `${baseline.startYear}–${baseline.endYear} average`;
}

interface TooltipParam {
  dataIndex: number;
}

/**
 * Line chart of one region's annual sea surface temperature anomaly with its 95% uncertainty band
 * and a labelled zero line. Pure and color-free: the line and the band take the first palette
 * color and the reference line its colors from the chart theme. Missing years (and missing
 * bounds) are gaps, never zeros.
 */
export function buildOceanSstAnomalyOption(
  region: OceanSstAnomalyRegion,
  data: ChartData,
): EChartsCoreOption {
  const base = baseChartOption();
  const { name, mean, lower, upper } = region;
  const { startYear, endYear, unit } = data;

  return {
    ...base,
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `${name}: annual sea surface temperature anomaly relative to the ` +
          `${anomalyBaselineLabel(data)}, ${startYear} to ${endYear}, with the 95% uncertainty ` +
          'band. The data table below lists every year.',
      },
    },
    legend: { show: false },
    tooltip: {
      ...baseTooltipOption(),
      // One line per year with the interval printed once: the band is not a tooltip series.
      formatter: (params: TooltipParam | TooltipParam[]): string => {
        const [{ dataIndex }] = Array.isArray(params) ? params : [params];
        const year = startYear + dataIndex;
        const value = mean[dataIndex];
        if (value === null) {
          return `${year}<br/>No data`;
        }
        const low = lower[dataIndex];
        const high = upper[dataIndex];
        const interval =
          low === null || high === null
            ? ''
            : `<br/>95% range ${formatAnomaly(low)} to ${formatAnomaly(high)} ${unit}`;
        return `${year}<br/>${formatAnomaly(value)} ${unit}${interval}`;
      },
    },
    xAxis: buildYearAxis(data),
    yAxis: {
      type: 'value',
      // Zero is always inside the axis: it is the reference the values are read against.
      scale: false,
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string => formatAnomalyAxis(value),
      },
    },
    series: [
      ...buildConfidenceBandSeries({ name, lower, upper }),
      {
        type: 'line',
        name,
        data: mean,
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
              label: { formatter: anomalyBaselineLabel(data), position: 'insideEndBottom' },
            },
          ],
        },
      },
    ],
  };
}
