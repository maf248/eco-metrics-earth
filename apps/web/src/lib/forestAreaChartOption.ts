import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { formatOneDecimal, formatWhole } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { ForestAreaData, ForestAreaEntity } from '@eco-metrics/shared';

/** The two measures of the explorer, hectares first. */
export type ForestMeasure = 'area' | 'share';

/** The unit the hectares axis is drawn in: million hectares, or thousand for small forests. */
export type ForestAreaUnit = 'million' | 'thousand';

export const FOREST_AREA_UNIT_LABELS: Record<ForestAreaUnit, string> = {
  million: 'million hectares',
  thousand: 'thousand hectares',
};

export const FOREST_SHARE_UNIT_LABEL = '% of land area';

const MILLION = 1_000_000;
const THOUSAND = 1_000;

/** Million hectares when the entity ever has at least 1 million hectares, otherwise thousand. */
export function forestAreaUnit(entity: Pick<ForestAreaEntity, 'area'>): ForestAreaUnit {
  const largest = Math.max(0, ...entity.area.filter((value): value is number => value !== null));
  return largest >= MILLION ? 'million' : 'thousand';
}

/** Hectares in the chosen unit; `null` stays `null` (a gap, never a zero). */
function scaled(values: (number | null)[], unit: ForestAreaUnit): (number | null)[] {
  const divisor = unit === 'million' ? MILLION : THOUSAND;
  return values.map((value) => (value === null ? null : value / divisor));
}

const shareFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Decimals an axis needs so that ticks about a tenth of the range apart print different text. */
function axisFractionDigits(extent: number, minimum: number): number {
  const needed = extent >= 10 ? 0 : extent >= 1 ? 1 : extent >= 0.1 ? 2 : 3;
  return Math.max(minimum, needed);
}

/**
 * Value-axis label formatter that follows the data (chart rule 12): the plain number in the axis
 * unit, with thousands separators and no compact suffix (a "K" on million hectares would read as
 * thousands of millions), and as many decimals as the data's range calls for, so adjacent ticks
 * never print the same text. A share adds a "%" and keeps at least one decimal.
 */
export function buildForestAxisFormatter(
  values: readonly (number | null)[],
  isShare: boolean,
): (value: number) => string {
  const present = values.filter((value): value is number => value !== null);
  // No data: no ticks are drawn, whole numbers are the quiet fallback.
  const extent = present.length > 0 ? Math.max(...present) - Math.min(...present) : Infinity;
  const digits = axisFractionDigits(extent, isShare ? 1 : 0);
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return (value: number): string => `${formatter.format(value)}${isShare ? '%' : ''}`;
}

/**
 * Line chart of one entity's forest area (hectares or share of land) over time. Pure and
 * color-free. The value axis follows the data (chart rule 12): the world's forest moves by under
 * 5% in 35 years, so a zero baseline would draw a flat line; the key figures, the tooltip and the
 * table carry the exact values. A missing year is a `null` gap, never a zero.
 */
export function buildForestAreaChartOption(
  entity: Pick<ForestAreaEntity, 'name' | 'area' | 'share'>,
  measure: ForestMeasure,
  range: Pick<ForestAreaData, 'startYear' | 'endYear'>,
  unit: ForestAreaUnit,
): EChartsCoreOption {
  const base = baseChartOption();
  const isArea = measure === 'area';
  const unitLabel = isArea ? FOREST_AREA_UNIT_LABELS[unit] : FOREST_SHARE_UNIT_LABEL;
  const format = (value: number): string =>
    isArea
      ? unit === 'million'
        ? formatOneDecimal(value)
        : formatWhole(value)
      : `${shareFormatter.format(value)}%`;

  const values = isArea ? scaled(entity.area, unit) : entity.share;

  return {
    ...base,
    legend: { show: false },
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `${entity.name}: forest ${isArea ? `area in ${unitLabel}` : 'as a share of land area'}, ` +
          `${range.startYear} to ${range.endYear}. The value axis does not start at zero. ` +
          'The data table below lists every year.',
      },
    },
    tooltip: {
      ...baseTooltipOption(),
      valueFormatter: (value: unknown): string =>
        typeof value === 'number' ? `${format(value)}${isArea ? ` ${unitLabel}` : ''}` : 'No data',
    },
    xAxis: buildYearAxis(range),
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        hideOverlap: true,
        formatter: buildForestAxisFormatter(values, !isArea),
      },
    },
    series: [
      {
        type: 'line',
        name: entity.name,
        data: values,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
      },
    ],
  };
}
