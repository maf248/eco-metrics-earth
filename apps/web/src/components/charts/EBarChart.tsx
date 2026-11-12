'use client';

import { BarChart } from 'echarts/charts';

import { echarts } from './echartsSetup';

// The bar chart is registered where it is used (design-system chart rule 3): this module is
// only reached through `LazyBarEChart`, so pages without bars never download it.
echarts.use([BarChart]);

export { EChart } from './EChart';
