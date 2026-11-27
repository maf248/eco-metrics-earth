import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { wrappedLegend } from '@/components/charts/wrappedLegend';
import { formatDayMonthYear } from '@/lib/oceanHealthKeyFigures';
import type { OceanPhData } from '@eco-metrics/shared';

/** Space between the plot and the legend, as in the other charts. */
const AXIS_LEGEND_GAP = 17;

/** Names of the two series, in the legend, the tooltip and the table. */
export const PH_MONTHLY_LABEL = 'Monthly measurement';
export const PH_ROLLING_LABEL = 'Rolling yearly average';

const phFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const phAxisFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** pH with three decimals: `8.110`. */
export function formatPh(value: number): string {
  return phFormatter.format(value);
}

interface AxisTooltipParam {
  marker: string;
  seriesName: string;
  value: [string, number | null];
}

function tooltip(unit: string, params: AxisTooltipParam[]): string {
  const present = params.filter(({ value }) => value[1] !== null);
  if (present.length === 0) {
    return 'No data';
  }
  return [
    formatDayMonthYear(present[0].value[0]),
    ...present.map(
      ({ marker, seriesName, value }) =>
        `${marker}${seriesName}: ${formatPh(value[1] as number)} ${unit}`,
    ),
  ].join('<br/>');
}

/**
 * Monthly pH measurements as markers with no connecting line, and the rolling yearly average as a
 * line drawn over them, on a time axis. Pure and color-free. pH moves by about 0.1 in decades, so
 * the value axis follows the data (a zero baseline would flatten it to one line); the table
 * under the chart lists every exact value. A missing value is `null`: a gap, never a zero, and
 * the rolling line starts where its values begin.
 */
export function buildOceanPhOption(
  data: Pick<OceanPhData, 'dates' | 'monthly' | 'yearlyAverage' | 'station' | 'unit'>,
): EChartsCoreOption {
  const base = baseChartOption();
  const { dates, monthly, yearlyAverage, station, unit } = data;
  const { legend, reserved, media } = wrappedLegend(
    [PH_MONTHLY_LABEL, PH_ROLLING_LABEL],
    (height) => ({ grid: { bottom: height + AXIS_LEGEND_GAP } }),
  );
  const pairs = (values: (number | null)[]): [string, number | null][] =>
    dates.map((date, index) => [date, values[index]]);

  return {
    ...base,
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `Ocean ${unit} at ${station}, ${formatDayMonthYear(dates[0])} to ` +
          `${formatDayMonthYear(dates[dates.length - 1])}: monthly measurements as points and the ` +
          'rolling yearly average as a line. The data table below lists every month.',
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
      scale: true,
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string => phAxisFormatter.format(value),
      },
    },
    series: [
      {
        type: 'line',
        name: PH_MONTHLY_LABEL,
        data: pairs(monthly),
        // Points only: the measurements are samples taken on cruises, not a continuous record.
        lineStyle: { width: 0 },
        symbol: 'circle',
        symbolSize: 4,
        connectNulls: false,
        emphasis: { focus: 'series' },
      },
      {
        type: 'line',
        name: PH_ROLLING_LABEL,
        data: pairs(yearlyAverage),
        z: 3,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 2 },
        emphasis: { focus: 'series' },
      },
    ],
  };
}
