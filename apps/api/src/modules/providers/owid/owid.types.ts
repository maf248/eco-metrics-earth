export interface OwidIndicatorData {
  indicatorId: number;
  years: number[];
  entities: number[];
  values: (number | null)[];
}

export interface OwidIndicatorMetadataEntity {
  id: number;
  name: string;
  /** `null` for entities without a code, such as regional aggregates. */
  code: string | null;
}

export interface OwidIndicatorMetadata {
  id: number;
  name: string;
  unit: string;
  shortUnit: string;
  datasetName: string;
  datasetVersion: string;
  timespan: string;
  updatedAt: string;
  /** Short description of the indicator, or `null` when the provider has none. */
  descriptionShort: string | null;
  entities: OwidIndicatorMetadataEntity[];
}

/** Tabs of a grapher chart: the one that opens by default decides how `country` is applied. */
export type OwidGrapherTab = 'chart' | 'map' | 'table';

export interface OwidGrapherSeriesOptions {
  /**
   * Which tab of the chart to request. Needed for charts that open on their map tab,
   * where OWID ignores `country` and answers with the map's years only.
   */
  tab?: OwidGrapherTab;
  country?: string[];
  timeRange?: { from: number; to: number };
  column?: string;
}
