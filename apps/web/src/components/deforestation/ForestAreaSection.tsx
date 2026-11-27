'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { CountryExplorer } from '@/components/CountryExplorer';
import { MeasureToggle } from '@/components/MeasureToggle';
import { YearDataTable } from '@/components/YearDataTable';
import {
  buildForestAreaChartOption,
  forestAreaUnit,
  FOREST_AREA_UNIT_LABELS,
  FOREST_SHARE_UNIT_LABEL,
  type ForestMeasure,
} from '@/lib/forestAreaChartOption';
import { formatOneDecimal, formatWhole } from '@/lib/formatNumber';
import type { ForestAreaData, ForestAreaEntity } from '@eco-metrics/shared';

interface ForestAreaSectionProps {
  data: ForestAreaData;
  /** Rendered under the chart (the "Data:" attribution with the FAO credit), from the server. */
  attribution?: ReactNode;
}

const MEASURES: { value: ForestMeasure; label: string }[] = [
  { value: 'area', label: 'Hectares' },
  { value: 'share', label: '% of land' },
];

const THOUSAND = 1_000;

/** What the chart shows and how to read it: the source's caveats, said where the line is drawn. */
function subtitle(measure: ForestMeasure): string {
  const what =
    measure === 'area'
      ? 'Forest area, plantations included.'
      : 'Forest area as a share of land area, plantations included.';
  return (
    `${what} FAO reports at intervals of 5 to 10 years; the years in between are interpolated. ` +
    'The vertical axis does not start at zero.'
  );
}

interface ChartProps {
  entity: ForestAreaEntity;
  measure: ForestMeasure;
  data: ForestAreaData;
}

/** The chart of one entity and measure; remounts when the hectares unit changes. */
function ForestAreaChart({ entity, measure, data }: ChartProps) {
  const unit = forestAreaUnit(entity);
  const option = useMemo(
    () => buildForestAreaChartOption(entity, measure, data, unit),
    [entity, measure, data, unit],
  );
  const quantity =
    measure === 'area'
      ? `forest area (${FOREST_AREA_UNIT_LABELS[unit]})`
      : `forest area as a share of land (${FOREST_SHARE_UNIT_LABEL})`;

  return (
    <ChartPanel
      title={`${entity.name}: ${quantity}`}
      description={subtitle(measure)}
      option={option}
      chartKey={`${measure}-${unit}`}
      announcement={`Showing ${quantity} for ${entity.name}`}
    />
  );
}

/** The text equivalent of the chart: it shows the measure the chart shows. */
function ForestAreaTable({ entity, measure, data }: ChartProps) {
  const { startYear, endYear } = data;
  const column =
    measure === 'area'
      ? {
          header: 'Forest area (thousand hectares)',
          values: entity.area,
          format: (value: number): string => formatWhole(value / THOUSAND),
        }
      : {
          header: `Forest area (${FOREST_SHARE_UNIT_LABEL})`,
          values: entity.share,
          format: formatOneDecimal,
        };

  return (
    <YearDataTable
      caption={`${entity.name}: forest area, ${startYear}–${endYear}`}
      entityName={entity.name}
      startYear={startYear}
      endYear={endYear}
      columns={[column]}
    />
  );
}

/**
 * Chart-scoped explorer of forest area: one entity (World by default) and one measure at a
 * time, as component state only (no URL, history or storage); nothing is fetched on interaction.
 */
export function ForestAreaSection({ data, attribution }: ForestAreaSectionProps) {
  const [measure, setMeasure] = useState<ForestMeasure>('area');

  return (
    <CountryExplorer
      heading="Forest area"
      entities={data.entities}
      controls={
        <MeasureToggle legend="Measure" options={MEASURES} value={measure} onChange={setMeasure} />
      }
    >
      {(entity) => (
        <>
          <ForestAreaChart entity={entity} measure={measure} data={data} />
          {attribution}
          <ForestAreaTable entity={entity} measure={measure} data={data} />
        </>
      )}
    </CountryExplorer>
  );
}
