'use client';

import { PieChart } from 'echarts/charts';

import { echarts } from './echartsSetup';

// The pie is registered where it is used (design-system chart rule 3): this module is
// only reached through `LazyPieEChart`, so pages without a donut never download it.
echarts.use([PieChart]);

export { EChart } from './EChart';
