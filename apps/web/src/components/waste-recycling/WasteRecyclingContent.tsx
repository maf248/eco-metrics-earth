import { DataAttribution } from '@/components/DataAttribution';
import { JsonLd } from '@/components/JsonLd';
import { CATEGORY_CONTENT_CLASS_NAME, KEY_FIGURES_CLASS_NAME } from '@/lib/cardClassNames';
import { siteUrl } from '@/lib/siteUrl';
import { WASTE_INTRO } from '@/lib/wasteCopy';
import { buildWasteDatasetJsonLd } from '@/lib/wasteStructuredData';
import { ECO_CATEGORIES } from '@eco-metrics/shared';
import type { ApiResponseMeta, WasteRecyclingData } from '@eco-metrics/shared';

import { WasteComparison } from './WasteComparison';
import { WasteKeyFigures } from './WasteKeyFigures';
import { WasteProjectionChart } from './WasteProjectionChart';
import { WasteWorldMap } from './WasteWorldMap';

interface WasteRecyclingContentProps {
  data: { data: WasteRecyclingData; meta: ApiResponseMeta };
}

export function WasteRecyclingContent({
  data: { data, meta },
}: Readonly<WasteRecyclingContentProps>) {
  const jsonLd = buildWasteDatasetJsonLd({
    data,
    meta,
    pageUrl: `${siteUrl()}/${ECO_CATEGORIES.WASTE_RECYCLING}/`,
    dataSourcesUrl: `${siteUrl()}/data-sources/`,
  });

  return (
    <div className={CATEGORY_CONTENT_CLASS_NAME}>
      <JsonLd data={jsonLd} />
      <p className="mb-6 text-center text-fg-secondary">{WASTE_INTRO}</p>

      <div className={KEY_FIGURES_CLASS_NAME}>
        <WasteKeyFigures data={data} />
      </div>

      <WasteWorldMap countries={data.countries} />

      <WasteComparison countries={data.countries} />

      <WasteProjectionChart world={data.world.generation} countries={data.countries} />

      <p className="mt-6 text-sm text-fg-muted" data-testid="waste-methodology">
        One snapshot per country, each with its own data year. Waste per person is the 2022
        estimate. A share the source does not report is shown as &ldquo;not reported&rdquo;, never
        as 0. Only municipal waste (from households, shops and institutions) is counted.
      </p>

      <DataAttribution testId="waste-attribution" meta={meta} />
    </div>
  );
}
