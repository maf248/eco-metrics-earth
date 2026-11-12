'use client';

import { lazyChart } from './lazyChart';

// Same lazy loading as `LazyEChart`, through the entry that registers the bar chart.
const { Chart } = lazyChart(() => import('./EBarChart').then((module) => module.EChart), 'bars');

export const LazyBarEChart = Chart;
