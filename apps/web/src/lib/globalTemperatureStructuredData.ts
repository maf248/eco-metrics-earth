import { buildDatasetJsonLd } from '@/lib/datasetJsonLd';
import type { ApiResponseMeta, GlobalTemperatureData } from '@eco-metrics/shared';

interface StructuredDataInput {
  data: GlobalTemperatureData;
  meta: ApiResponseMeta;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
}

/**
 * schema.org `Dataset` describing the data behind the temperature chart. Built
 * from the same payload as the page, so years, baseline, unit and credits never
 * drift from what is displayed. Both the republisher (OWID) and the upstream
 * producer of the measurements (Copernicus) are named in `isBasedOn`.
 */
export function buildGlobalTemperatureDatasetJsonLd({
  data,
  meta,
  pageUrl,
  dataSourcesUrl,
}: StructuredDataInput): Record<string, unknown> {
  const { unit, baseline, dataset, origin, global } = data;
  // The union of both series: the long-run one starts earlier, the per-country one may end later.
  const startYear = Math.min(data.startYear, global.startYear);
  const endYear = Math.max(data.endYear, global.endYear);
  const { provider, sourceUrl } = meta.source;
  const period = `${baseline.startYear}–${baseline.endYear}`;
  const preIndustrialPeriod = `${global.baseline.startYear}–${global.baseline.endYear}`;
  const upstream = (title: string, url: string, producer: string): Record<string, unknown> => ({
    '@type': 'Dataset',
    name: title,
    publisher: { '@type': 'Organization', name: producer },
    url,
  });

  return buildDatasetJsonLd({
    meta,
    pageUrl,
    dataSourcesUrl,
    fields: {
      name: `Global temperature anomalies by country and since pre-industrial times, ${startYear}–${endYear}`,
      description:
        `Annual average surface temperature for every country and the world since ${data.startYear}, ` +
        `as the difference in degrees Celsius from the ${period} average of the same place, and the ` +
        `world's temperature since ${global.startYear} relative to the ${preIndustrialPeriod} ` +
        `(pre-industrial) average, with 95% confidence bounds. ` +
        `Country values cover land inside the borders only; the World value covers land and ocean. ` +
        `Republished from ${provider} (${dataset.name}, version ${dataset.version}), ` +
        `based on ${origin.title} by the ${origin.producer} and ${global.origin.title} by the ` +
        `${global.origin.producer}.`,
      keywords: [
        'temperature anomaly',
        'global temperature',
        'surface temperature',
        'pre-industrial',
        'climate change',
        'global warming',
        'countries',
      ],
      temporalCoverage: `${startYear}/${endYear}`,
      variableMeasured: [
        {
          '@type': 'PropertyValue',
          name: `Annual temperature anomaly by country relative to the ${period} average`,
          unitText: unit,
        },
        {
          '@type': 'PropertyValue',
          name: `Annual global temperature anomaly relative to the ${preIndustrialPeriod} (pre-industrial) average`,
          unitText: unit,
        },
      ],
      isBasedOn: [
        {
          '@type': 'Dataset',
          name: dataset.name,
          version: dataset.version,
          publisher: { '@type': 'Organization', name: provider, url: sourceUrl },
          url: sourceUrl,
        },
        upstream(origin.title, origin.url, origin.producer),
        upstream(global.origin.title, global.origin.url, global.origin.producer),
      ],
    },
  });
}
