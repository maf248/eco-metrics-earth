import type { EChartsCoreOption } from 'echarts/core';

import { escapeHtml } from '@/lib/escapeHtml';
import { formatPerCapita, formatTotal } from '@/lib/formatNumber';
import {
  WORLD_MAP_NAME,
  WORLD_MAP_NAME_PROPERTY,
  WORLD_MAP_SCALE_LIMIT,
  type WorldRegion,
} from '@/lib/worldGeometry';
import type { Co2EmissionsData, Co2EmissionsEntity } from '@eco-metrics/shared';

/** Upper bounds (tonnes of CO2 per person) of the first four classes; the fifth is open. */
export const CO2_MAP_CLASS_BREAKS = [1, 3, 6, 10] as const;

/** Legend labels of the five classes, low to high. */
export const CO2_MAP_CLASS_LABELS = ['< 1 t', '1–3 t', '3–6 t', '6–10 t', '≥ 10 t'] as const;

interface CountryItem {
  name: string;
  value: number;
  label: string;
  total: number | null;
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
  const [first] = CO2_MAP_CLASS_BREAKS;
  return [
    { lt: first },
    ...CO2_MAP_CLASS_BREAKS.slice(1).map((upper, index) => ({
      gte: CO2_MAP_CLASS_BREAKS[index],
      lt: upper,
    })),
    { gte: CO2_MAP_CLASS_BREAKS[CO2_MAP_CLASS_BREAKS.length - 1] },
  ];
}

/** Tooltip text of a country; a missing total is said, never printed as a number. */
export function formatCo2MapTooltip(item: Omit<CountryItem, 'name'>, year: number): string {
  const total = item.total === null ? 'Total: no data' : `${formatTotal(item.total)} Mt total`;
  return `<strong>${escapeHtml(item.label)}</strong> · ${year}<br/>${formatPerCapita(item.value)} t per person<br/>${total}`;
}

interface Co2MapOptionInput {
  regions: readonly WorldRegion[];
  data: Pick<Co2EmissionsData, 'startYear' | 'entities'>;
  year: number;
  /** Entity code of the selected country, or `null`. */
  selectedCode: string | null;
}

/**
 * World map of CO2 emissions per capita in `year`, in five classes. Pure and color-free: the
 * classes and the no-data fill come from the chart theme. Every region gets an item, so a region
 * without a value is inert (no hover, tooltip or selection) instead of ECharts' default.
 */
export function buildCo2MapOption({
  regions,
  data,
  year,
  selectedCode,
}: Co2MapOptionInput): EChartsCoreOption {
  const index = year - data.startYear;
  const entities = new Map<string, Co2EmissionsEntity>(
    data.entities.map((entity) => [entity.code, entity]),
  );

  const items = regions.map(({ key, code }): CountryItem | NoDataItem => {
    const entity = code ? entities.get(code) : undefined;
    const perCapita = entity?.perCapita[index] ?? null;
    if (!code || !entity || perCapita === null) {
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
      value: perCapita,
      label: entity.name,
      total: entity.total[index] ?? null,
      ...(code === selectedCode ? { selected: true } : {}),
    };
  });

  return {
    aria: {
      enabled: true,
      label: {
        description: `World map of CO2 emissions per capita in ${year}, in tonnes per person. The ranking table below lists every country.`,
      },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: { data?: Partial<CountryItem> }): string => {
        const item = params.data;
        if (!item?.label || item.value === undefined) {
          return '';
        }
        return formatCo2MapTooltip(
          { label: item.label, value: item.value, total: item.total ?? null },
          year,
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
