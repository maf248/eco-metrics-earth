import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { wrappedLegend } from '@/components/charts/wrappedLegend';
import { escapeHtml } from '@/lib/escapeHtml';
import { formatCompact, formatOneDecimal } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { TreeCoverLossData, TreeCoverLossEntity } from '@eco-metrics/shared';

const STACK = 'loss';
const NO_VALUE = 'No value';
const MILLION = 1_000_000;
/** Space between the plot and its legend, as in the other charts. */
const AXIS_LEGEND_GAP = 17;

type LossRange = Pick<TreeCoverLossData, 'startYear' | 'endYear' | 'drivers'>;

/**
 * The year's total: the sum of the drivers that have a value, `null` only when every driver is
 * `null`. The payload carries no total, so the chart, its tooltip and the table all derive it here.
 */
export function treeCoverLossTotal(
  entity: TreeCoverLossEntity,
  drivers: TreeCoverLossData['drivers'],
  index: number,
): number | null {
  let total: number | null = null;
  for (const { id } of drivers) {
    const value = entity[id][index];
    if (value !== null && value !== undefined) {
      total = (total ?? 0) + value;
    }
  }
  return total;
}

const millionText = (hectares: number): string =>
  `${formatOneDecimal(hectares / MILLION)} million ha`;

interface AxisTooltipParam {
  axisValueLabel: string;
  dataIndex: number;
  marker: string;
  seriesName: string;
}

/** Year, each driver (a missing one says "No value", never zero) and the total. */
function tooltip(
  entity: TreeCoverLossEntity,
  drivers: TreeCoverLossData['drivers'],
  params: AxisTooltipParam[],
): string {
  const first = params[0];
  if (!first) {
    return '';
  }
  const markers = new Map(params.map(({ seriesName, marker }) => [seriesName, marker]));
  const rows = drivers.map(({ id, name }) => {
    const value = entity[id][first.dataIndex];
    const text = value === null || value === undefined ? NO_VALUE : millionText(value);
    return `${markers.get(name) ?? ''}${escapeHtml(name)}: <strong>${text}</strong>`;
  });
  const total = treeCoverLossTotal(entity, drivers, first.dataIndex);
  return [
    first.axisValueLabel,
    ...rows,
    `Total: <strong>${total === null ? NO_VALUE : millionText(total)}</strong>`,
  ].join('<br/>');
}

/**
 * Stacked bars of tree cover loss per year, one series per driver in the payload's order. Pure
 * and color-free: all drivers are always present, so each keeps its palette slot (the
 * `treeCoverLoss` palette) whatever the entity; a `null` value draws no segment. Values are shown in million
 * hectares (converted here, never in the payload) and the axis starts at zero.
 */
export function buildTreeCoverLossOption(
  entity: TreeCoverLossEntity,
  { startYear, endYear, drivers }: LossRange,
): EChartsCoreOption {
  const base = baseChartOption();
  const { legend, reserved, media } = wrappedLegend(
    drivers.map(({ name }) => name),
    (height) => ({ grid: { bottom: height + AXIS_LEGEND_GAP } }),
  );

  return {
    ...base,
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `${entity.name}: tree cover loss per year by dominant cause, in million hectares, ` +
          `${startYear} to ${endYear}. The data table below lists every year.`,
      },
    },
    grid: { ...(base.grid as object), ...reserved.grid },
    legend,
    media,
    tooltip: {
      ...baseTooltipOption(),
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisTooltipParam[]): string => tooltip(entity, drivers, params),
    },
    xAxis: {
      ...buildYearAxis({ startYear, endYear }),
      // Bars sit between the ticks, and every fifth year is labelled.
      boundaryGap: true,
      axisTick: {
        alignWithLabel: true,
        interval: (_index: number, year: string) => Number(year) % 5 === 0,
      },
      axisLabel: {
        hideOverlap: true,
        interval: (_index: number, year: string) => Number(year) % 5 === 0,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { hideOverlap: true, formatter: (value: number): string => formatCompact(value) },
    },
    series: drivers.map(({ id, name }) => ({
      type: 'bar',
      name,
      stack: STACK,
      emphasis: { disabled: true },
      data: entity[id].map((value) => (value === null ? null : value / MILLION)),
    })),
  };
}
