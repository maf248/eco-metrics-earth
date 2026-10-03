export interface OwidIndicatorData {
  indicatorId: number;
  years: number[];
  entities: number[];
  values: (number | null)[];
}

export interface OwidIndicatorMetadataEntity {
  id: number;
  name: string;
  code: string;
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
  entities: OwidIndicatorMetadataEntity[];
}

export interface OwidGrapherSeriesOptions {
  country?: string[];
  timeRange?: { from: number; to: number };
  column?: string;
}
