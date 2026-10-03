import type { DataSourceAttribution } from './data-source-attribution';

export interface ApiResponseMeta {
  source: DataSourceAttribution;
  fetchedAt: string;
}

export type ApiResponse<T> =
  | { success: true; data: T; status: number; meta?: ApiResponseMeta }
  | { success: false; error: string; status: number; meta?: ApiResponseMeta };
