'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { CountryExplorer } from '@/components/CountryExplorer';
import { YearDataTable } from '@/components/YearDataTable';
import { formatAnomaly } from '@/lib/formatNumber';
import { buildGlobalTemperatureChartOption } from '@/lib/globalTemperatureChartOption';
import type { GlobalTemperatureData, GlobalTemperatureEntity } from '@eco-metrics/shared';

interface GlobalTemperatureExplorerProps {
  data: GlobalTemperatureData;
  /** Rendered directly under the chart (the "Data:" attribution), from the server. */
  attribution?: ReactNode;
}

interface EntityChartProps {
  entity: GlobalTemperatureEntity;
  data: GlobalTemperatureData;
}

/** The chart of one entity; the option is rebuilt only when the entity or the data change. */
function EntityChart({ entity, data }: EntityChartProps) {
  const { baseline, unit } = data;
  const option = useMemo(() => buildGlobalTemperatureChartOption(entity, data), [entity, data]);

  return (
    <ChartPanel
      title={`${entity.name}: annual temperature anomaly (${unit}, relative to the ${baseline.startYear}–${baseline.endYear} average)`}
      option={option}
      announcement={`Showing temperature anomaly for ${entity.name}`}
    />
  );
}

/**
 * Chart-scoped explorer: one entity at a time. The dataset has a single
 * measure, so there is nothing to toggle. Selection is component state only
 * (no URL, history or storage), and nothing is fetched on interaction.
 */
export function GlobalTemperatureExplorer({ data, attribution }: GlobalTemperatureExplorerProps) {
  const { baseline, startYear, endYear, unit } = data;
  const period = `${baseline.startYear}–${baseline.endYear}`;

  return (
    <CountryExplorer heading="Explore temperature by country" entities={data.entities}>
      {(entity) => (
        <>
          <EntityChart entity={entity} data={data} />
          {attribution}
          <YearDataTable
            caption={`${entity.name}: annual temperature anomaly relative to ${period}, ${startYear}–${endYear}`}
            entityName={entity.name}
            startYear={startYear}
            endYear={endYear}
            columns={[
              {
                header: `Anomaly (${unit} vs ${period} average)`,
                values: entity.anomaly,
                format: formatAnomaly,
              },
            ]}
          />
        </>
      )}
    </CountryExplorer>
  );
}
