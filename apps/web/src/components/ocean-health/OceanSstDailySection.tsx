import { DataAttribution } from '@/components/DataAttribution';
import { OceanSstDailyChart } from '@/components/ocean-health/OceanSstDailyChart';
import { OriginCredit } from '@/components/OriginCredit';
import { RowDataTable } from '@/components/RowDataTable';
import { CARD_CLASS_NAME } from '@/lib/cardClassNames';
import { formatAnomaly } from '@/lib/formatNumber';
import { formatTemperature } from '@/lib/oceanHealthKeyFigures';
import { climatologyLabel, highlightedYears } from '@/lib/oceanSstDailyChartOption';
import type { ApiResponseMeta, OceanSstDailyData } from '@eco-metrics/shared';

interface OceanSstDailySectionProps {
  data: { data: OceanSstDailyData; meta: ApiResponseMeta };
}

const HEADING_ID = 'ocean-sst-daily-heading';

/** One sentence that says what the grey, highlighted and dashed lines are. */
function lineKey(data: OceanSstDailyData): string {
  const { current, record } = highlightedYears(data);
  const average = climatologyLabel(data);
  if (!record) {
    return (
      `Each grey line is one earlier year since ${data.startYear}. The highlighted line is ` +
      `${current.year}, the latest year and also the year of the highest daily value, and the ` +
      `dashed line is the ${average}.`
    );
  }
  return (
    `Each grey line is one earlier year since ${data.startYear}. The highlighted lines are ` +
    `${current.year}, the latest year, and ${record.year}, the year of the highest daily value, ` +
    `and the dashed line is the ${average}.`
  );
}

/**
 * The daily overlay chart of the Copernicus payload, under its own provider state: a stale notice
 * shows above it and an outage replaces it. The chart is the first of the page (not deferred) and
 * its text equivalent is the table of the most recent days.
 */
export function OceanSstDailySection({ data: { data, meta } }: OceanSstDailySectionProps) {
  const { unit, recent, origin, startYear } = data;
  const average = climatologyLabel(data);
  const rows = [...recent].reverse();

  return (
    <section aria-labelledby={HEADING_ID} className={CARD_CLASS_NAME}>
      <h2 id={HEADING_ID} className="mb-4 text-xl font-semibold text-fg">
        Daily sea surface temperature since {startYear}
      </h2>
      <p className="text-sm text-fg-secondary">
        Every line is one year of the daily average sea surface temperature, laid over the same
        calendar days, so the current year can be read against all the earlier ones.
      </p>

      <OceanSstDailyChart data={data} />

      <p className="mt-3 text-sm text-fg-muted" data-testid="ocean-sst-daily-key">
        {lineKey(data)}
      </p>

      <DataAttribution
        testId="ocean-sst-daily-attribution"
        meta={meta}
        extra={<OriginCredit origin={origin} testId="ocean-sst-daily-origin" />}
      />

      <RowDataTable
        caption={`Daily sea surface temperature (${unit}), ${data.coverage}, most recent days first`}
        entityName="daily sea surface temperature"
        rowHeaderLabel="Date"
        rowHeader={(row) => row.date}
        rowKey={(row) => row.date}
        rows={rows}
        note={`Showing the most recent ${recent.length} days`}
        columns={[
          { header: `SST (${unit})`, format: (row) => formatTemperature(row.sst) },
          { header: `Anomaly (${unit})`, format: (row) => formatAnomaly(row.anomaly) },
          { header: `${average} (${unit})`, format: (row) => formatTemperature(row.climatology) },
          {
            header: 'Status',
            format: (row) => (row.status === 'preliminary' ? 'Preliminary' : 'Final'),
          },
        ]}
      />
    </section>
  );
}
