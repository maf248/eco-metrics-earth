'use client';

import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { Co2DataTable } from '@/components/co2-emissions/Co2DataTable';
import { CountryExplorer } from '@/components/CountryExplorer';
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
    />
  );
}

/**
 * Chart-scoped explorer: one entity and one metric at a time. Selection is
 * component state only (no URL, history or storage), and nothing is fetched on
 * interaction: the whole dataset arrived with the page.
 */
export function Co2Explorer({ data, attribution }: Co2ExplorerProps) {
  const toggleName = useId();
  const [metric, setMetric] = useState<Co2EmissionsMetric>('total');

  const measureToggle = (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm font-medium text-fg">Measure</legend>
      <div className="inline-flex rounded-lg border border-line-strong bg-well p-1">
        {METRICS.map(({ value, label }) => {
          const inputId = `${toggleName}-${value}`;
          return (
            <div key={value} className="relative">
              <input
                id={inputId}
                type="radio"
                name={toggleName}
                value={value}
                checked={metric === value}
                onChange={() => setMetric(value)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className="flex min-h-11 min-w-24 cursor-pointer items-center justify-center rounded-md px-4 text-base font-medium text-fg-body transition-colors hover:text-fg peer-checked:bg-accent-solid-strong peer-checked:text-on-accent peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring peer-focus-visible:ring-offset-2 ring-offset-focus-offset motion-reduce:transition-none"
              >
                {label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
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
