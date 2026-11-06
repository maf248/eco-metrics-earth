import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { wrappedLegend } from '@/components/charts/wrappedLegend';
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
const SOURCE_LABELS = ENERGY_SOURCE_IDS.map((id) => ENERGY_SOURCE_LABELS[id]);
/**
 * Space between a plot and its legend, matching the ~22 px between the chart title and the plot
 * so the chart breathes the same above and below: with the legend's own 5 px padding for the
 * area, and above the ring, which fills its box, for the donut.
 */
const AXIS_LEGEND_GAP = 17;
const DONUT_LEGEND_GAP = 17;
/** Space above the ring; with the title's 8 px margin it comes to the same ~22 px. */
const DONUT_TOP = 14;

// The labels never change, so each chart's legend and its reserved room are built once.
// The area legend sits under the year axis; the grid leaves it room at every width.
const AREA_LEGEND = wrappedLegend(SOURCE_LABELS, (height) => ({
  grid: { bottom: height + AXIS_LEGEND_GAP },
}));
// The ring is laid out in a box that ends above the legend at every width.
const DONUT_LEGEND = wrappedLegend(SOURCE_LABELS, (height) => ({
  series: [{ bottom: height + DONUT_LEGEND_GAP }],
}));

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
  const { legend, reserved, media } = AREA_LEGEND;

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
    grid: { ...(base.grid as object), ...reserved.grid },
    legend,
    media,
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
  const { legend, reserved, media } = DONUT_LEGEND;
  const [pieBox] = reserved.series;

  return {
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: { description: `${entity.name}: electricity mix in ${year}. ${summary}.` },
    },
    legend,
    media,
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
        ...pieBox,
        top: DONUT_TOP,
        radius: ['56%', '100%'],
        label: { show: false },
        labelLine: { show: false },
        emphasis: { focus: 'self' },
        data,
      },
    ],
  };
}
