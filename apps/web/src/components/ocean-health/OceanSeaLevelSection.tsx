import { DataAttribution } from '@/components/DataAttribution';
import { OceanSeaLevelChart } from '@/components/ocean-health/OceanSeaLevelChart';
import { OriginCredit } from '@/components/OriginCredit';
import { YearDataTable } from '@/components/YearDataTable';
import { deriveSeaLevelRise } from '@/lib/oceanHealthKeyFigures';
import { formatSeaLevel, seaLevelEndNote } from '@/lib/oceanSeaLevelChartOption';
import type { ApiResponseMeta, OceanSeaLevelData } from '@eco-metrics/shared';

interface OceanSeaLevelSectionProps {
  data: { data: OceanSeaLevelData; meta: ApiResponseMeta };
}

/**
 * Global mean sea level per satellite mission: the trend and the end of the data as text, the
 * chart and a table of every mission's yearly average. The end date comes from the data, not from copy, so the
 * note stays true if NOAA starts updating the file again.
 */
export function OceanSeaLevelSection({ data: { data, meta } }: OceanSeaLevelSectionProps) {
  const { unit, trend, origin, annual } = data;
  const end = seaLevelEndNote(data, meta.fetchedAt);
  const rise = deriveSeaLevelRise(data);

  return (
    <>
      <p className="text-sm text-fg-secondary">
        How far the average height of the world&rsquo;s oceans is from the reference of this
        dataset, measured by radar altimeters on a series of satellites. Each line is one mission,
        and missions overlap while one takes over from another.
      </p>
      <p className="mt-2 text-sm text-fg-secondary" data-testid="ocean-sea-level-trend">
        Long-term trend published with the data:{' '}
        <strong className="font-semibold text-fg">
          {trend.value} {trend.unit}
        </strong>{' '}
        ({trend.note}).
      </p>

      <p className="mt-2 text-sm text-fg-secondary" data-testid="ocean-sea-level-rise">
        From the first measurement (<time dateTime={rise.first.date}>{rise.first.dateText}</time>)
        to the latest (<time dateTime={rise.latest.date}>{rise.latest.dateText}</time>), the global
        mean sea level {rise.changeMm < 0 ? 'fell' : 'rose'}{' '}
        <strong className="whitespace-nowrap font-semibold text-fg">
          {Math.abs(rise.changeMm)}&nbsp;mm
        </strong>
        , about {rise.changeCmText.replace(/^[+−]/, '')}&nbsp;cm, in {rise.years} years.
      </p>

      <OceanSeaLevelChart data={data} />

      <p className="mt-3 text-sm text-fg-muted" data-testid="ocean-sea-level-end-note">
        {end.current
          ? `The latest observation in this series is from ${end.month}.`
          : `The data in NOAA’s file end in ${end.month}: this series is not current, and the page shows it as published.`}
      </p>

      <DataAttribution
        testId="ocean-sea-level-attribution"
        meta={meta}
        extra={<OriginCredit origin={origin} testId="ocean-sea-level-origin" />}
      />

      <YearDataTable
        caption={`Global mean sea level anomaly (${unit}), yearly average by satellite mission, ${annual.startYear}–${annual.endYear}; a year a mission only partly covered averages the observations it has`}
        entityName="global mean sea level"
        startYear={annual.startYear}
        endYear={annual.endYear}
        columns={annual.missions.map(({ name, values }) => ({
          header: `${name} (${unit})`,
          values,
          format: formatSeaLevel,
        }))}
        wide={annual.missions.length > 3}
      />
    </>
  );
}
