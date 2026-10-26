import { YearDataTable } from '@/components/YearDataTable';
import { formatPerCapita, formatTotal } from '@/lib/formatNumber';
import type { Co2EmissionsData, Co2EmissionsEntity } from '@eco-metrics/shared';

interface Co2DataTableProps {
  entity: Co2EmissionsEntity;
  data: Pick<Co2EmissionsData, 'startYear' | 'endYear'>;
}

/** The text equivalent of the CO2 chart: both measures of the selected entity. */
export function Co2DataTable({ entity, data: { startYear, endYear } }: Co2DataTableProps) {
  return (
    <YearDataTable
      caption={`${entity.name}: annual CO2 emissions, ${startYear}–${endYear}`}
      entityName={entity.name}
      startYear={startYear}
      endYear={endYear}
      columns={[
        { header: 'Total (million tonnes of CO2)', values: entity.total, format: formatTotal },
        {
          header: 'Per capita (tonnes of CO2 per person)',
          values: entity.perCapita,
          format: formatPerCapita,
        },
      ]}
    />
  );
}
