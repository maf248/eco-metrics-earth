/**
 * Attribution metadata for a data source consumed by the BFF.
 * `lastUpdated` is an ISO 8601 timestamp of the upstream data's last update.
 */
export interface DataSourceAttribution {
  provider: string;
  license: string;
  sourceUrl: string;
  lastUpdated: string;
}
