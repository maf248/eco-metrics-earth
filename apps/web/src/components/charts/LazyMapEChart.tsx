'use client';

import { lazyChart } from './lazyChart';

// Same lazy loading as `LazyEChart`, through the entry that registers the map and visual map.
const { Chart, preload } = lazyChart(
  () => import('./EMapChart').then((module) => module.EChart),
  'map',
);

export const LazyMapEChart = Chart;
export const preloadMapEChart = preload;
