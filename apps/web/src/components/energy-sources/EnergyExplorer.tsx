'use client';

import { useMemo, useState } from 'react';

import { ChartPanel } from '@/components/charts/ChartPanel';
import { CountryExplorer } from '@/components/CountryExplorer';
import { EnergyDonut } from '@/components/energy-sources/EnergyDonut';
import { EnergyLatestTable } from '@/components/energy-sources/EnergyLatestTable';
import { EnergyYearTable } from '@/components/energy-sources/EnergyYearTable';
import { MeasureToggle } from '@/components/MeasureToggle';
import { buildEnergyAreaOption } from '@/lib/energyChartOption';
import type { EnergyMetric } from '@/lib/energyMix';
import type { EnergySourcesData, EnergySourcesEntity } from '@eco-metrics/shared';

interface EnergyExplorerProps {
  data: EnergySourcesData;
}

const METRICS: { value: EnergyMetric; label: string }[] = [
  { value: 'share', label: 'Share (%)' },
  { value: 'generation', label: 'Generation (TWh)' },
];

const CHART_TITLES: Record<EnergyMetric, (name: string) => string> = {
  share: (name) => `${name}: share of electricity by source (%)`,
  generation: (name) => `${name}: electricity generation by source (TWh)`,
};

const ANNOUNCEMENTS: Record<EnergyMetric, (name: string) => string> = {
  share: (name) => `Showing share of electricity by source for ${name}`,
  generation: (name) => `Showing electricity generation by source for ${name}`,
};

interface EnergyAreaProps {
  entity: EnergySourcesEntity;
  metric: EnergyMetric;
  data: EnergySourcesData;
}

/** The stacked chart of one entity and measure; rebuilt only when they or the data change. */
function EnergyArea({ entity, metric, data }: EnergyAreaProps) {
  const option = useMemo(() => buildEnergyAreaOption(entity, metric, data), [entity, metric, data]);

  return (
    <ChartPanel
      title={CHART_TITLES[metric](entity.name)}
      option={option}
      announcement={ANNOUNCEMENTS[metric](entity.name)}
      palette="energyMix"
    />
  );
}

/**
 * Chart-scoped explorer: one entity and one measure at a time. Selection is
 * component state only (no URL, history or storage), and nothing is fetched on
 * interaction: the whole dataset arrived with the page.
 */
export function EnergyExplorer({ data }: EnergyExplorerProps) {
  const [metric, setMetric] = useState<EnergyMetric>('share');

  return (
    <CountryExplorer
      heading="Explore the electricity mix by country"
      entities={data.entities}
      controls={
        <MeasureToggle legend="Measure" options={METRICS} value={metric} onChange={setMetric} />
      }
    >
      {(entity) => (
        <>
          <EnergyArea entity={entity} metric={metric} data={data} />
          <EnergyYearTable entity={entity} data={data} metric={metric} />
          <EnergyDonut entity={entity} data={data} />
          <EnergyLatestTable entity={entity} data={data} />
        </>
      )}
    </CountryExplorer>
  );
}
