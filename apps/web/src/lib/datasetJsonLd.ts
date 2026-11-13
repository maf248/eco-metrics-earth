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

/** A source the page's data is derived from, published elsewhere. */
export interface SourceWorkInput {
  name: string;
  url: string;
  publisher: { name: string; url?: string };
  version?: string;
  citation?: string;
}

/** A source as `buildSourceWork` returns it, for `isBasedOn`. */
export type SourceWork = Record<string, unknown>;

/**
 * A source of the page's data, for `isBasedOn`. Typed `CreativeWork`, not `Dataset`: a nested
 * `Dataset` is validated by Google as a Dataset item of the page and needs its own description,
 * and the sources are other sites' datasets, which this page does not publish.
 */
export function buildSourceWork({
  name,
  url,
  publisher,
  version,
  citation,
}: SourceWorkInput): SourceWork {
  return {
    '@type': 'CreativeWork',
    name,
    ...(version === undefined ? {} : { version }),
    ...(citation === undefined ? {} : { citation }),
    publisher: { '@type': 'Organization', ...publisher },
    url,
  };
}

/** The parts of a `Dataset` that differ per category; passed through unchanged. */
export interface DatasetJsonLdFields {
  name: string;
  description: string;
  keywords: string[];
  /** `startYear/endYear`. */
  temporalCoverage: string;
  variableMeasured: Record<string, unknown>[];
  /** The source(s) this dataset is derived from, built with `buildSourceWork`. */
  isBasedOn: SourceWork | SourceWork[];
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
