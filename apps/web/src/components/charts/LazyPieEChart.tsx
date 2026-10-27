'use client';

import type { EChartsCoreOption } from 'echarts/core';
import dynamic from 'next/dynamic';

import { ChartSkeleton, CHART_HEIGHT_CLASS_NAME } from './ChartSkeleton';
import type { ChartPalette } from './chartTokens';

// Same lazy loading as `LazyEChart`, through the entry that registers the pie chart.
const EChart = dynamic(() => import('./EPieChart').then((module) => module.EChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface LazyPieEChartProps {
  option: EChartsCoreOption;
  /** Series colours; the categorical palette when omitted. */
  palette?: ChartPalette;
}

export function LazyPieEChart({ option, palette }: LazyPieEChartProps) {
  return (
    <EChart option={option} palette={palette} className={`${CHART_HEIGHT_CLASS_NAME} w-full`} />
  );
}
