'use client';

import { lazyChart } from './lazyChart';

const { Chart, preload } = lazyChart(
  () => import('./EChart').then((module) => module.EChart),
  'series',
);

export const LazyEChart = Chart;
export const preloadEChart = preload;
