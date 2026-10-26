import type { EChartsCoreOption } from 'echarts/core';

/** Mobile-safe axis tooltip every chart starts from; options extend it with their formatter. */
export function baseTooltipOption(): { confine: boolean; trigger: 'axis' } {
  return { confine: true, trigger: 'axis' };
}

/**
 * Defaults every chart option starts from: mobile-safe tooltip and labels, a
 * scrollable legend for the multi-series case, and ECharts' generated `aria`
 * description. Colors are never named here: they come from the chart theme.
 */
export function baseChartOption(): EChartsCoreOption {
  return {
    aria: { enabled: true },
    grid: { containLabel: true, left: 8, right: 16, top: 16, bottom: 8 },
    tooltip: baseTooltipOption(),
    legend: { type: 'scroll' },
    xAxis: { axisLabel: { hideOverlap: true } },
    yAxis: { axisLabel: { hideOverlap: true } },
  };
}
