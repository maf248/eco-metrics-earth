import type { EChartsCoreOption } from 'echarts/core';

import { escapeHtml } from '@/lib/escapeHtml';
import {
  formatMeasureValue,
  measureDefinition,
  readMeasure,
  type WasteMeasure,
} from '@/lib/wasteMeasures';
import {
  WORLD_MAP_NAME,
  WORLD_MAP_NAME_PROPERTY,
  WORLD_MAP_SCALE_LIMIT,
  type WorldRegion,
} from '@/lib/worldGeometry';
import type { WasteCountry } from '@eco-metrics/shared';

interface CountryItem {
  name: string;
  value: number;
  label: string;
  year: string;
  note: string | null;
  selected?: boolean;
}

interface NoDataItem {
  name: string;
  value: number;
  silent: true;
  emphasis: { disabled: true };
  tooltip: { show: false };
}

/** Tooltip text of a country: value, data year (or "2022 estimate") and what is not reported. */
function formatWasteMapTooltip(
  measure: WasteMeasure,
  item: Pick<CountryItem, 'label' | 'value' | 'year' | 'note'>,
): string {
  const lines = [
    `<strong>${escapeHtml(item.label)}</strong> · ${escapeHtml(item.year)}`,
    formatMeasureValue(measure, item.value),
  ];
  if (item.note) {
    lines.push(escapeHtml(item.note));
  }
  return lines.join('<br/>');
}

function pieces(breaks: readonly number[]): { lt?: number; gte?: number }[] {
  return [
    { lt: breaks[0] },
    ...breaks.slice(1).map((upper, index) => ({ gte: breaks[index], lt: upper })),
    { gte: breaks.at(-1) },
  ];
}

interface WasteMapOptionInput {
  regions: readonly WorldRegion[];
  countries: readonly WasteCountry[];
  measure: WasteMeasure;
  /** Entity code of the selected country, or `null`. */
  selectedCode?: string | null;
}

/**
 * World map of one waste measure, in five classes. Pure and color-free: the classes and the
 * no-data fill come from the chart theme. Every region gets an item, so a region without a
 * value (not reported, never 0) is inert instead of ECharts' default.
 */
export function buildWasteMapOption({
  regions,
  countries,
  measure,
  selectedCode = null,
}: WasteMapOptionInput): EChartsCoreOption {
  const { title, breaks } = measureDefinition(measure);
  const byCode = new Map(countries.map((country) => [country.code, country]));

  const items = regions.map(({ key, code }): CountryItem | NoDataItem => {
    const country = code ? byCode.get(code) : undefined;
    const reading = country ? readMeasure(country, measure) : undefined;
    if (!code || !country || reading?.value == null || reading.yearLabel === null) {
      return {
        name: key,
        value: Number.NaN,
        silent: true,
        emphasis: { disabled: true },
        tooltip: { show: false },
      };
    }
    return {
      name: code,
      value: reading.value,
      label: country.name,
      year: reading.yearLabel,
      note: reading.note,
      ...(code === selectedCode ? { selected: true } : {}),
    };
  });

  return {
    aria: {
      enabled: true,
      label: {
        description: `World map: ${title}. The country table below lists every country, including those that do not report it.`,
      },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: { data?: Partial<CountryItem> }): string => {
        const item = params.data;
        if (!item?.label || item.value === undefined || item.year === undefined) {
          return '';
        }
        return formatWasteMapTooltip(measure, {
          label: item.label,
          value: item.value,
          year: item.year,
          note: item.note ?? null,
        });
      },
    },
    visualMap: { type: 'piecewise', show: false, pieces: pieces(breaks) },
    series: [
      {
        type: 'map',
        map: WORLD_MAP_NAME,
        nameProperty: WORLD_MAP_NAME_PROPERTY,
        aspectScale: 1,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        showLegendSymbol: false,
        roam: true,
        scaleLimit: WORLD_MAP_SCALE_LIMIT,
        selectedMode: 'single',
        data: items,
      },
    ],
  };
}
