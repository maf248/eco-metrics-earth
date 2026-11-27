'use client';

import { lazyChart } from './lazyChart';

// The bar chart entry (registered where it is used) with the box of a series chart, for vertical
// bars over a year axis; `LazyBarEChart` is the horizontal bars' entry with its own box.
const { Chart } = lazyChart(() => import('./EBarChart').then((module) => module.EChart), 'series');

export const LazyColumnEChart = Chart;
