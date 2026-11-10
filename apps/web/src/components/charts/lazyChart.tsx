'use client';

import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';

import { ChartSkeleton, chartBoxClassName, type ChartSkeletonVariant } from './ChartSkeleton';
import type { ChartPalette } from './chartTokens';

export interface LazyChartProps {
  option: EChartsCoreOption;
  /** Series colours; the categorical palette when omitted. */
  palette?: ChartPalette;
  /** Called once with the ECharts instance when the loaded chart mounts. */
  onReady?: (chart: EChartsType) => void;
}

interface ChartProps extends LazyChartProps {
  className?: string;
}

interface LazyChart {
  Chart: ComponentType<LazyChartProps>;
  /** Fetches the chunk ahead of the first chart; a failure is retried when a chart mounts. */
  preload: () => void;
}

/**
 * ECharts renders in the browser only: the chunk is fetched on demand so routes without a
 * chart never ship it, and the server sends the skeleton. It is not `next/dynamic` because
 * its Suspense boundary delays the first chart even when the chunk is already loaded, and a
 * loaded chunk must draw at once.
 */
export function lazyChart(
  load: () => Promise<ComponentType<ChartProps>>,
  variant: ChartSkeletonVariant,
): LazyChart {
  let loaded: ComponentType<ChartProps> | undefined;
  let loading: Promise<void> | undefined;

  const ensureLoaded = (): Promise<void> => {
    loading ??= load().then(
      (component) => {
        loaded = component;
      },
      () => {
        loading = undefined;
      },
    );
    return loading;
  };

  const subscribe = (onLoaded: () => void) => {
    let mounted = true;
    void ensureLoaded().then(() => {
      if (mounted) {
        onLoaded();
      }
    });
    return () => {
      mounted = false;
    };
  };

  function Chart({ option, palette, onReady }: LazyChartProps) {
    // The server snapshot keeps hydration on the skeleton the HTML holds, even if the chunk
    // arrived first; a client navigation reads the loaded chart directly and draws at once.
    const Loaded = useSyncExternalStore(
      subscribe,
      () => loaded,
      () => undefined,
    );

    if (!Loaded) {
      return <ChartSkeleton variant={variant} />;
    }
    return (
      <Loaded
        option={option}
        palette={palette}
        onReady={onReady}
        className={chartBoxClassName(variant)}
      />
    );
  }

  return { Chart, preload: () => void ensureLoaded() };
}
