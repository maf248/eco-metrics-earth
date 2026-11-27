import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { wrappedLegend } from '@/components/charts/wrappedLegend';
import { formatTemperature } from '@/lib/oceanHealthKeyFigures';
import type { OceanSstDailyData } from '@eco-metrics/shared';

const NO_DATA = 'No data';
/** Space between the plot and the legend, as in the other charts. */
const AXIS_LEGEND_GAP = 17;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2024 is a leap year: slot `i` is its day `i + 1`, so 29 February is slot 59. */
const LEAP_YEAR = 2024;

/** Axis categories, one per calendar day of a leap year: `1 Jan` ... `31 Dec`. */
const DAY_LABELS: readonly string[] = Array.from({ length: 366 }, (_, slot) => {
  const date = new Date(Date.UTC(LEAP_YEAR, 0, slot + 1));
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
});

/** Only the first day of a month gets a label and a tick. */
const isMonthStart = (_index: number, label: string): boolean => label.startsWith('1 ');

/** Title of the climatology line, in the legend and the tooltip. */
export function climatologyLabel({ baseline }: Pick<OceanSstDailyData, 'baseline'>): string {
  return `${baseline.startYear}–${baseline.endYear} average`;
}

/** Year of an ISO date (`YYYY-MM-DD`). */
function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

/** The years drawn in a highlight color, and the names their legend and tooltip entries carry. */
export interface HighlightedYears {
  /** The year of the latest row. */
  current: { year: number; name: string };
  /** The year of the record day, or `undefined` when it is the current year (drawn once). */
  record?: { year: number; name: string };
}

/**
 * Names the two highlighted years. When the record falls in the current year there is one line
 * and its name says it is both; otherwise two lines with different palette positions.
 */
export function highlightedYears(
  data: Pick<OceanSstDailyData, 'endYear' | 'record'>,
): HighlightedYears {
  const recordYear = yearOf(data.record.date);
  if (recordYear === data.endYear) {
    return { current: { year: data.endYear, name: `${data.endYear} (current and record year)` } };
  }
  return {
    current: { year: data.endYear, name: `${data.endYear} (current year)` },
    record: { year: recordYear, name: `${recordYear} (record year)` },
  };
}

interface AxisTooltipParam {
  dataIndex: number;
}

/**
 * Overlay of every year of the daily series on a calendar-day axis. Earlier years are muted and
 * silent (context, not hover targets), the current and record years are highlighted, and the
 * climatology is a dashed reference curve. Pure and color-free: highlighted series take the first
 * palette colors in the order they are listed here, the muted ones only carry a flag the chart
 * wrapper resolves from the theme. Missing days (the days after the latest row, 29 February in a
 * common year) are `null` gaps, never zeros.
 */
export function buildOceanSstDailyOption(data: OceanSstDailyData): EChartsCoreOption {
  const base = baseChartOption();
  const { unit, coverage, years, climatology, startYear, endYear } = data;
  const highlight = highlightedYears(data);
  const climatologyName = climatologyLabel(data);

  const valuesOf = (year: number): (number | null)[] =>
    years.find((entry) => entry.year === year)?.values ?? [];
  const highlighted = [highlight.current, ...(highlight.record ? [highlight.record] : [])];
  const highlightedSet = new Set(highlighted.map(({ year }) => year));
  const legendLabels = [...highlighted.map(({ name }) => name), climatologyName];
  const { legend, reserved, media } = wrappedLegend(legendLabels, (height) => ({
    grid: { bottom: height + AXIS_LEGEND_GAP },
  }));

  const tooltipRows = (slot: number): string[] => [
    ...highlighted.map(({ year, name }) => {
      const value = valuesOf(year)[slot];
      return `${name}: ${value == null ? NO_DATA : `${formatTemperature(value)} ${unit}`}`;
    }),
    `${climatologyName}: ${
      climatology[slot] == null ? NO_DATA : `${formatTemperature(climatology[slot])} ${unit}`
    }`,
  ];

  return {
    ...base,
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `Daily average sea surface temperature of the ocean between ${coverage}, ` +
          `one line per year from ${startYear} to ${endYear}, with the ` +
          `${climatologyName} as a dashed line. ${highlighted.map(({ name }) => name).join(' and ')} ` +
          'are highlighted. The data table below lists the most recent days.',
      },
    },
    grid: { ...(base.grid as object), ...reserved.grid },
    legend: { ...legend, data: legendLabels },
    media,
    tooltip: {
      ...baseTooltipOption(),
      // The earlier years are context: the tooltip lists the highlighted ones and the average.
      formatter: (params: AxisTooltipParam | AxisTooltipParam[]): string => {
        const [{ dataIndex }] = Array.isArray(params) ? params : [params];
        return [DAY_LABELS[dataIndex], ...tooltipRows(dataIndex)].join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: DAY_LABELS,
      boundaryGap: false,
      axisTick: { alignWithLabel: true, interval: isMonthStart },
      axisLabel: {
        hideOverlap: true,
        interval: isMonthStart,
        formatter: (label: string): string => label.split(' ')[1],
      },
    },
    yAxis: {
      type: 'value',
      // Degrees Celsius around 20: a zero baseline would flatten every year onto one line.
      scale: true,
      axisLabel: { hideOverlap: true },
    },
    series: [
      // Palette positions follow this order among the unflagged series; `z` sets what is drawn on top.
      ...highlighted.map(({ year, name }) => ({
        type: 'line',
        name,
        data: valuesOf(year),
        z: 4,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
      })),
      {
        type: 'line',
        name: climatologyName,
        data: climatology,
        z: 3,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2, type: 'dashed' },
        emphasis: { focus: 'series' },
      },
      ...years
        .filter(({ year }) => !highlightedSet.has(year))
        .map(({ year, values }) => ({
          type: 'line',
          name: String(year),
          data: values,
          z: 2,
          muted: true,
          silent: true,
          animation: false,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 1 },
          emphasis: { disabled: true },
          tooltip: { show: false },
        })),
    ],
  };
}
