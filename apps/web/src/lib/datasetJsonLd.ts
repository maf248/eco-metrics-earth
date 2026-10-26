import type { ApiResponseMeta } from '@eco-metrics/shared';

/** Creative Commons license names as the API spells them, e.g. "CC BY-SA 4.0". */
const CREATIVE_COMMONS_LICENSE = /^CC (BY(?:-(?:SA|NC|ND))*) (\d\.\d)$/;

/**
 * Versioned license URL for a Creative Commons license name (what Google asks
 * for), or the name itself when it is not one.
 */
export function licenseUrl(license: string): string {
  const match = CREATIVE_COMMONS_LICENSE.exec(license);
  if (!match) {
    return license;
  }
  const [, terms, version] = match;
  return `https://creativecommons.org/licenses/${terms.toLowerCase()}/${version}/`;
}

/** schema.org `GeoShape` box ("south west north east") covering the whole Earth. */
const WHOLE_EARTH_BOX = '-90 -180 90 180';

/** The parts of a `Dataset` that differ per category; passed through unchanged. */
export interface DatasetJsonLdFields {
  name: string;
  description: string;
  keywords: string[];
  /** `startYear/endYear`. */
  temporalCoverage: string;
  variableMeasured: Record<string, unknown>[];
  /** The dataset(s) this one is derived from: one object or a list. */
  isBasedOn: Record<string, unknown> | Record<string, unknown>[];
}

interface DatasetJsonLdInput {
  meta: ApiResponseMeta;
  /** Canonical URL of the page, with trailing slash. */
  pageUrl: string;
  /** Canonical URL of the site's data sources page, with trailing slash. */
  dataSourcesUrl: string;
  fields: DatasetJsonLdFields;
}

/**
 * schema.org `Dataset` for a data page, for search engines (Google Dataset
 * Search). Builds what every dataset page shares from the API's attribution
 * (`meta`) and the canonical URLs, and takes the category-specific parts as
 * input. No `distribution` is declared: the data is not offered as a download.
 */
export function buildDatasetJsonLd({
  meta,
  pageUrl,
  dataSourcesUrl,
  fields,
}: DatasetJsonLdInput): Record<string, unknown> {
  const { provider, license, sourceUrl, lastUpdated } = meta.source;

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: fields.name,
    description: fields.description,
    url: pageUrl,
    keywords: fields.keywords,
    isAccessibleForFree: true,
    license: licenseUrl(license),
    creator: { '@type': 'Organization', name: provider, url: sourceUrl },
    isBasedOn: fields.isBasedOn,
    dateModified: lastUpdated,
    temporalCoverage: fields.temporalCoverage,
    spatialCoverage: {
      '@type': 'Place',
      name: 'World',
      geo: { '@type': 'GeoShape', box: WHOLE_EARTH_BOX },
    },
    variableMeasured: fields.variableMeasured,
    includedInDataCatalog: {
      '@type': 'DataCatalog',
      name: 'eco-metrics earth data sources',
      url: dataSourcesUrl,
    },
  };
}
