import { Co2Explorer } from '@/components/co2-emissions/Co2Explorer';
import { Co2KeyFigures } from '@/components/co2-emissions/Co2KeyFigures';
import { Co2WorldMap } from '@/components/co2-emissions/Co2WorldMap';
import { DataAttribution } from '@/components/DataAttribution';
import { JsonLd } from '@/components/JsonLd';
import { OriginCredit } from '@/components/OriginCredit';
import { CATEGORY_CONTENT_CLASS_NAME, KEY_FIGURES_CLASS_NAME } from '@/lib/cardClassNames';
import { buildCo2DatasetJsonLd } from '@/lib/co2StructuredData';
import { siteUrl } from '@/lib/siteUrl';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { ApiResponseMeta, Co2EmissionsData } from '@eco-metrics/shared';

interface Co2EmissionsContentProps {
  data: { data: Co2EmissionsData; meta: ApiResponseMeta };
}

export function Co2EmissionsContent({ data: { data, meta } }: Co2EmissionsContentProps) {
  const attribution = (
    <DataAttribution
      testId="co2-attribution"
      meta={meta}
      extra={<OriginCredit origin={data.origin} testId="co2-origin" />}
    />
  );

  const jsonLd = buildCo2DatasetJsonLd({
    data,
    meta,
    pageUrl: `${siteUrl()}/${ECO_CATEGORIES.CO2_EMISSIONS}/`,
    dataSourcesUrl: `${siteUrl()}/data-sources/`,
  });

  return (
    <div className={CATEGORY_CONTENT_CLASS_NAME}>
      <JsonLd data={jsonLd} />
      <p className="mb-6 text-center text-fg-secondary">
        How much CO2 does each country emit? Explore annual emissions since {data.startYear}, in
        total and per person.
      </p>

      <div className={KEY_FIGURES_CLASS_NAME}>
        <Co2KeyFigures data={data} />
      </div>

      <Co2Explorer data={data} attribution={attribution} />

      <Co2WorldMap data={data} />

      <p className="mt-6 text-sm text-fg-muted">
        Figures are annual CO2 emissions from fossil fuels and industry. Land-use change is not
        included. Per-capita values divide each country&rsquo;s emissions by its population.
      </p>
    </div>
  );
}
