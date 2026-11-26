import type { EChartsCoreOption } from 'echarts/core';

/** The slice of a series option the muted role reads and rewrites. */
interface SeriesOption {
  muted?: boolean;
  lineStyle?: Record<string, unknown>;
  itemStyle?: Record<string, unknown>;
  [key: string]: unknown;
}

function seriesOf(option: EChartsCoreOption): SeriesOption[] {
  const { series } = option as { series?: unknown };
  if (Array.isArray(series)) {
    return series as SeriesOption[];
  }
  return series ? [series as SeriesOption] : [];
}

/** True when any series of the option is flagged `muted: true`. */
export function hasMutedSeries(option: EChartsCoreOption): boolean {
  return seriesOf(option).some((series) => series.muted === true);
}

/**
 * Gives every series flagged `muted: true` the muted line color of the active theme and drops the
 * flag, which ECharts does not know. An option builder only ever writes the flag, never a color.
 * Unflagged series are returned untouched. The color is written on the series, its items and its
 * line: with only the line colored ECharts still hands the series a palette slot (through the
 * item markers), which would push the unflagged series to later palette colors.
 */
export function applyMutedRole(option: EChartsCoreOption, mutedLine: string): EChartsCoreOption {
  const series = seriesOf(option).map(({ muted, ...rest }) =>
    muted === true
      ? {
          ...rest,
          color: mutedLine,
          itemStyle: { ...rest.itemStyle, color: mutedLine },
          lineStyle: { ...rest.lineStyle, color: mutedLine },
        }
      : rest,
  );
  return { ...option, series };
}
