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

export interface OwidGrapherDatedSeriesOptions {
  /** Which tab of the chart to request (see {@link OwidGrapherSeriesOptions.tab}). */
  tab?: OwidGrapherTab;
  country?: string[];
  /** Value columns to return, by short name. At least one. */
  columns: string[];
}

/** One date of a date-indexed chart with one value per requested column. */
export interface OwidDatedRow {
  /** ISO 8601 calendar date (`YYYY-MM-DD`). */
  date: string;
  /** Same order as the requested columns; `null` for a blank cell. */
  values: (number | null)[];
}

/** The rows of a date-indexed chart (`entity,day,<columns...>`) for its single entity. */
export interface OwidDatedSeries {
  entityName: string;
  /** The requested columns, in the requested order. */
  columns: string[];
  /** Ascending by date. */
  rows: OwidDatedRow[];
}
