import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { legendHeight, legendRows, wrappedLegend } from '@/components/charts/wrappedLegend';
import { escapeHtml } from '@/lib/escapeHtml';
import { formatShare } from '@/lib/formatNumber';
import {
  WASTE_COMPOSITION_GROUPS,
  WASTE_COMPOSITION_LABELS,
  WASTE_TREATMENT_GROUPS,
  WASTE_TREATMENT_LABELS,
} from '@/lib/wasteMeasures';
import type { WasteCountry, WasteGeneration } from '@eco-metrics/shared';

interface MediaUnit {
  query?: { maxWidth: number };
  option: EChartsCoreOption;
}

const BAR_STACK = 'share';
/** Space between the value axis and its legend. */
const AXIS_LEGEND_GAP = 17;
const NOT_REPORTED = 'not reported';

/** Plot geometry of the stacked bars, in px: the chart box is sized from the same numbers. */
const BAR_ROW_HEIGHT = 32;
const BAR_GRID_TOP = 8;
const AXIS_LABELS_HEIGHT = 24;
/** Chart widths the legend is laid out for: a phone and the narrowest card from `sm` up. */
const NARROW_CHART_WIDTH = 360;
const WIDE_CHART_WIDTH = 600;
/** Wide enough for "Russian Federation" on one line; below `NARROW_QUERY_WIDTH` names wrap instead. */
const BAR_LABEL_WIDTH = 128;
const NARROW_BAR_LABEL_WIDTH = 84;
const NARROW_QUERY_WIDTH = 480;

const TREATMENT_LABELS = WASTE_TREATMENT_GROUPS.map((group) => WASTE_TREATMENT_LABELS[group]);
const COMPOSITION_LABELS = WASTE_COMPOSITION_GROUPS.map((group) => WASTE_COMPOSITION_LABELS[group]);

const reserveLegend = (height: number) => ({ grid: { bottom: height + AXIS_LEGEND_GAP } });
const TREATMENT_LEGEND = wrappedLegend(TREATMENT_LABELS, reserveLegend);
const COMPOSITION_LEGEND = wrappedLegend(COMPOSITION_LABELS, reserveLegend);

/** Height in px of a bars chart for `rows` countries on a phone and from `sm` up. */
export interface BarsChartHeights {
  narrow: number;
  wide: number;
}

function barsChartHeights(labels: readonly string[], rows: number): BarsChartHeights {
  const at = (width: number): number =>
    BAR_GRID_TOP +
    rows * BAR_ROW_HEIGHT +
    AXIS_LABELS_HEIGHT +
    AXIS_LEGEND_GAP +
    legendHeight(legendRows(labels, width));
  return { narrow: at(NARROW_CHART_WIDTH), wide: at(WIDE_CHART_WIDTH) };
}

export const treatmentBarsHeights = (rows: number): BarsChartHeights =>
  barsChartHeights(TREATMENT_LABELS, rows);
export const compositionBarsHeights = (rows: number): BarsChartHeights =>
  barsChartHeights(COMPOSITION_LABELS, rows);

const labelWidth = (width: number) => ({ yAxis: { axisLabel: { width } } });

/**
 * The legend's per-width options plus the width of the country labels: the default entry sets the
 * wide width so widening a chart again restores it, and narrow charts wrap names instead.
 */
function withLabelWidths(media: typeof TREATMENT_LEGEND.media): MediaUnit[] {
  const [first, ...rest] = media;
  return [
    { ...first, option: { ...first.option, ...labelWidth(BAR_LABEL_WIDTH) } },
    ...rest,
    { query: { maxWidth: NARROW_QUERY_WIDTH }, option: labelWidth(NARROW_BAR_LABEL_WIDTH) },
  ];
}

interface BarsInput<G extends string> {
  /** Countries to draw, top to bottom; each has its shares and data year. */
  rows: readonly { code: string; name: string; year: number; shares: Record<G, number | null> }[];
  groups: readonly G[];
  labels: Record<G, string>;
  legend: typeof TREATMENT_LEGEND;
  /** Names the chart for assistive technology. */
  description: string;
}

interface BarTooltipParam {
  dataIndex: number;
}

/**
 * Horizontal stacked bars, one per country, each summing to 100%. Color-free. A group that is
 * not reported is `null`: no bar segment, and the tooltip names it as not reported.
 */
