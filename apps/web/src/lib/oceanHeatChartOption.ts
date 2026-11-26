import type { EChartsCoreOption } from 'echarts/core';

import { baseChartOption, baseTooltipOption } from '@/components/charts/baseChartOption';
import { wrappedLegend } from '@/components/charts/wrappedLegend';
import { formatHeatContent } from '@/lib/formatNumber';
import { buildYearAxis } from '@/lib/yearAxis';
import type { OceanHeatContentData, OceanHeatDepth, OceanHeatSource } from '@eco-metrics/shared';

const NO_DATA = 'No data';
/** Space between the plot and the legend, as in the other charts. */
const AXIS_LEGEND_GAP = 17;

/**
 * The order sources take palette colors in, so a source keeps its color when the depth changes
 * (the 2000 m depth has three of the four). A source this list does not know follows them in the
 * order the payload gives.
 */
const SOURCE_ORDER = ['iap', 'noaa', 'mri', 'csiro'];

/** The sources of a depth in palette order. */
export function orderedSources(sources: readonly OceanHeatSource[]): OceanHeatSource[] {
  const rank = (id: string): number => {
    const index = SOURCE_ORDER.indexOf(id);
    return index === -1 ? SOURCE_ORDER.length : index;
  };
  return [...sources].sort((left, right) => rank(left.id) - rank(right.id));
}

/** What each source abbreviation stands for, in the section intro. */
const SOURCE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  iap: 'Institute of Atmospheric Physics, Chinese Academy of Sciences',
  noaa: 'National Centers for Environmental Information',
  mri: 'Meteorological Research Institute, Japan Meteorological Agency',
  csiro: 'Australia’s national science agency',
};

const listFormatter = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });

/**
 * The sources of one depth, in palette order, each with what its abbreviation stands for:
 * `IAP (Institute of …), NOAA (…), and MRI/JMA (…)`. Only the depth's own sources are named,
 * so CSIRO, which only covers the upper 700 m, is not listed for 2000 m.
 */
export function describeSources(sources: readonly OceanHeatSource[]): string {
  return listFormatter.format(
    orderedSources(sources).map(({ id, name }) =>
      SOURCE_DESCRIPTIONS[id] ? `${name} (${SOURCE_DESCRIPTIONS[id]})` : name,
    ),
  );
}

/** First and last year of a source with a value, or `undefined` when it has none. */
export function sourceSpan(
  { values }: Pick<OceanHeatSource, 'values'>,
  startYear: number,
): { from: number; to: number } | undefined {
  const first = values.findIndex((value) => value !== null);
  if (first === -1) {
    return undefined;
  }
  const last = values.length - 1 - [...values].reverse().findIndex((value) => value !== null);
  return { from: startYear + first, to: startYear + last };
}

interface AxisTooltipParam {
  axisValueLabel: string;
  marker: string;
  seriesName: string;
  value: unknown;
}

function tooltip(unit: string, params: AxisTooltipParam[]): string {
  const rows = params
    .filter(({ value }) => typeof value === 'number')
    .map(
      ({ marker, seriesName, value }) =>
        `${marker}${seriesName}: ${formatHeatContent(value as number)} ${unit}`,
    );
  return [params[0]?.axisValueLabel ?? '', ...(rows.length > 0 ? rows : [NO_DATA])].join('<br/>');
}

/**
 * One line per source of the selected depth on the shared year axis, with a legend that names
 * every source. Pure and color-free. A source keeps its palette position across depths; a year
 * a source does not cover is a `null` gap, never a zero, so its line simply stops.
 */
export function buildOceanHeatOption(
  depth: Pick<OceanHeatDepth, 'label' | 'sources'>,
  data: Pick<OceanHeatContentData, 'startYear' | 'endYear' | 'unit'>,
): EChartsCoreOption {
  const base = baseChartOption();
  const { startYear, endYear, unit } = data;
  const sources = orderedSources(depth.sources);
  const { legend, reserved, media } = wrappedLegend(
    sources.map(({ name }) => name),
    (height) => ({ grid: { bottom: height + AXIS_LEGEND_GAP } }),
  );

  return {
    ...base,
    // The generated description would print `null` as "NaN".
    aria: {
      enabled: true,
      label: {
        description:
          `World: ocean heat content down to ${depth.label.replace('–', ' to ')}, in ${unit}, ` +
          `${startYear} to ${endYear}, one line per source: ` +
          `${sources.map(({ name }) => name).join(', ')}. ` +
          'The data table below lists every year.',
      },
    },
    grid: { ...(base.grid as object), ...reserved.grid },
    legend,
    media,
    tooltip: {
      ...baseTooltipOption(),
      formatter: (params: AxisTooltipParam[]): string => tooltip(unit, params),
    },
    xAxis: buildYearAxis({ startYear, endYear }),
    yAxis: {
      type: 'value',
      // Each source is an anomaly against its own reference period: zero stays inside the axis.
      scale: false,
      axisLabel: {
        hideOverlap: true,
        formatter: (value: number): string => formatHeatContent(value),
      },
    },
    series: sources.map(({ name, values }) => ({
      type: 'line',
      name,
      data: values,
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2 },
      emphasis: { focus: 'series' },
    })),
  };
}
