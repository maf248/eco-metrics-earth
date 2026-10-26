'use client';

import type { EChartsCoreOption } from 'echarts/core';
import dynamic from 'next/dynamic';

import { ChartSkeleton, CHART_HEIGHT_CLASS_NAME } from './ChartSkeleton';

// ECharts renders in the browser only: the chunk is fetched on demand so routes
// without a chart never ship it. `ssr: false` is only allowed in a Client Component.
const EChart = dynamic(() => import('./EChart').then((module) => module.EChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface LazyEChartProps {
  option: EChartsCoreOption;
}

export function LazyEChart({ option }: LazyEChartProps) {
  return <EChart option={option} className={`${CHART_HEIGHT_CLASS_NAME} w-full`} />;
}
