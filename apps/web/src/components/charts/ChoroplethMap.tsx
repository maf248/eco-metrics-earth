'use client';

import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { ChartSkeleton } from '@/components/charts/ChartSkeleton';
import { LazyMapEChart, preloadMapEChart } from '@/components/charts/LazyMapEChart';
import { loadWorldGeometry, WORLD_MAP_SCALE_LIMIT, type WorldRegion } from '@/lib/worldGeometry';

interface ChoroplethMapProps {
  /** Builds the map option from the geometry's regions; keep it memoised. */
  buildOption: (regions: readonly WorldRegion[]) => EChartsCoreOption;
  /**
   * Called with the entity code of a clicked region that has a value. Regions without a value
   * are silent, so they never reach it.
   */
  onRegionClick: (code: string) => void;
}

/** Zoom factor of one press of "Zoom in" / "Zoom out". */
const ZOOM_STEP = 1.6;
const { min: MIN_ZOOM, max: MAX_ZOOM } = WORLD_MAP_SCALE_LIMIT;
const NARROW_QUERY = '(max-width: 639px)';

/** Environments without `matchMedia` (jsdom) are treated as wide screens. */
const hasMatchMedia = (): boolean => typeof window.matchMedia === 'function';

function subscribeNarrow(onChange: () => void): () => void {
  if (!hasMatchMedia()) {
    return () => undefined;
  }
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Below `sm` the map is zoomed by pinching, so only "Reset view" is offered, after a move. */
function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => hasMatchMedia() && window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

const ICON_PATHS = {
  zoomIn: 'M8 3v10M3 8h10',
  zoomOut: 'M3 8h10',
  reset: 'M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 2.5v2.6h2.6',
} as const;

function ControlButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: keyof typeof ICON_PATHS;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center text-fg-body hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICON_PATHS[icon]} />
      </svg>
    </button>
  );
}

const CONTROL_GROUP_CLASS_NAME =
  'absolute overflow-hidden rounded-lg border border-line-strong bg-surface-raised/95 shadow-sm';

function readZoom(chart: EChartsType): number {
  const { series } = chart.getOption() as { series?: { zoom?: number }[] };
  return series?.[0]?.zoom ?? MIN_ZOOM;
}

/**
 * A world choropleth: loads the shared geometry, draws the caller's option through the lazy
 * map entry and owns the view controls. Wider screens get a vertical zoom in / zoom out / reset
 * group; narrow screens pinch to zoom and get "Reset view" once the view has moved.
 */
export function ChoroplethMap({ buildOption, onRegionClick }: ChoroplethMapProps) {
  const [regions, setRegions] = useState<readonly WorldRegion[] | null>(null);
  const [chart, setChart] = useState<EChartsType | null>(null);
  const [moved, setMoved] = useState(false);
  const narrow = useIsNarrow();
  const onRegionClickRef = useRef(onRegionClick);

  useEffect(() => {
    onRegionClickRef.current = onRegionClick;
  }, [onRegionClick]);

  useEffect(() => {
    let active = true;
    preloadMapEChart();
    loadWorldGeometry().then(
      (loaded) => {
        if (active) {
          setRegions(loaded);
        }
      },
      // A failed load keeps the skeleton; the next mount retries.
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, []);

  const option = useMemo(() => (regions ? buildOption(regions) : null), [regions, buildOption]);

  const handleReady = useCallback((instance: EChartsType) => {
    instance.on('georoam', () => setMoved(true));
    instance.on('click', (params: { name?: string; data?: unknown }) => {
      if (params.name && params.data) {
        onRegionClickRef.current(params.name);
      }
    });
    setChart(instance);
  }, []);

  const zoomBy = (factor: number): void => {
    if (!chart) {
      return;
    }
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, readZoom(chart) * factor));
    chart.setOption({ series: [{ zoom }] });
    setMoved(true);
  };

  const resetView = (): void => {
    chart?.setOption({ series: [{ zoom: MIN_ZOOM, center: null }] });
    setMoved(false);
  };

  return (
    <div className="relative">
      {option ? (
        <LazyMapEChart option={option} onReady={handleReady} />
      ) : (
        <ChartSkeleton variant="map" />
      )}
      {chart &&
        (narrow ? (
          moved && (
            <div className={`bottom-1 left-1 ${CONTROL_GROUP_CLASS_NAME}`}>
              <ControlButton label="Reset view" icon="reset" onClick={resetView} />
            </div>
          )
        ) : (
          <div
            className={`bottom-2 left-2 flex flex-col divide-y divide-line-strong ${CONTROL_GROUP_CLASS_NAME}`}
          >
            <ControlButton label="Zoom in" icon="zoomIn" onClick={() => zoomBy(ZOOM_STEP)} />
            <ControlButton label="Zoom out" icon="zoomOut" onClick={() => zoomBy(1 / ZOOM_STEP)} />
            <ControlButton label="Reset view" icon="reset" onClick={resetView} />
          </div>
        ))}
    </div>
  );
}
