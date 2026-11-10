'use client';

import { MapChart } from 'echarts/charts';
import { VisualMapPiecewiseComponent } from 'echarts/components';

import { echarts } from './echartsSetup';

// The map and its visual map are registered where they are used (design-system chart rule 3):
// this module is only reached through `LazyMapEChart`, so pages without a map never download them.
echarts.use([MapChart, VisualMapPiecewiseComponent]);

export { EChart } from './EChart';
// `registerMap` only works once the map chart is registered, so the geometry registers through here.
export { echarts };
