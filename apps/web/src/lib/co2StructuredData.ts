import { buildDatasetJsonLd } from '@/lib/datasetJsonLd';
import type { ApiResponseMeta, Co2EmissionsData } from '@eco-metrics/shared';

interface StructuredDataInput {
  data: Co2EmissionsData;
  meta: ApiResponseMeta;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
}

/**
 * schema.org `Dataset` describing the data behind the CO2 page (map, ranking and explorer): one
 * block for the page, never one per chart or table. Built from the
 * same payload as the page, so names, years, units and attribution never drift
 * from what is displayed.
 */
export function buildCo2DatasetJsonLd({
  data,
  meta,
  pageUrl,
  dataSourcesUrl,
}: StructuredDataInput): Record<string, unknown> {
  const { startYear, endYear, units, dataset } = data;
  const { provider, sourceUrl } = meta.source;

  return buildDatasetJsonLd({
    meta,
    pageUrl,
    dataSourcesUrl,
    fields: {
      name: `CO2 emissions by country, ${startYear}–${endYear}`,
      description:
        `Annual CO2 emissions from fossil fuels and industry for every country and the world, ` +
        `${startYear}–${endYear}, in total (million tonnes) and per person (tonnes). ` +
        `Land-use change is not included. Shown as a world map and a ranking of countries by ` +
        `emissions per person or in total for any year, and as a yearly series per country. ` +
        `Republished from ${provider} ` +
        `(${dataset.name}, version ${dataset.version}).`,
      keywords: [
        'CO2 emissions',
        'carbon dioxide',
        'emissions per capita',
        'world map',
        'country ranking',
        'greenhouse gases',
        'climate change',
        'countries',
      ],
      temporalCoverage: `${startYear}/${endYear}`,
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'Annual CO2 emissions', unitText: units.total },
        {
          '@type': 'PropertyValue',
          name: 'Annual CO2 emissions per capita',
          unitText: units.perCapita,
        },
      ],
      isBasedOn: {
        '@type': 'Dataset',
        name: dataset.name,
        version: dataset.version,
        publisher: { '@type': 'Organization', name: provider, url: sourceUrl },
        url: sourceUrl,
      },
    },
  });
}
