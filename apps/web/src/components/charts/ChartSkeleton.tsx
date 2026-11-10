import { CARD_BLEED_CLASS_NAME } from '@/lib/cardClassNames';

/**
 * The silhouette of a chart:`series` for lines and stacked areas, `donut` for pies, `map` for
 * the world choropleth.
 */
export type ChartSkeletonVariant = 'series' | 'donut' | 'map';

/** A donut and its wrapped legend need the full height on mobile too. */
const CHART_HEIGHT_CLASS_NAMES: Record<ChartSkeletonVariant, string> = {
  series: 'h-72 sm:h-96',
  donut: 'h-96',
  // The world geometry's own aspect ratio (`aspect` in public/geo/world-countries.json): ECharts
  // stretches a map to its box, so the box must keep the map's proportions.
  map: 'aspect-2238/1000',
};

/**
 * Box of a chart container; the skeleton uses the same classes so nothing shifts. Below `sm`
 * it bleeds through the card's 16 px padding to the card edges, so the plot gets the width.
 * The box is a block with auto width: `w-full` would cancel the bleed.
 */
export function chartBoxClassName(variant: ChartSkeletonVariant): string {
  return `${CHART_HEIGHT_CLASS_NAMES[variant]} ${CARD_BLEED_CLASS_NAME}`;
}

const MAP_SILHOUETTE_CLASS_NAME = '[mask:url(/geo/world-silhouette.svg)_center/contain_no-repeat]';

const GRID_LINES = [40, 90, 140, 190];
const SERIES_LINE = 'M0 165 L60 150 L120 158 L180 118 L240 128 L300 84 L360 92 L420 48';

/** Placeholder shown while a chart loads, shaped like the chart it stands for. */
export function ChartSkeleton({ variant = 'series' }: { variant?: ChartSkeletonVariant }) {
  if (variant === 'map') {
    // The map draws on the card itself (no plot box), so its placeholder is the land outline
    // alone, in the frame of the map that replaces it: a token fill masked by the outline that
    // `npm run geo:world` writes next to the geometry (a static file, so no page ships it as JS).
    return (
      <div
        data-testid="chart-skeleton"
        aria-hidden="true"
        className={`${chartBoxClassName(variant)} ${MAP_SILHOUETTE_CLASS_NAME} bg-well-active motion-safe:animate-pulse`}
      />
    );
  }

  return (
    <div
      data-testid="chart-skeleton"
      aria-hidden="true"
      className={`${chartBoxClassName(variant)} overflow-hidden rounded-lg bg-hover motion-safe:animate-pulse`}
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
