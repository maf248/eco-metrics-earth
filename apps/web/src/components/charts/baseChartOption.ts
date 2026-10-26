import type { EChartsCoreOption } from 'echarts/core';

/**
 * Defaults every chart option starts from: mobile-safe tooltip and labels, a
 * scrollable legend for the multi-series case, and ECharts' generated `aria`
 * description. Colors are never named here: they come from the chart theme.
 */
export function baseChartOption(): EChartsCoreOption {
  return {
    aria: { enabled: true },
    grid: { containLabel: true, left: 8, right: 16, top: 16, bottom: 8 },
    tooltip: { confine: true, trigger: 'axis' },
    legend: { type: 'scroll' },
    xAxis: { axisLabel: { hideOverlap: true } },
    yAxis: { axisLabel: { hideOverlap: true } },
  };
}
