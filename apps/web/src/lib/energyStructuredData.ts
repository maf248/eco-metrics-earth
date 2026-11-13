import { buildDatasetJsonLd, buildSourceWork } from '@/lib/datasetJsonLd';
import type { ApiResponseMeta, EnergySourcesData } from '@eco-metrics/shared';

interface StructuredDataInput {
  data: EnergySourcesData;
  meta: ApiResponseMeta;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
}

/**
 * schema.org `Dataset` describing the data behind the electricity mix charts.
 * Built from the same payload as the page, so years, unit and credits never
 * drift from what is displayed. Both the republisher (OWID) and the producer of
 * the measurements (Ember) are named in `isBasedOn`.
 */
export function buildEnergyDatasetJsonLd({
  data,
  meta,
  pageUrl,
  dataSourcesUrl,
}: StructuredDataInput): Record<string, unknown> {
  const { startYear, endYear, unit, dataset, origin } = data;
  const { provider, sourceUrl } = meta.source;

  return buildDatasetJsonLd({
    meta,
    pageUrl,
    dataSourcesUrl,
    fields: {
      name: `Electricity generation mix by country, ${startYear}–${endYear}`,
      description:
        `Electricity generation by source for every country and the world, ${startYear}–${endYear}, ` +
        `in terawatt-hours and as a share. Electricity only, not total energy; bioenergy and ` +
        `other renewables are summed. Republished from ${provider} (${dataset.name}, version ${dataset.version}), ` +
        `based on ${origin.title} by ${origin.producer}.`,
      keywords: [
        'electricity mix',
        'electricity generation',
        'renewable energy',
        'coal',
        'nuclear',
        'wind and solar',
        'countries',
      ],
      temporalCoverage: `${startYear}/${endYear}`,
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'Electricity generation by source', unitText: unit },
        {
          '@type': 'PropertyValue',
          name: 'Share of electricity generation by source',
          unitText: '%',
        },
      ],
      isBasedOn: [
        buildSourceWork({
          name: dataset.name,
          version: dataset.version,
          publisher: { name: provider, url: sourceUrl },
          url: sourceUrl,
        }),
        buildSourceWork({
          name: origin.title,
          publisher: { name: origin.producer },
          url: origin.url,
        }),
      ],
    },
  });
}
