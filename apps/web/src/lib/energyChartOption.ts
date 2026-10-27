import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import {
  ENERGY_SOURCE_LABELS,
  generationAt,
  shareSeries,
  sharesOf,
  type EnergyMetric,
} from '@/lib/energyMix';
import { formatCompact, formatShare, formatTwh } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import { ENERGY_SOURCE_IDS } from '@eco-metrics/shared';
import type { EnergySourcesEntity } from '@eco-metrics/shared';

const STACK = 'mix';
const NO_DATA = 'No data';

interface AxisTooltipParam {
  axisValueLabel: string;
  marker: string;
  seriesName: string;
  value: unknown;
}

/**
 * Axis tooltip listing only the sources that generated something that year: a reported
 * zero or a missing value adds a row of noise, and the tables still show every source.
 */
function areaTooltip(metric: EnergyMetric, params: AxisTooltipParam[]): string {
  const rows = params
    .filter(({ value }) => typeof value === 'number' && value > 0)
    .map(({ marker, seriesName, value }) => {
      const text =
        metric === 'share'
          ? `${formatShare(value as number)}%`
          : `${formatTwh(value as number)} TWh`;
      return `${marker}${seriesName}: <strong>${text}</strong>`;
    });
  return [params[0]?.axisValueLabel ?? '', ...(rows.length > 0 ? rows : [NO_DATA])].join('<br/>');
}

/**
 * Stacked area chart of one entity's mix over time. Color-free: all eight series are always
 * emitted in the fixed order, so each keeps its palette colour; areas are opaque (validated
 * colours) and missing values stay `null` gaps, never zeros.
 */
export function buildEnergyAreaOption(
  entity: Pick<EnergySourcesEntity, 'name' | 'generation'>,
  metric: EnergyMetric,
  range: { startYear: number; endYear: number },
): EChartsCoreOption {
  const base = baseChartOption();
  const values = metric === 'share' ? shareSeries(entity) : entity.generation;

  return {
    ...base,
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `${entity.name}: electricity ${metric} by source, ${range.startYear} to ` +
          `${range.endYear}. The data table below lists every year.`,
      },
    },
    // The legend sits under the year axis; the grid leaves it room so they never overlap.
    grid: { ...(base.grid as object), bottom: 40 },
    legend: { type: 'scroll', show: true, bottom: 0, icon: 'roundRect' },
    tooltip: {
      ...baseTooltipOption(),
      formatter: (params: AxisTooltipParam[]): string => areaTooltip(metric, params),
    },
    xAxis: buildYearAxis(range),
    yAxis:
      metric === 'share'
        ? {
            type: 'value',
            min: 0,
            max: 100,
            axisLabel: {
              hideOverlap: true,
              formatter: (value: number): string => `${value}%`,
            },
          }
        : {
            type: 'value',
            min: 0,
            // Fits the data; `null` clears the share axis' 100, which `setOption` would otherwise keep.
            max: null,
            axisLabel: {
              hideOverlap: true,
              formatter: (value: number): string => formatCompact(value),
            },
          },
    series: ENERGY_SOURCE_IDS.map((id) => ({
      type: 'line',
      name: ENERGY_SOURCE_LABELS[id],
      stack: STACK,
      symbol: 'none',
      connectNulls: false,
      // No outline: a source at zero would otherwise still draw a coloured line on the stack.
      lineStyle: { width: 0 },
      areaStyle: { opacity: 1 },
      // Blurring the other bands of an opaque stack reads as missing colour, so hover changes nothing.
      emphasis: { disabled: true },
      data: values[id],
    })),
  };
}

interface DonutItem {
  name: string;
  /** The share of the year; `null` when the source has no value. */
  value: number | null;
  /** The generation behind the share, shown in the tooltip. */
  generation: number | null;
}

/**
 * Donut of one entity's mix in one year. Color-free: all eight items are always present in the
 * fixed order; a source without a value is `null` (no slice). Slices are shares, the tooltip adds TWh.
 */
export function buildEnergyDonutOption(
  entity: Pick<EnergySourcesEntity, 'name' | 'generation'>,
  year: number,
  startYear: number,
): EChartsCoreOption {
  const index = year - startYear;
  const generation = generationAt(entity.generation, index);
  const shares = sharesOf(generation);
  const data: DonutItem[] = ENERGY_SOURCE_IDS.map((id) => ({
    name: ENERGY_SOURCE_LABELS[id],
    value: shares[id],
    generation: generation[id],
  }));

  const summary = data
    .map(({ name, value }) => `${name} ${value === null ? 'no data' : `${formatShare(value)}%`}`)
    .join('; ');

  return {
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: { description: `${entity.name}: electricity mix in ${year}. ${summary}.` },
    },
    legend: { type: 'scroll', show: true },
    tooltip: {
      confine: true,
      trigger: 'item',
      formatter: (params: unknown): string => {
        const { name, data: item } = params as { name: string; data: DonutItem };
        if (item.value === null || item.generation === null) {
          return `${name}: ${NO_DATA}`;
        }
        return `${name}: ${formatShare(item.value)}% (${formatTwh(item.generation)} TWh)`;
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '72%'],
        label: { show: false },
        labelLine: { show: false },
        emphasis: { focus: 'self' },
        data,
      },
    ],
  };
}
