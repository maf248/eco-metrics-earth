import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { wrappedLegend } from '@/components/charts/wrappedLegend';
import { formatDayMonthYear, formatMonthYear } from '@/lib/oceanHealthKeyFigures';
import type { OceanSeaLevelData } from '@eco-metrics/shared';

/** Space between the plot and the legend, as in the other charts. */
const AXIS_LEGEND_GAP = 17;
/** Days after which the last observation no longer counts as current. */
const CURRENT_WITHIN_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

const levelFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** Millimetres with one or two decimals and the real minus sign: `103.2`, `−19.33`. */
export function formatSeaLevel(value: number): string {
  return levelFormatter.format(value).replace('-', '−');
}

/**
 * What the page says about the end of the series, derived from the data: the month of the last
 * observation, and whether that is recent against the time the payload was fetched. The NOAA file
 * is frozen upstream, so the page must not imply it is current.
 */
export function seaLevelEndNote(
  { endDate }: Pick<OceanSeaLevelData, 'endDate'>,
  fetchedAt: string,
): { month: string; current: boolean } {
  const ageMs = new Date(fetchedAt).getTime() - new Date(`${endDate}T00:00:00Z`).getTime();
  return { month: formatMonthYear(endDate), current: ageMs <= CURRENT_WITHIN_DAYS * DAY_MS };
}

interface AxisTooltipParam {
  marker: string;
  seriesName: string;
  value: [string, number];
}

function tooltip(unit: string, params: AxisTooltipParam[]): string {
  if (params.length === 0) {
    return 'No data';
  }
  const rows = params.map(
    ({ marker, seriesName, value }) =>
      `${marker}${seriesName}: ${formatSeaLevel(value[1])} ${unit}`,
  );
  return [formatDayMonthYear(params[0].value[0]), ...rows].join('<br/>');
}

/**
 * One line per satellite mission on a time axis, each in its own palette color with a legend.
 * Pure and color-free. Missions overlap in time and are observations, not a series with gaps: a
 * mission only has points where it observed. No zero line: the values are relative to the file's
 * own reference.
 */
export function buildOceanSeaLevelOption(
  data: Pick<OceanSeaLevelData, 'missions' | 'unit' | 'startDate' | 'endDate'>,
): EChartsCoreOption {
  const base = baseChartOption();
  const { missions, unit, startDate, endDate } = data;
  const { legend, reserved, media } = wrappedLegend(
    missions.map(({ name }) => name),
    (height) => ({ grid: { bottom: height + AXIS_LEGEND_GAP } }),
  );

  return {
    ...base,
    aria: {
      enabled: true,
      label: {
        description:
          `Global mean sea level anomaly in ${unit} from satellite altimetry, ` +
          `${formatDayMonthYear(startDate)} to ${formatDayMonthYear(endDate)}, one line per ` +
          `mission: ${missions.map(({ name }) => name).join(', ')}. ` +
          'The data table below lists the yearly average of every mission.',
      },
    },
    grid: { ...(base.grid as object), ...reserved.grid },
    legend,
    media,
    tooltip: {
      ...baseTooltipOption(),
      formatter: (params: AxisTooltipParam[]): string => tooltip(unit, params),
    },
    xAxis: { type: 'time', axisLabel: { hideOverlap: true } },
    yAxis: {
      type: 'value',
      // Millimetres against the file's own reference: the axis follows the data.
      scale: true,
      axisLabel: { hideOverlap: true },
    },
    series: missions.map(({ name, dates, values }) => ({
      type: 'line',
      name,
      data: dates.map((date, index) => [date, values[index]]),
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 1.5 },
      emphasis: { focus: 'series' },
    })),
  };
}
