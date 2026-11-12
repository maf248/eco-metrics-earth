import type { DataSourceAttribution } from './data-source-attribution';
import type { EcoCategory } from './eco-category';

/**
 * What the `lastUpdated` timestamp of a live source means.
 *
 * - `provider` — the provider's own last-update timestamp.
 * - `retrieval` — when we last fetched the data (the provider gives none).
 */
export type DataSourceTimestampBasis = 'provider' | 'retrieval';

/**
 * Who publishes and licenses a piece of data. Shares its field names with
 * `DataSourceAttribution`, so a full attribution is accepted as is.
 */
export type DataSourcePublisher = Pick<DataSourceAttribution, 'provider' | 'license' | 'sourceUrl'>;

/** An open license: its name and the page with its text. */
export interface DataSourceLicense {
  name: string;
  url: string;
}

/**
 * The organization that produced data a live provider republishes (for example
 * the Global Carbon Project behind an OWID chart), with the license and the
 * credit texts that license asks for.
 */
export interface DataSourceOrigin {
  producer: string;
  /** Title of the upstream dataset. */
  title: string;
  /** Page of the upstream dataset. */
  url: string;
  license: DataSourceLicense;
  /** Credit line the license asks to show with the data. */
  notice?: string;
  /** How to cite the upstream work. */
  citation?: string;
  /** No-liability statement the license asks to show. */
  disclaimer?: string;
}

/** An origin as listed in the catalog: with the categories it serves. */
export interface LiveDataSourceOrigin extends DataSourceOrigin {
  categories: EcoCategory[];
}

/**
 * Live provider: data consumed through an external API at runtime.
 */
export interface LiveDataSource extends DataSourceAttribution {
  /** Stable identifier, unique across the catalog. */
  id: string;

  description: string;

  /** Categories whose pages show this provider's data. */
  categories: EcoCategory[];

  lastUpdatedBasis: DataSourceTimestampBasis;

  /** Who produced the data this provider republishes; empty when not declared. */
  origins: LiveDataSourceOrigin[];
}

/**
 * One distinct cited publication inside a static dataset.
 */
export interface DataSourcePublication {
  /** Citation as written in the dataset's `source` field. */
  citation: string;

  /** URL as written in the dataset's `sourceUrl` field. */
  url: string;

  /** Publication year parsed from the citation, e.g. 2018. */
  publishedYear: number;

  /** Number of dataset rows that cite this publication. */
  entryCount: number;

  /** Present when the data is republished by a licensor (e.g. Our World in Data). */
  publisher?: DataSourcePublisher;

  /**
   * License of a publication that has no `publisher` but is published under an
   * open license. Never set together with `publisher`: that license is the publisher's.
   */
  license?: DataSourceLicense;
}

/**
 * Static dataset compiled from publications and bundled with the API.
 * It has no dataset-level timestamp: the date of each publication is its `publishedYear`.
 */
export interface StaticDataSource {
  /** Stable identifier, unique across the catalog. */
  id: string;

  name: string;

  description: string;

  categories: EcoCategory[];

  /** Sorted by `citation`. */
  publications: DataSourcePublication[];
}

/**
 * Every data source in use, as served by `GET /api/v1/data-sources`.
 */
export interface DataSourcesCatalog {
  /** Live providers, sorted by `id`. */
  providers: LiveDataSource[];

  /** Static datasets, sorted by `id`. */
  datasets: StaticDataSource[];
}
