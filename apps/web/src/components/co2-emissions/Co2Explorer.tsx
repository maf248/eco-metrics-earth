'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { Co2DataTable } from '@/components/co2-emissions/Co2DataTable';
import { CountryExplorer } from '@/components/CountryExplorer';
import { MeasureToggle } from '@/components/MeasureToggle';
import { buildCo2ChartOption } from '@/lib/co2ChartOption';
import type { Co2EmissionsData, Co2EmissionsEntity, Co2EmissionsMetric } from '@eco-metrics/shared';

interface Co2ExplorerProps {
  data: Co2EmissionsData;
  /** Rendered directly under the chart (the "Data:" attribution), from the server. */
  attribution?: ReactNode;
}

const METRICS: { value: Co2EmissionsMetric; label: string }[] = [
  { value: 'total', label: 'Total' },
  { value: 'perCapita', label: 'Per capita' },
];

const CHART_TITLES: Record<Co2EmissionsMetric, (name: string) => string> = {
  total: (name) => `${name}: total CO2 emissions (million tonnes per year)`,
  perCapita: (name) => `${name}: CO2 emissions per capita (tonnes per person per year)`,
};

const ANNOUNCEMENTS: Record<Co2EmissionsMetric, (name: string) => string> = {
  total: (name) => `Showing total CO2 emissions for ${name}`,
  perCapita: (name) => `Showing CO2 emissions per capita for ${name}`,
};

interface Co2ChartProps {
  entity: Co2EmissionsEntity;
  metric: Co2EmissionsMetric;
  data: Co2EmissionsData;
}

/** The chart of one entity and metric; the option is rebuilt only when they or the data change. */
function Co2Chart({ entity, metric, data }: Co2ChartProps) {
  const option = useMemo(() => buildCo2ChartOption(entity, metric, data), [entity, metric, data]);

  return (
    <ChartPanel
      title={CHART_TITLES[metric](entity.name)}
      option={option}
      announcement={ANNOUNCEMENTS[metric](entity.name)}
      // The world map above is the page's first chart.
      deferred
    />
  );
}

/**
 * Chart-scoped explorer: one entity and one metric at a time. Selection is
 * component state only (no URL, history or storage), and nothing is fetched on
 * interaction: the whole dataset arrived with the page.
 */
export function Co2Explorer({ data, attribution }: Co2ExplorerProps) {
  const [metric, setMetric] = useState<Co2EmissionsMetric>('total');

  const measureToggle = (
    <MeasureToggle legend="Measure" options={METRICS} value={metric} onChange={setMetric} />
  );

  return (
    <CountryExplorer
      heading="Explore emissions by country"
      entities={data.entities}
      controls={measureToggle}
    >
      {(entity) => (
        <>
          <Co2Chart entity={entity} metric={metric} data={data} />
          {attribution}
          <Co2DataTable entity={entity} data={data} />
        </>
      )}
    </CountryExplorer>
  );
}
