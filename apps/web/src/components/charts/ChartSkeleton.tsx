/** Height of every chart container; the skeleton uses the same classes so nothing shifts. */
export const CHART_HEIGHT_CLASS_NAME = 'h-72 sm:h-96';

/** The silhouette of a chart: `series` for lines and stacked areas, `donut` for pies. */
export type ChartSkeletonVariant = 'series' | 'donut';

const GRID_LINES = [40, 90, 140, 190];
const SERIES_LINE = 'M0 165 L60 150 L120 158 L180 118 L240 128 L300 84 L360 92 L420 48';

/** Placeholder shown while a chart loads, shaped like the chart it stands for. */
export function ChartSkeleton({ variant = 'series' }: { variant?: ChartSkeletonVariant }) {
  return (
    <div
      data-testid="chart-skeleton"
      aria-hidden="true"
      className={`${CHART_HEIGHT_CLASS_NAME} w-full overflow-hidden rounded-lg bg-hover motion-safe:animate-pulse`}
    >
      {variant === 'series' ? (
        <svg viewBox="0 0 420 220" preserveAspectRatio="none" className="h-full w-full p-4">
          {GRID_LINES.map((y) => (
            <line key={y} x1="0" x2="420" y1={y} y2={y} className="stroke-well" />
          ))}
          <path d={`${SERIES_LINE} V220 H0 Z`} className="fill-well" />
          <path
            d={SERIES_LINE}
            fill="none"
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-well-active"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 220 220" className="h-full w-full p-6">
          <circle cx="110" cy="110" r="80" fill="none" strokeWidth="34" className="stroke-well" />
        </svg>
      )}
    </div>
  );
}
