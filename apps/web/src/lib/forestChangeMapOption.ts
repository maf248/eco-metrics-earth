import type { EChartsCoreOption } from 'echarts/core';

import { escapeHtml } from '@/lib/escapeHtml';
import { FOREST_CHANGE_CLASS_BREAKS, forestChange, roundPercent } from '@/lib/forestChange';
import { formatSignedPercent, formatSignedWhole } from '@/lib/formatNumber';
import {
  WORLD_MAP_NAME,
  WORLD_MAP_NAME_PROPERTY,
  WORLD_MAP_SCALE_LIMIT,
  type WorldRegion,
} from '@/lib/worldGeometry';
import { WORLD_ENTITY_CODE } from '@eco-metrics/shared';
import type { ForestAreaData } from '@eco-metrics/shared';

/** Legend labels of the seven classes, loss end to gain end, with the real minus sign. */
export const FOREST_CHANGE_CLASS_LABELS = [
  '< −50%',
  '−50 to −25%',
  '−25 to −5%',
  '−5 to +5%',
  '+5 to +25%',
  '+25 to +50%',
  '≥ +50%',
] as const;

interface CountryItem {
  name: string;
  /** Percent change rounded to one decimal: the value the classes and the table use. */
  value: number;
  label: string;
  hectares: number;
  selected?: boolean;
}

interface NoDataItem {
  name: string;
  value: number;
  silent: true;
  emphasis: { disabled: true };
  tooltip: { show: false };
}

function pieces(): { lt?: number; gte?: number }[] {
  const breaks = FOREST_CHANGE_CLASS_BREAKS;
  return [
    { lt: breaks[0] },
    ...breaks.slice(1).map((upper, index) => ({ gte: breaks[index], lt: upper })),
    { gte: breaks[breaks.length - 1] },
  ];
}

/** Tooltip of a country: its name, the signed percentage and the signed net change in hectares. */
export function formatForestChangeTooltip(
  item: Pick<CountryItem, 'label' | 'value' | 'hectares'>,
  startYear: number,
): string {
  return (
    `<strong>${escapeHtml(item.label)}</strong><br/>` +
    `${formatSignedPercent(item.value)} since ${startYear}<br/>` +
    `${formatSignedWhole(item.hectares)} hectares net change`
  );
}

interface ForestChangeMapInput {
  regions: readonly WorldRegion[];
  data: Pick<ForestAreaData, 'startYear' | 'endYear' | 'entities'>;
  /** Entity code of the selected country, or `null`. */
  selectedCode: string | null;
}

/**
 * World map of the percentage change in forest area between the first and the last year, in
 * seven classes centred on zero. Pure and color-free: classes and the no-data fill come from the
 * chart theme (ramp `divergent`). Countries only; a country without a percentage (no first
 * value, or a first value of 0) and every region without an entity are inert.
 */
export function buildForestChangeMapOption({
  regions,
  data,
  selectedCode,
}: ForestChangeMapInput): EChartsCoreOption {
  const entities = new Map(data.entities.map((entity) => [entity.code, entity]));
  const description =
    `World map of the percentage change in forest area between ${data.startYear} and ` +
    `${data.endYear}, in seven classes from a loss of more than 50% to a gain of more than 50%. ` +
    'The ranking table below lists every country.';

  const items = regions.map(({ key, code }): CountryItem | NoDataItem => {
    const entity = code && code !== WORLD_ENTITY_CODE ? entities.get(code) : undefined;
    const change = entity ? forestChange(entity, data) : undefined;
    if (!code || !entity || !change || change.percent === null) {
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
      value: roundPercent(change.percent),
      label: entity.name,
      hectares: change.hectares,
      // Always explicit: setOption merges, so an omitted flag would keep a previous selection.
      selected: code === selectedCode,
    };
  });

  return {
    aria: { enabled: true, label: { description } },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: { data?: Partial<CountryItem> }): string => {
        const item = params.data;
        if (!item?.label || item.value === undefined || item.hectares === undefined) {
          return '';
        }
        return formatForestChangeTooltip(
          { label: item.label, value: item.value, hectares: item.hectares },
          data.startYear,
        );
      },
    },
    visualMap: { type: 'piecewise', show: false, pieces: pieces() },
    series: [
      {
        type: 'map',
        map: WORLD_MAP_NAME,
        nameProperty: WORLD_MAP_NAME_PROPERTY,
        // ECharts stretches the map to a box with all four sides set: the container keeps the
        // map's own aspect ratio (ChartSkeleton's `map` variant).
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
