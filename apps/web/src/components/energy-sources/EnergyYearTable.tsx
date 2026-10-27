import { YearDataTable } from '@/components/YearDataTable';
import { ENERGY_SOURCE_LABELS, shareSeries, type EnergyMetric } from '@/lib/energyMix';
import { formatShare, formatTwh } from '@/lib/formatNumber';
import { ENERGY_SOURCE_IDS } from '@eco-metrics/shared';
import type { EnergySourcesData, EnergySourcesEntity } from '@eco-metrics/shared';

interface EnergyYearTableProps {
  entity: EnergySourcesEntity;
  data: Pick<EnergySourcesData, 'startYear' | 'endYear'>;
  /** The measure the chart currently shows: the table is its text equivalent. */
  metric: EnergyMetric;
}

/** The text equivalent of the stacked chart: every year, one column per source. */
export function EnergyYearTable({
  entity,
  data: { startYear, endYear },
  metric,
}: EnergyYearTableProps) {
  const isShare = metric === 'share';
  const values = isShare ? shareSeries(entity) : entity.generation;

  return (
    <YearDataTable
      wide
      caption={`${entity.name}: electricity ${isShare ? 'share' : 'generation'} by source, ${startYear}–${endYear}`}
      entityName={entity.name}
      startYear={startYear}
      endYear={endYear}
      columns={ENERGY_SOURCE_IDS.map((id) => ({
        header: `${ENERGY_SOURCE_LABELS[id]} (${isShare ? '%' : 'TWh'})`,
        values: values[id],
        format: isShare ? formatShare : formatTwh,
      }))}
    />
  );
}
