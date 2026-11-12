import { buildDatasetJsonLd } from '@/lib/datasetJsonLd';
import type { ApiResponseMeta, WasteRecyclingData } from '@eco-metrics/shared';

interface StructuredDataInput {
  data: WasteRecyclingData;
  meta: ApiResponseMeta;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
}

/**
 * schema.org `Dataset` of the data behind the waste page, built from the same payload as the page.
 */
export function buildWasteDatasetJsonLd({
  data,
  meta,
  pageUrl,
  dataSourcesUrl,
}: StructuredDataInput): Record<string, unknown> {
  const { provider, sourceUrl } = meta.source;
  const { title, citation } = data.dataset;

  return buildDatasetJsonLd({
    meta,
    pageUrl,
    dataSourcesUrl,
    fields: {
      name: 'Municipal waste generation, treatment and composition by country',
      description:
        `Municipal solid waste generated per person and in total by ${data.countries.length} ` +
        `countries and territories in 2022, projected to 2050, with what happens to it ` +
        `(recycled, composted, incinerated, landfilled, dumped or uncollected) and what it is ` +
        `made of. Each country's treatment and composition carry their own data year. ` +
        `Published by the ${provider}: ${title}.`,
      keywords: [
        'municipal solid waste',
        'recycling rate',
        'waste per capita',
        'landfill',
        'composting',
        'waste composition',
        'waste projections',
        'countries',
      ],
      temporalCoverage: '2022/2050',
      variableMeasured: [
        {
          '@type': 'PropertyValue',
          name: 'Municipal waste generated per person',
          unitText: 'kilograms per person per day',
        },
        {
          '@type': 'PropertyValue',
          name: 'Municipal waste generated',
          unitText: 'tonnes per year',
        },
        {
          '@type': 'PropertyValue',
          name: 'Share of municipal waste by treatment',
          unitText: 'percent',
        },
        {
          '@type': 'PropertyValue',
          name: 'Share of municipal waste by material',
          unitText: 'percent',
        },
      ],
      isBasedOn: {
        '@type': 'Dataset',
        name: title,
        citation,
        publisher: { '@type': 'Organization', name: provider, url: sourceUrl },
        url: sourceUrl,
      },
    },
  });
}
