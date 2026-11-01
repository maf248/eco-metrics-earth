'use client';

import { lazyChart } from './lazyChart';

// Same lazy loading as `LazyEChart`, through the entry that registers the pie chart.
const { Chart, preload } = lazyChart(
  () => import('./EPieChart').then((module) => module.EChart),
  'donut',
);

export const LazyPieEChart = Chart;
export const preloadPieEChart = preload;
