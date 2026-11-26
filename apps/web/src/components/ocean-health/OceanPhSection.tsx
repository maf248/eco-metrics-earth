import { DataAttribution } from '@/components/DataAttribution';
import { OceanPhChart } from '@/components/ocean-health/OceanPhChart';
import { OriginCredit } from '@/components/OriginCredit';
import { RowDataTable } from '@/components/RowDataTable';
import { formatMonthYear } from '@/lib/oceanHealthKeyFigures';
import { formatPh } from '@/lib/oceanPhChartOption';
import type { ApiResponseMeta, OceanPhData } from '@eco-metrics/shared';

interface OceanPhSectionProps {
  data: { data: OceanPhData; meta: ApiResponseMeta };
}

interface PhRow {
  date: string;
  monthly: number | null;
  yearlyAverage: number | null;
}

/** Every month of the series, newest first, for the table. */
function phRows({ dates, monthly, yearlyAverage }: OceanPhData): PhRow[] {
  return dates
    .map((date, index) => ({ date, monthly: monthly[index], yearlyAverage: yearlyAverage[index] }))
    .reverse();
}

const formatOrNull = (value: number | null): string | null =>
  value === null ? null : formatPh(value);

/**
 * Ocean pH at Station ALOHA, Hawaii: the chart, a note on why this one site is the reference
 * record for open-ocean acidification, and a table of every month. The note is static copy
 * reviewed against the Hawaii Ocean Time-series and Station ALOHA pages (an open-ocean research
 * site north of Hawaii, established in 1988, sampled on cruises almost every month); the start
 * month comes from the data.
 */
export function OceanPhSection({ data: { data, meta } }: OceanPhSectionProps) {
  const { dates, origin, station, unit } = data;
  const first = dates[0];
  const last = dates[dates.length - 1];

  return (
    <>
      <p className="text-sm text-fg-secondary">
        The acidity of the surface ocean, as {unit}: the lower the number, the more acidic the
        water. Dots are monthly measurements and the line is their rolling yearly average.
      </p>
      <p className="mt-2 text-sm text-fg-secondary" data-testid="ocean-ph-note">
        Why {station}? These measurements come from an open-ocean research station in the North
        Pacific, far from coasts, sampled on research cruises almost every month since{' '}
        {formatMonthYear(first)}. A falling pH there shows the ocean absorbing carbon dioxide from
        the atmosphere. It is one site, not a global average.
      </p>

      <OceanPhChart data={data} />

      <DataAttribution
        testId="ocean-ph-attribution"
        meta={meta}
        extra={<OriginCredit origin={origin} testId="ocean-ph-origin" />}
      />

      <RowDataTable
        caption={`Ocean ${unit} at ${station}, ${formatMonthYear(first)} to ${formatMonthYear(last)}, newest first`}
        entityName={`ocean ${unit} at ${station}`}
        rowHeaderLabel="Date"
        rowHeader={(row) => row.date}
        rowKey={(row) => row.date}
        rows={phRows(data)}
        columns={[
          { header: 'Monthly', format: (row) => formatOrNull(row.monthly) },
          { header: 'Yearly average', format: (row) => formatOrNull(row.yearlyAverage) },
        ]}
      />
    </>
  );
}
