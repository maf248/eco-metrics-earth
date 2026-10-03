/**
 * One observation of a metric for one entity in one year.
 * `value` is `null` when the source reports no data for that year.
 */
export interface MetricPoint {
  year: number;
  value: number | null;
}

/**
 * The year/value points of a single metric for a single entity,
 * identified by a stable entity code (e.g. ISO-3166 alpha-3 country code `ARG`
 * or an OWID region code such as `OWID_WRL`).
 */
export interface MetricSeries {
  entityName: string;
  entityCode: string;
  points: MetricPoint[];
}
