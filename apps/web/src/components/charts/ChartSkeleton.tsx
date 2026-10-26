/** Height of every chart container; the skeleton uses the same classes so nothing shifts. */
export const CHART_HEIGHT_CLASS_NAME = 'h-72 sm:h-96';

/** Placeholder shown while the ECharts chunk loads. */
export function ChartSkeleton() {
  return (
    <div
      data-testid="chart-skeleton"
      aria-hidden="true"
      className={`${CHART_HEIGHT_CLASS_NAME} w-full animate-pulse rounded-lg bg-skeleton-subtle`}
    />
  );
}