function buildBarsOption<G extends string>({
  rows,
  groups,
  labels,
  legend,
  description,
}: BarsInput<G>): EChartsCoreOption {
  const base = baseChartOption();
  return {
    ...base,
    aria: { enabled: true, label: { description } },
    grid: { containLabel: true, left: 8, right: 16, top: BAR_GRID_TOP, ...legend.reserved.grid },
    legend: legend.legend,
    media: withLabelWidths(legend.media),
    tooltip: {
      ...baseTooltipOption(),
      axisPointer: { type: 'shadow' },
      formatter: (params: BarTooltipParam[]): string => {
        const row = rows[params[0]?.dataIndex ?? -1];
        if (!row) {
          return '';
        }
        const lines = groups.map((group) => {
          const share = row.shares[group];
          const text = share === null ? NOT_REPORTED : `${formatShare(share)}%`;
          return `${escapeHtml(labels[group])}: <strong>${text}</strong>`;
        });
        return [`${escapeHtml(row.name)} · ${row.year}`, ...lines].join('<br/>');
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { hideOverlap: true, formatter: (value: number): string => `${value}%` },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(({ name }) => name),
      // Names break onto a second line instead of being cut; the tooltip has the full name.
      axisLabel: { hideOverlap: false, width: BAR_LABEL_WIDTH, overflow: 'break' },
    },
    series: groups.map((group) => ({
      type: 'bar',
      name: labels[group],
      stack: BAR_STACK,
      emphasis: { disabled: true },
      data: rows.map(({ shares }) => shares[group]),
    })),
  };
}

type TreatedCountry = WasteCountry & { treatment: NonNullable<WasteCountry['treatment']> };
type CompositionCountry = WasteCountry & {
  composition: NonNullable<WasteCountry['composition']>;
};

export const hasTreatment = (country: WasteCountry): country is TreatedCountry =>
  country.treatment !== undefined;
export const hasComposition = (country: WasteCountry): country is CompositionCountry =>
  country.composition !== undefined;

/** Bars of what happens to the waste in the given countries (those with treatment data). */
export function buildTreatmentBarsOption(countries: readonly TreatedCountry[]): EChartsCoreOption {
  return buildBarsOption({
    rows: countries.map(({ code, name, treatment }) => ({ code, name, ...treatment })),
    groups: WASTE_TREATMENT_GROUPS,
    labels: WASTE_TREATMENT_LABELS,
    legend: TREATMENT_LEGEND,
    description: `Stacked bars of what happens to the municipal waste of ${countries.length} countries, as shares of 100%. The table below lists every value.`,
  });
}

/** Bars of what the waste is made of in the given countries (those with composition data). */
export function buildCompositionBarsOption(
  countries: readonly CompositionCountry[],
): EChartsCoreOption {
  return buildBarsOption({
    rows: countries.map(({ code, name, composition }) => ({ code, name, ...composition })),
    groups: WASTE_COMPOSITION_GROUPS,
    labels: WASTE_COMPOSITION_LABELS,
    legend: COMPOSITION_LEGEND,
    description: `Stacked bars of what the municipal waste of ${countries.length} countries is made of, as shares of 100%. The table below lists every value.`,
  });
}

export const PROJECTION_YEARS = [2022, 2030, 2040, 2050] as const;

interface ProjectionUnit {
  divisor: number;
  label: string;
}

/** Unit that keeps the numbers of a projection readable: billion, million or thousand tonnes. */
export function projectionUnit(largestTonnes: number): ProjectionUnit {
  if (largestTonnes >= 1e9) {
    return { divisor: 1e9, label: 'billion tonnes' };
  }
  if (largestTonnes >= 1e6) {
    return { divisor: 1e6, label: 'million tonnes' };
  }
  return { divisor: 1e3, label: 'thousand tonnes' };
}

type Projectable = Pick<WasteGeneration, 'tonnes2022' | 'tonnes2030' | 'tonnes2040' | 'tonnes2050'>;

export function projectionTonnes(generation: Projectable): number[] {
  return [
    generation.tonnes2022,
    generation.tonnes2030,
    generation.tonnes2040,
    generation.tonnes2050,
  ];
}

const formatInUnit = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A tonnage in the unit of its projection with two decimals, e.g. `2.33`. */
export function formatProjected(tonnes: number, unit: ProjectionUnit): string {
  return formatInUnit(tonnes / unit.divisor);
}

/**
 * Line chart of the municipal waste generated in 2022, 2030, 2040 and 2050 for one entity, in
 * `unit`. Color-free; the later years are projections, said in the title and the description.
 */
export function buildProjectionOption(
  name: string,
  generation: Projectable,
  unit: ProjectionUnit,
): EChartsCoreOption {
  const tonnes = projectionTonnes(generation);
  const base = baseChartOption();

  return {
    ...base,
    aria: {
      enabled: true,
      label: {
        description: `${name}: municipal waste generated in ${PROJECTION_YEARS.join(', ')}, in ${unit.label}. 2030 to 2050 are World Bank projections. The table below lists every value.`,
      },
    },
    legend: { show: false },
    tooltip: {
      ...baseTooltipOption(),
      formatter: ([{ axisValueLabel, value }]: {
        axisValueLabel: string;
        value: number;
      }[]): string => {
        const suffix = axisValueLabel === '2022' ? '' : ' (projection)';
        return `${axisValueLabel}${suffix}<br/><strong>${formatInUnit(value)} ${unit.label}</strong>`;
      },
    },
    xAxis: { type: 'category', data: PROJECTION_YEARS.map(String) },
    // The line is the point of the chart, so the axis follows the data (padded) instead of
    // starting at zero; the labels and the table below give the exact values.
    yAxis: {
      type: 'value',
      scale: true,
      boundaryGap: ['15%', '15%'],
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string =>
          value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      },
    },
    series: [
      {
        type: 'line',
        name,
        symbolSize: 8,
        data: tonnes.map((value) => Number((value / unit.divisor).toFixed(4))),
      },
    ],
  };
}
