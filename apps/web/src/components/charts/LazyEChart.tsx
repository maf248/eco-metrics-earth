'use client';

import type { EChartsCoreOption } from 'echarts/core';
import dynamic from 'next/dynamic';

import { ChartSkeleton, CHART_HEIGHT_CLASS_NAME } from './ChartSkeleton';
import type { ChartPalette } from './chartTokens';

// ECharts renders in the browser only: the chunk is fetched on demand so routes
// without a chart never ship it. `ssr: false` is only allowed in a Client Component.
const EChart = dynamic(() => import('./EChart').then((module) => module.EChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface LazyEChartProps {
  option: EChartsCoreOption;
  /** Series colours; the categorical palette when omitted. */
  palette?: ChartPalette;
}

export function LazyEChart({ option, palette }: LazyEChartProps) {
  return (
    <EChart option={option} palette={palette} className={`${CHART_HEIGHT_CLASS_NAME} w-full`} />
  );
}
