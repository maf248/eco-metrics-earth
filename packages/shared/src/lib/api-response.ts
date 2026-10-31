import type { DataSourceAttribution } from './data-source-attribution';

export interface ApiResponseMeta {
  source: DataSourceAttribution;
  /**
   * ISO 8601 time of the last successful provider fetch of this payload: the
   * assembly time of a fresh response, the stored time of a stale one.
   */
  fetchedAt: string;
  /**
   * `true` when the payload is a stored last-known-good snapshot served because the
   * provider failed. Absent means fresh.
   */
  stale?: boolean;
}

export type ApiResponse<T> =
  | { success: true; data: T; status: number; meta?: ApiResponseMeta }
  | { success: false; error: string; status: number; meta?: ApiResponseMeta };
