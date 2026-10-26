import { DataAttribution } from '@/components/DataAttribution';
import { GlobalTemperatureExplorer } from '@/components/global-temperature/GlobalTemperatureExplorer';
import { GlobalTemperatureKeyFigures } from '@/components/global-temperature/GlobalTemperatureKeyFigures';
import { GlobalTemperatureLongRun } from '@/components/global-temperature/GlobalTemperatureLongRun';
import { JsonLd } from '@/components/JsonLd';
import { OriginCredit } from '@/components/OriginCredit';
import { buildGlobalTemperatureDatasetJsonLd } from '@/lib/globalTemperatureStructuredData';
import { siteUrl } from '@/lib/siteUrl';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { ApiResponseMeta, GlobalTemperatureData } from '@eco-metrics/shared';

interface GlobalTemperatureContentProps {
  data: { data: GlobalTemperatureData; meta: ApiResponseMeta };
}

export function GlobalTemperatureContent({ data: { data, meta } }: GlobalTemperatureContentProps) {
  const { origin, baseline } = data;

  // The upstream licenses ask for these credits wherever the data is shown; every string
  // comes from the origins in the API payload.
  const attribution = (
    <DataAttribution
      testId="global-temperature-attribution"
      meta={meta}
      extra={<OriginCredit origin={origin} testId="global-temperature-origin" />}
    />
  );

  const globalAttribution = (
    <DataAttribution
      testId="global-temperature-global-attribution"
      meta={meta}
      extra={<OriginCredit origin={data.global.origin} testId="global-temperature-global-origin" />}
    />
  );

  const jsonLd = buildGlobalTemperatureDatasetJsonLd({
    data,
    meta,
    pageUrl: `${siteUrl()}/${ECO_CATEGORIES.GLOBAL_TEMPERATURE}/`,
    dataSourcesUrl: `${siteUrl()}/data-sources/`,
  });

  return (
    <div className="w-full max-w-4xl px-4 pb-12">
      <JsonLd data={jsonLd} />
      <p className="mb-6 text-center text-fg-secondary">
        How far is each year&rsquo;s temperature from the recent average? Explore annual surface
        temperature by country since {data.startYear}.
      </p>

      <div className="mb-8 rounded-2xl bg-well px-5 py-5 text-center sm:px-8">
        <GlobalTemperatureKeyFigures data={data} />
      </div>

      <GlobalTemperatureExplorer data={data} attribution={attribution} />

      <p className="mt-6 text-sm text-fg-muted" data-testid="global-temperature-methodology">
        An anomaly is how far a year&rsquo;s average surface (near-ground air) temperature is from
        the average of the {baseline.startYear}–{baseline.endYear} baseline period for the same
        place. The baseline is a recent reference period, so these values are not warming since
        pre-industrial times (the pre-industrial figures are in the section below). Country values
        cover land inside the borders only, while the World value covers land and ocean, so a
        country and the world are not directly comparable. Very small countries are less reliable
        because of the resolution of the data.
      </p>

      <GlobalTemperatureLongRun
        global={data.global}
        unit={data.unit}
        attribution={globalAttribution}
      />
    </div>
  );
}
